import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { readSessionFromCookies } from '@/lib/session'
import { tournamentSchema, eventSchema, breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { Trophy, Users, Calendar, DollarSign, CheckCircle } from 'lucide-react'

type Props = { params: Promise<{ id: string }> }

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: t } = await supabase.from('tournaments').select('name, game, prize_pool, starts_at').eq('id', id).single()
  if (!t) return { title: 'Tournament Not Found' }

  return {
    title: `${t.name} — RaiseGG.gg Tournament`,
    description: `${GAME_LABELS[t.game] ?? t.game} tournament with $${t.prize_pool} USDC/USDT prize pool. Starting ${new Date(t.starts_at).toLocaleDateString()}.`,
    alternates: { canonical: `https://raisegg.gg/tournaments/${id}` },
    openGraph: {
      title: `${t.name} | RaiseGG.gg`,
      description: `$${t.prize_pool} prize pool · ${GAME_LABELS[t.game] ?? t.game}`,
      url: `https://raisegg.gg/tournaments/${id}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(t.name)}&sub=USDC%2FUSDT+Tournament&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og?title=${encodeURIComponent(t.name)}&sub=USDC%2FUSDT+Tournament&color=7b61ff`],
    },
  }
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: registrations } = await supabase
    .from('tournament_registrations')
    .select('player_id, paid, created_at, player:players(username, avatar_url, cs2_elo, dota2_elo)')
    .eq('tournament_id', id)
    .order('created_at', { ascending: true })

  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)
  const isRegistered = registrations?.some((r) => r.player_id === playerId) ?? false
  const regCount  = registrations?.length ?? 0
  const spotsLeft = tournament.max_players - regCount
  const canRegister = tournament.status === 'upcoming' && !isRegistered && spotsLeft > 0

  const tSchema = tournamentSchema({
    id: tournament.id,
    name: tournament.name,
    game: GAME_LABELS[tournament.game] ?? tournament.game,
    startDate: tournament.starts_at,
    prizePool: tournament.prize_pool,
  })
  const eSchema = eventSchema({
    id: tournament.id,
    name: tournament.name,
    game: tournament.game,
    prizePool: tournament.prize_pool,
    startsAt: tournament.starts_at,
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home',        url: 'https://raisegg.gg' },
    { name: 'Tournaments', url: 'https://raisegg.gg/tournaments' },
    { name: tournament.name, url: `https://raisegg.gg/tournaments/${id}` },
  ])

  const eloKey = `${tournament.game}_elo` as const

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-purple text-xs">{GAME_LABELS[tournament.game] ?? tournament.game}</span>
            <span className="text-xs text-muted">{tournament.format}</span>
            {tournament.status === 'live' && (
              <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                <span className="live-dot" /> LIVE
              </span>
            )}
          </div>
          <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">{tournament.name}</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <DollarSign className="w-6 h-6 text-accent-purple mx-auto mb-2" />
            <div className="font-orbitron text-xl font-black text-white">${tournament.prize_pool}</div>
            <div className="text-xs text-muted">Prize Pool</div>
          </div>
          <div className="card text-center">
            <Users className="w-6 h-6 text-accent-cyan mx-auto mb-2" />
            <div className="font-orbitron text-xl font-black text-white">{regCount}/{tournament.max_players}</div>
            <div className="text-xs text-muted">Registered</div>
          </div>
          <div className="card text-center">
            <Calendar className="w-6 h-6 text-muted mx-auto mb-2" />
            <div className="font-orbitron text-xl font-black text-white">
              {new Date(tournament.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="text-xs text-muted">Start Date</div>
          </div>
          <div className="card text-center">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="font-orbitron text-xl font-black text-white">
              {tournament.entry_fee > 0 ? `$${tournament.entry_fee}` : 'FREE'}
            </div>
            <div className="text-xs text-muted">Entry Fee</div>
          </div>
        </div>

        {/* Registration CTA */}
        {tournament.status === 'upcoming' && (
          <div className="card mb-8">
            {isRegistered ? (
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <div className="font-semibold">You are registered</div>
                  <div className="text-xs text-muted">You will receive a match invite when the tournament starts.</div>
                </div>
              </div>
            ) : spotsLeft <= 0 ? (
              <div className="text-center text-muted py-2">This tournament is full.</div>
            ) : !playerId ? (
              <div className="text-center">
                <p className="text-muted text-sm mb-4">{spotsLeft} spot{spotsLeft === 1 ? '' : 's'} remaining</p>
                <a href="/api/auth/steam" className="btn-primary px-8 py-3 inline-block">Connect Steam to Register</a>
              </div>
            ) : canRegister ? (
              <div className="text-center">
                <p className="text-muted text-sm mb-4">{spotsLeft} spot{spotsLeft === 1 ? '' : 's'} remaining</p>
                <form action={`/api/tournaments/${id}/register`} method="POST">
                  <button type="submit" className="btn-primary px-8 py-3">
                    {tournament.entry_fee > 0 ? `Register — $${tournament.entry_fee} USDC` : 'Register Free'}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        )}

        {/* Registered Players */}
        <h2 className="font-orbitron text-xl font-bold text-white mb-4">
          Registered Players ({regCount})
        </h2>
        {!registrations?.length ? (
          <div className="card text-center py-8 text-muted text-sm">No players registered yet. Be the first!</div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs text-muted uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs text-muted uppercase">Player</th>
                  <th className="text-right px-4 py-3 text-xs text-muted uppercase">ELO</th>
                  <th className="text-right px-4 py-3 text-xs text-muted uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r: any, i: number) => (
                  <tr key={r.player_id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 text-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-white text-sm">{r.player?.username ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-orbitron text-xs text-accent-purple">
                      {r.player?.[eloKey] ?? 1000}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.paid
                        ? <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                        : <span className="text-xs text-yellow-400">pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
