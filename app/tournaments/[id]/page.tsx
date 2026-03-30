import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { readSessionFromCookies } from '@/lib/session'
import { tournamentSchema, eventSchema, breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { Trophy, Users, Calendar, DollarSign, CheckCircle, Swords, Award } from 'lucide-react'
import { GAME_CONFIG, PRIZE_DISTRIBUTION, calculatePrizes, getGameElo, roundCount, type Game } from '@/lib/tournaments'
import { BracketView } from '@/components/tournaments/BracketView'
import { TournamentBracket } from '@/components/tournaments/TournamentBracket'
import { RegisterButton } from '@/components/tournaments/RegisterButton'

type Props = { params: Promise<{ id: string }> }

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: t } = await supabase.from('tournaments').select('name, game, prize_pool, starts_at').eq('id', id).single()
  if (!t) return { title: 'Tournament Not Found' }

  return {
    title: `${t.name} — RaiseGG Tournament`,
    description: `${GAME_LABELS[t.game] ?? t.game} tournament with $${t.prize_pool} USDC prize pool. Starting ${new Date(t.starts_at).toLocaleDateString()}.`,
    alternates: { canonical: `https://raisegg.com/tournaments/${id}` },
    openGraph: {
      title: `${t.name} | RaiseGG`,
      description: `$${t.prize_pool} prize pool · ${GAME_LABELS[t.game] ?? t.game}`,
      url: `https://raisegg.com/tournaments/${id}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(t.name)}&sub=USDC+Tournament&color=7b61ff`, width: 1200, height: 630 }],
    },
  }
}

