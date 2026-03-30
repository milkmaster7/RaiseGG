import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/schemas'
import { Eye, Gamepad2, Users, DollarSign, Radio } from 'lucide-react'
import { SideWager } from '@/components/spectate/SideWager'

export const metadata: Metadata = {
  title: 'Live Matches — Spectate',
  description: 'Watch live CS2, Dota 2 and Deadlock stake matches on RaiseGG. Spectate the best players in real time via GOTV.',
  alternates: { canonical: 'https://raisegg.com/spectate' },
  openGraph: {
    title: 'RaiseGG Live Matches',
    description: 'Watch live stake matches. See top players compete for real USDC.',
    url: 'https://raisegg.com/spectate',
    images: [{ url: '/api/og?title=Live+Matches&sub=Spectate+Mode&color=ff3366', width: 1200, height: 630 }],
  },
}

async function getLiveMatches() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://raisegg.com'}/api/matches/live`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function SpectatePage() {
  const matches = await getLiveMatches()
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Spectate', url: 'https://raisegg.com/spectate' },
  ])

  const gameLabels: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
  const gameColors: Record<string, string> = { cs2: 'text-orange-400', dota2: 'text-red-400', deadlock: 'text-purple-400' }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-2">
          <Radio className="w-6 h-6 text-red-500 animate-pulse" />
          <h1 className="font-orbitron text-3xl font-black text-gradient">Live Matches</h1>
        </div>
        <p className="text-muted mb-10">
          Watch ongoing stake matches in real-time. Connect via GOTV to spectate CS2 matches.
        </p>

        {matches.length === 0 ? (
          <div className="card text-center py-16">
            <Eye className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="font-orbitron text-xl text-white mb-2">No Live Matches</h2>
            <p className="text-muted mb-6">Check back soon or start your own match.</p>
            <Link href="/play" className="btn-primary px-6 py-3 inline-block">Find a Match</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match: any) => {
              const playerA = match.player_a as any
              const playerB = match.player_b as any
              const eloKey = `${match.game}_elo`

              return (
                <div key={match.id} className="card-hover">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* Match info */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Gamepad2 className={`w-4 h-4 ${gameColors[match.game] ?? 'text-white'}`} />
                        <span className={`font-orbitron text-sm font-bold ${gameColors[match.game] ?? 'text-white'}`}>
                          {gameLabels[match.game] ?? match.game}
                        </span>
                      </div>
                      {match.is_team_match && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Users className="w-3 h-3" /> {match.format}
                        </span>
                      )}
                    </div>

                    {/* Stake */}
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="font-orbitron font-bold text-green-400">${match.stake_amount}</span>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm">
                      <span className="text-white font-semibold">{playerA?.username ?? 'Player A'}</span>
                      <span className="text-muted ml-2">({playerA?.[eloKey] ?? '?'} ELO)</span>
                    </div>
                    <span className="text-xs text-muted font-orbitron">VS</span>
                    <div className="text-sm text-right">
                      <span className="text-white font-semibold">{playerB?.username ?? 'Player B'}</span>
                      <span className="text-muted ml-2">({playerB?.[eloKey] ?? '?'} ELO)</span>
                    </div>
                  </div>

                  {/* GOTV Connect */}
                  {match.spectate && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">GOTV Spectate:</span>
                        <code className="text-xs text-accent-cyan bg-space-800 px-2 py-1 rounded select-all">
                          {match.spectate.gotvConnect}
                        </code>
                      </div>
                    </div>
                  )}

                  {/* Side Wager */}
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <SideWager
                      matchId={match.id}
                      playerAName={playerA?.username ?? 'Player A'}
                      playerBName={playerB?.username ?? 'Player B'}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
