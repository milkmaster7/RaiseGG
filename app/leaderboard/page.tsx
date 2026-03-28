import type { Metadata } from 'next'
import { leaderboardSchema, breadcrumbSchema } from '@/lib/schemas'
import { LeaderboardTable } from '@/components/ui/LeaderboardTable'
import { createServiceClient } from '@/lib/supabase'
import type { Game, Player } from '@/types'

export const metadata: Metadata = {
  title: 'Leaderboard — Top Stake Players',
  description: 'See the top CS2, Dota 2 and Deadlock stake players on RaiseGG.gg. Updated live leaderboard with win rates, earnings and rank. Where do you stand?',
  alternates: { canonical: 'https://raisegg.gg/leaderboard' },
  openGraph: {
    title: 'RaiseGG.gg – Leaderboard',
    description: 'Top CS2, Dota 2 & Deadlock stake players. Updated live.',
    url: 'https://raisegg.gg/leaderboard',
    images: [{ url: '/api/og?title=Leaderboard&sub=Top+Stake+Players&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG.gg – Leaderboard',
    images: ['/api/og?title=Leaderboard&sub=Top+Stake+Players&color=7b61ff'],
  },
}

const GAMES: { value: Game; label: string }[] = [
  { value: 'cs2',      label: 'CS2' },
  { value: 'dota2',    label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
]

async function getTopPlayers(game: Game) {
  const supabase = createServiceClient()
  const eloCol = `${game}_elo`
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('eligible', true)
    .eq('banned', false)
    .order(eloCol, { ascending: false })
    .limit(100)
  return data ?? []
}

async function getWeeklyTopPlayers(game: Game) {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: matches } = await supabase
    .from('matches')
    .select('winner_id')
    .eq('status', 'completed')
    .eq('game', game)
    .gte('resolved_at', since)

  if (!matches || matches.length === 0) return []

  // Tally wins per player
  const winCounts: Record<string, number> = {}
  for (const m of matches) {
    if (m.winner_id) {
      winCounts[m.winner_id] = (winCounts[m.winner_id] ?? 0) + 1
    }
  }

  const topIds = Object.entries(winCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([id]) => id)

  if (topIds.length === 0) return []

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .in('id', topIds)

  // Sort by weekly wins
  return (players ?? []).sort((a, b) => (winCounts[b.id] ?? 0) - (winCounts[a.id] ?? 0))
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; period?: string }>
}) {
  const { game: gameParam, period: periodParam } = await searchParams
  const activeGame: Game = (GAMES.find((g) => g.value === gameParam)?.value) ?? 'cs2'
  const activePeriod = periodParam === 'week' ? 'week' : 'all'
  const players = activePeriod === 'week'
    ? await getWeeklyTopPlayers(activeGame)
    : await getTopPlayers(activeGame)

  const lbSchema = leaderboardSchema(
    players.slice(0, 10).map((p, i) => ({
      name: p.username,
      rank: i + 1,
      url: `https://raisegg.gg/profile/${p.username}`,
    }))
  )
  const crumbs = breadcrumbSchema([
    { name: 'Home',        url: 'https://raisegg.gg' },
    { name: 'Leaderboard', url: 'https://raisegg.gg/leaderboard' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lbSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2">
          <span className="text-gradient">Leaderboard</span>
        </h1>

        {/* Season 1 banner */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-space-800 border border-accent-cyan/30 rounded">
          <span className="badge-cyan text-xs">SEASON 1</span>
          <span className="text-sm text-muted">Current season · Ends when Season 2 is announced · Top 3 earn reduced rake</span>
        </div>

        {activePeriod === 'week' && (
          <p className="text-xs text-muted mb-6">Resets every Monday</p>
        )}

        {/* Period toggle */}
        <div className="flex bg-space-800 rounded border border-border p-1 gap-1 w-fit mb-4">
          {(['all', 'week'] as const).map((p) => (
            <a
              key={p}
              href={`/leaderboard?game=${activeGame}&period=${p}`}
              className={`px-4 py-2 rounded text-sm font-semibold transition-all ${
                activePeriod === p
                  ? 'bg-accent-cyan text-space-900'
                  : 'text-muted hover:text-white'
              }`}
            >
              {p === 'all' ? (
                <span>All Time <span className="text-xs font-normal opacity-70 ml-1">— Season 1</span></span>
              ) : 'This Week'}
            </a>
          ))}
        </div>

        {/* Game tabs */}
        <div className="flex bg-space-800 rounded border border-border p-1 gap-1 w-fit mb-8">
          {GAMES.map((g) => (
            <a
              key={g.value}
              href={`/leaderboard?game=${g.value}&period=${activePeriod}`}
              className={`px-4 py-2 rounded text-sm font-semibold transition-all ${
                activeGame === g.value
                  ? 'bg-accent-cyan text-space-900'
                  : 'text-muted hover:text-white'
              }`}
            >
              {g.label}
            </a>
          ))}
        </div>

        {players.length === 0 ? (
          <div className="card text-center py-20">
            <p className="text-muted">No ranked players yet. Be the first.</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <LeaderboardTable players={players as Player[]} game={activeGame} />
          </div>
        )}
      </div>
    </>
  )
}