export const revalidate = 15

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  // Registrations with player info
  const { data: registrations } = await supabase
    .from('tournament_registrations')
    .select('player_id, paid, created_at, player:players(id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo)')
    .eq('tournament_id', id)
    .order('created_at', { ascending: true })

  // Bracket matches (if tournament has started)
  const { data: bracketMatches } = await supabase
    .from('tournament_matches')
    .select('id, round, position, player_a_id, player_b_id, score_a, score_b, winner_id, player_a:players!tournament_matches_player_a_id_fkey(username, avatar_url), player_b:players!tournament_matches_player_b_id_fkey(username, avatar_url)')
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('position', { ascending: true })

  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)
  const isRegistered = registrations?.some((r) => r.player_id === playerId) ?? false
  const regCount = registrations?.length ?? 0

  const game = tournament.game as Game
  const gc = GAME_CONFIG[game]
  const prizePool = Number(tournament.prize_pool)
  const entryFee = Number(tournament.entry_fee)
  const prizes = calculatePrizes(prizePool)
  const eloKey = `${game}_elo` as const
  const bracketSize = tournament.max_players as 8 | 16 | 32
  const totalRounds = roundCount(bracketSize)

  const isLive = tournament.status === 'in_progress' || tournament.status === 'live'
  const isCompleted = tournament.status === 'completed'
  const isRegistrationOpen = tournament.status === 'registration' || tournament.status === 'upcoming'
  const hasBracket = (bracketMatches?.length ?? 0) > 0

  const tSchema = tournamentSchema({
    id: tournament.id, name: tournament.name,
    game: GAME_LABELS[game] ?? game,
    startDate: tournament.starts_at, prizePool,
  })
  const eSchema = eventSchema({
    id: tournament.id, name: tournament.name,
    game, prizePool, startsAt: tournament.starts_at,
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Tournaments', url: 'https://raisegg.com/tournaments' },
    { name: tournament.name, url: `https://raisegg.com/tournaments/${id}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${gc.bgColor} ${gc.textColor} ${gc.borderColor} border`}>
              {gc.label}
            </span>
            <span className="text-xs text-muted">Single Elimination · {bracketSize} Players</span>
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-accent-gold/10 text-accent-gold border border-accent-gold/30">
                <Award className="w-3 h-3" />
                Completed
              </span>
            )}
          </div>
          <h1 className="font-orbitron text-3xl sm:text-4xl font-black mb-2 text-gradient">{tournament.name}</h1>
          <p className="text-muted text-sm">
            {new Date(tournament.starts_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' at '}
            {new Date(tournament.starts_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <DollarSign className="w-5 h-5 text-accent-gold mx-auto mb-1.5" />
            <div className="font-orbitron text-xl font-black text-white">${prizePool.toFixed(0)}</div>
            <div className="text-xs text-muted">Prize Pool</div>
          </div>
          <div className="card text-center">
            <Users className="w-5 h-5 text-accent-cyan mx-auto mb-1.5" />
            <div className="font-orbitron text-xl font-black text-white">{regCount}/{bracketSize}</div>
            <div className="text-xs text-muted">Registered</div>
          </div>
          <div className="card text-center">
            <Swords className="w-5 h-5 text-muted mx-auto mb-1.5" />
            <div className="font-orbitron text-xl font-black text-white">{totalRounds}</div>
            <div className="text-xs text-muted">Rounds</div>
          </div>
          <div className="card text-center">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1.5" />
            <div className="font-orbitron text-xl font-black text-white">
              {entryFee > 0 ? `$${entryFee}` : 'FREE'}
            </div>
            <div className="text-xs text-muted">Entry Fee</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Bracket */}
            {hasBracket && (
              <div>
                <h2 className="font-orbitron text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Swords className="w-5 h-5 text-accent-cyan" />
                  Bracket
                </h2>
                <div className="card">
                  <TournamentBracket
                    tournamentId={id}
                    game={game}
                    totalRounds={totalRounds}
                    bracketSize={bracketSize}
                    initialMatches={bracketMatches?.map(m => ({
                      ...m,
                      player_a: Array.isArray(m.player_a) ? m.player_a[0] ?? null : m.player_a,
                      player_b: Array.isArray(m.player_b) ? m.player_b[0] ?? null : m.player_b,
                    })) ?? []}
                  />
                </div>
              </div>
            )}

            {!hasBracket && isRegistrationOpen && (
              <div className="card text-center py-12 border-dashed">
                <Swords className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                <p className="text-muted text-sm">Bracket will be generated when the tournament starts.</p>
                <p className="text-muted text-xs mt-1">Players are seeded by ELO rating.</p>
              </div>
            )}

            {/* Registered Players */}
            <div>
              <h2 className="font-orbitron text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent-cyan" />
                Registered Players ({regCount})
              </h2>
              {!registrations?.length ? (
                <div className="card text-center py-8 text-muted text-sm">No players registered yet. Be the first!</div>
              ) : (
                <div className="card overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs text-muted uppercase">Seed</th>
                        <th className="text-left px-4 py-3 text-xs text-muted uppercase">Player</th>
                        <th className="text-right px-4 py-3 text-xs text-muted uppercase">{gc.label} ELO</th>
                        <th className="text-right px-4 py-3 text-xs text-muted uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(registrations as any[])
                        .sort((a, b) => {
                          const eloA = a.player?.[eloKey] ?? 1000
                          const eloB = b.player?.[eloKey] ?? 1000
                          return eloB - eloA
                        })
                        .map((r: any, i: number) => (
                          <tr key={r.player_id} className="border-b border-border/50 last:border-0 hover:bg-space-700/30 transition-colors">
                            <td className="px-4 py-3 text-muted text-xs font-orbitron">#{i + 1}</td>
                            <td className="px-4 py-3 font-semibold text-white text-sm">
                              {r.player?.username ?? 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-right font-orbitron text-xs text-accent-cyan">
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
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">

            {/* Register button */}
            {isRegistrationOpen && (
              <div className="card">
                <h3 className="font-orbitron text-sm font-bold text-white mb-3">Register</h3>
                <RegisterButton
                  tournamentId={id}
                  entryFee={entryFee}
                  maxPlayers={bracketSize}
                  registeredCount={regCount}
                  status={tournament.status}
                  startsAt={tournament.starts_at}
                />
              </div>
            )}

            {/* Prize Breakdown */}
            <div className="card">
              <h3 className="font-orbitron text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent-gold" />
                Prize Breakdown
              </h3>
              {prizePool > 0 ? (
                <div className="space-y-2">
                  {prizes.map(p => (
                    <div key={p.place} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-orbitron text-xs font-bold ${
                          p.place === 1 ? 'text-accent-gold' :
                          p.place === 2 ? 'text-gray-300' :
                          p.place === 3 ? 'text-orange-400' :
                          'text-muted'
                        }`}>
                          {p.label}
                        </span>
                        <span className="text-xs text-muted">({(p.pct * 100).toFixed(0)}%)</span>
                      </div>
                      <span className="font-orbitron text-sm font-bold text-white">
                        ${p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Platform fee (10%)</span>
                      <span>${(prizePool / 0.9 * 0.1).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted text-sm">Free tournament — bragging rights and ELO.</p>
              )}
            </div>

            {/* Tournament Rules */}
            <div className="card">
              <h3 className="font-orbitron text-sm font-bold text-white mb-3">Rules</h3>
              <ul className="space-y-2 text-xs text-muted">
                <li>Single elimination — lose and you are out</li>
                <li>Players seeded by {gc.label} ELO rating</li>
                <li>Match results must be reported by both players</li>
                <li>Disputes handled by admin within 24 hours</li>
                <li>Prize pool distributed in USDC after tournament ends</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
