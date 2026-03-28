import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { Trophy, Users, Calendar, DollarSign } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tournaments — Compete for Prize Pools',
  description: 'Browse upcoming CS2, Dota 2 and Deadlock tournaments on RaiseGG.gg. Open registration, USDC/USDT prize pools. Filter by game, date and buy-in.',
  alternates: { canonical: 'https://raisegg.gg/tournaments' },
  openGraph: {
    title: 'RaiseGG.gg – Tournaments',
    description: 'CS2, Dota 2 & Deadlock tournaments. USDC/USDT prize pools.',
    url: 'https://raisegg.gg/tournaments',
    images: [{ url: '/api/og?title=Tournaments&sub=USDC%2FUSDT+Prize+Pools&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG.gg – Tournaments',
    images: ['/api/og?title=Tournaments&sub=USDC%2FUSDT+Prize+Pools&color=7b61ff'],
  },
}

const STATUS_BADGE: Record<string, string> = {
  upcoming:  'badge-purple',
  live:      'bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-xs font-semibold',
  completed: 'bg-space-700 text-muted border border-border px-2 py-0.5 rounded text-xs font-semibold',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs font-semibold',
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

async function getTournaments() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('tournaments')
    .select('*, registrations:tournament_registrations(count)')
    .in('status', ['upcoming', 'live'])
    .order('starts_at', { ascending: true })
  return data ?? []
}

async function getPastTournaments() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('tournaments')
    .select('*, registrations:tournament_registrations(count)')
    .eq('status', 'completed')
    .order('starts_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export default async function TournamentsPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Tournaments', url: 'https://raisegg.gg/tournaments' },
  ])

  const [upcoming, past] = await Promise.all([getTournaments(), getPastTournaments()])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-orbitron text-4xl font-black mb-2">
              <span className="text-gradient">Tournaments</span>
            </h1>
            <p className="text-muted">Compete for USDC/USDT prize pools across CS2, Dota 2 and Deadlock.</p>
          </div>
        </div>

        {/* Upcoming & Live */}
        {upcoming.length === 0 ? (
          <div className="card text-center py-16 mb-12">
            <Trophy className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted text-lg mb-2">No tournaments scheduled yet.</p>
            <p className="text-muted text-sm">Check back soon — we run regular tournaments for all games.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {upcoming.map((t: any) => {
              const regCount = t.registrations?.[0]?.count ?? 0
              const spotsLeft = t.max_players - regCount
              const full = spotsLeft <= 0
              return (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="card-hover group block">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className={STATUS_BADGE[t.status] ?? 'badge-purple'}>{t.status}</span>
                      <div className="text-xs text-muted mt-1 uppercase tracking-wider">{GAME_LABELS[t.game] ?? t.game} · {t.format}</div>
                    </div>
                    {t.entry_fee > 0
                      ? <span className="text-xs font-orbitron text-accent-purple">${t.entry_fee} entry</span>
                      : <span className="text-xs text-green-400 font-semibold">FREE</span>}
                  </div>

                  <h2 className="font-orbitron text-lg font-bold text-white mb-4 group-hover:text-gradient transition-all line-clamp-2">
                    {t.name}
                  </h2>

                  <div className="grid grid-cols-3 gap-3 text-center mb-4">
                    <div>
                      <DollarSign className="w-4 h-4 text-accent-purple mx-auto mb-1" />
                      <div className="font-orbitron text-sm font-bold text-white">${t.prize_pool}</div>
                      <div className="text-xs text-muted">Prize</div>
                    </div>
                    <div>
                      <Users className="w-4 h-4 text-accent-cyan mx-auto mb-1" />
                      <div className="font-orbitron text-sm font-bold text-white">{regCount}/{t.max_players}</div>
                      <div className="text-xs text-muted">Players</div>
                    </div>
                    <div>
                      <Calendar className="w-4 h-4 text-muted mx-auto mb-1" />
                      <div className="font-orbitron text-sm font-bold text-white">
                        {new Date(t.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-muted">Start</div>
                    </div>
                  </div>

                  <div className={`text-xs text-center font-semibold ${full ? 'text-red-400' : 'text-green-400'}`}>
                    {full ? 'FULL' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Past Tournaments */}
        {past.length > 0 && (
          <>
            <h2 className="font-orbitron text-xl font-bold text-white mb-4">Past Tournaments</h2>
            <div className="space-y-2">
              {past.map((t: any) => (
                <Link key={t.id} href={`/tournaments/${t.id}`} className="card-hover flex items-center justify-between gap-4 block">
                  <div>
                    <span className="text-sm font-semibold text-white">{t.name}</span>
                    <span className="text-xs text-muted ml-3">{GAME_LABELS[t.game] ?? t.game} · {t.format}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs flex-shrink-0">
                    <span className="text-accent-purple font-orbitron">${t.prize_pool} prize</span>
                    <span className="text-muted">{new Date(t.starts_at).toLocaleDateString()}</span>
                    <span className={STATUS_BADGE['completed']}>completed</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
