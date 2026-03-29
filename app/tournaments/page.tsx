import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { GAME_CONFIG, WEEKLY_SCHEDULE, getNextOccurrence, calculatePrizePool } from '@/lib/tournaments'
import { Trophy, Clock, Users, Zap, Calendar } from 'lucide-react'
import Link from 'next/link'
import { TournamentTabs } from '@/components/tournaments/TournamentTabs'
import { TournamentCard } from '@/components/tournaments/TournamentCard'

export const metadata: Metadata = {
  title: 'Tournaments — Compete for USDC Prizes',
  description: 'Single elimination tournaments for CS2, Dota 2 and Deadlock. Free and paid entry. Win real USDC prize pools.',
  alternates: { canonical: 'https://raisegg.com/tournaments' },
  openGraph: {
    title: 'RaiseGG Tournaments — USDC Prize Pools',
    description: 'Bracket tournaments with real USDC prizes. CS2, Dota 2 & Deadlock.',
    url: 'https://raisegg.com/tournaments',
    images: [{ url: '/api/og?title=Tournaments&sub=USDC+Prize+Pools&color=7b61ff', width: 1200, height: 630 }],
  },
}

export const revalidate = 30

async function getTournaments() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('tournaments')
    .select('*, registrations:tournament_registrations(count)')
    .order('starts_at', { ascending: true })
    .limit(100)
  return data ?? []
}

export default async function TournamentsPage() {
  const tournaments = await getTournaments()
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Tournaments', url: 'https://raisegg.com/tournaments' },
  ])

  const upcoming = tournaments.filter(t => t.status === 'registration' || t.status === 'upcoming')
  const live = tournaments.filter(t => t.status === 'in_progress' || t.status === 'live')
  const completed = tournaments.filter(t => t.status === 'completed')

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent-purple/10 border border-accent-purple/30 mb-4">
            <Trophy className="w-8 h-8 text-accent-purple" />
          </div>
          <h1 className="font-orbitron text-4xl sm:text-5xl font-black mb-3">
            <span className="text-gradient">Tournaments</span>
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            Single elimination brackets with real USDC prize pools. Register, compete, win.
          </p>
        </div>

        {/* Weekly Schedule Preview */}
        <div className="card mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-accent-cyan" />
            <h2 className="font-orbitron text-sm font-bold text-white">Weekly Schedule</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WEEKLY_SCHEDULE.slice(0, 4).map((s, i) => {
              const gc = GAME_CONFIG[s.game]
              const next = getNextOccurrence(s)
              return (
                <div key={i} className={`rounded-lg border ${gc.borderColor} ${gc.bgColor} p-3`}>
                  <div className={`font-orbitron text-xs font-bold ${gc.textColor} mb-1`}>{gc.label}</div>
                  <div className="text-white text-sm font-semibold">{s.name}</div>
                  <div className="text-muted text-xs mt-1">
                    {s.entryFee === 0 ? 'Free Entry' : `$${s.entryFee} USDC`} · {s.bracketSize} players
                  </div>
                  <div className="text-muted text-xs mt-1">
                    Next: {next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabs + Tournament Lists */}
        <TournamentTabs
          upcoming={upcoming.map(t => ({
            id: t.id,
            name: t.name,
            game: t.game,
            format: t.format,
            entryFee: Number(t.entry_fee),
            prizePool: Number(t.prize_pool),
            maxPlayers: t.max_players,
            registeredCount: t.registrations?.[0]?.count ?? 0,
            startsAt: t.starts_at,
            status: t.status,
          }))}
          live={live.map(t => ({
            id: t.id,
            name: t.name,
            game: t.game,
            format: t.format,
            entryFee: Number(t.entry_fee),
            prizePool: Number(t.prize_pool),
            maxPlayers: t.max_players,
            registeredCount: t.registrations?.[0]?.count ?? 0,
            startsAt: t.starts_at,
            status: t.status,
          }))}
          completed={completed.map(t => ({
            id: t.id,
            name: t.name,
            game: t.game,
            format: t.format,
            entryFee: Number(t.entry_fee),
            prizePool: Number(t.prize_pool),
            maxPlayers: t.max_players,
            registeredCount: t.registrations?.[0]?.count ?? 0,
            startsAt: t.starts_at,
            status: t.status,
          }))}
        />

        {/* Empty state */}
        {tournaments.length === 0 && (
          <div className="card text-center py-16">
            <Trophy className="w-12 h-12 text-muted mx-auto mb-4 opacity-40" />
            <p className="text-muted mb-2">No tournaments yet</p>
            <p className="text-muted text-sm">Check back soon — tournaments are created on a weekly schedule.</p>
          </div>
        )}
      </div>
    </>
  )
}
