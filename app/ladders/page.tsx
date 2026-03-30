import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { getLadderStandings, getPlayerLadderRank, msUntilReset, getCurrentWeekStart } from '@/lib/ladders'
import { cookies } from 'next/headers'
import { readSessionFromCookies } from '@/lib/session'
import type { Game } from '@/types'
import { LadderClient } from './LadderClient'

export const metadata: Metadata = {
  title: 'Weekly Ladders — Competitive Grinding',
  description: 'Compete in weekly ladders for CS2, Dota 2 and Deadlock. Accumulate points from wins, climb the ranks, and earn rewards. Resets every Monday UTC.',
  alternates: { canonical: 'https://raisegg.com/ladders' },
  openGraph: {
    title: 'RaiseGG – Weekly Ladders',
    description: 'Weekly competitive ladders for CS2, Dota 2 & Deadlock.',
    url: 'https://raisegg.com/ladders',
    images: [{ url: '/api/og?title=Weekly+Ladders&sub=Compete+%26+Climb&color=7b61ff', width: 1200, height: 630 }],
  },
}

const GAMES: { value: Game; label: string }[] = [
  { value: 'cs2',      label: 'CS2' },
  { value: 'dota2',    label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
]

export default async function LaddersPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>
}) {
  const { game: gameParam } = await searchParams
  const activeGame: Game = (GAMES.find((g) => g.value === gameParam)?.value) ?? 'cs2'

  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)

  const [standings, playerRank] = await Promise.all([
    getLadderStandings(activeGame, 50),
    playerId ? getPlayerLadderRank(playerId, activeGame) : null,
  ])

  const weekStart = getCurrentWeekStart()
  const resetMs = msUntilReset()

  const crumbs = breadcrumbSchema([
    { name: 'Home',    url: 'https://raisegg.com' },
    { name: 'Ladders', url: 'https://raisegg.com/ladders' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2">
          <span className="text-gradient">Weekly Ladders</span>
        </h1>
        <p className="text-muted text-sm mb-6">
          Compete all week. Top grinders earn rewards every Monday.
        </p>

        {/* Game tabs */}
        <div className="flex bg-space-800 rounded border border-border p-1 gap-1 w-fit mb-8">
          {GAMES.map((g) => (
            <a
              key={g.value}
              href={`/ladders?game=${g.value}`}
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

        <LadderClient
          standings={standings}
          playerRank={playerRank}
          resetMs={resetMs}
          weekStart={weekStart}
          activeGame={activeGame}
        />
      </div>
    </>
  )
}
