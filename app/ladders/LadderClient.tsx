'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Timer, TrendingUp, TrendingDown, Minus, Sparkles, Trophy } from 'lucide-react'
import type { LadderEntry } from '@/lib/ladders'
import type { Game } from '@/types'

interface Props {
  standings: LadderEntry[]
  playerRank: (LadderEntry & { total_players: number }) | null
  resetMs: number
  weekStart: string
  activeGame: Game
}

function formatCountdown(ms: number) {
  if (ms <= 0) return 'Resetting...'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

const RANK_STYLES: Record<number, { bg: string; border: string; text: string; icon: string }> = {
  1: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', icon: 'text-yellow-400' },
  2: { bg: 'bg-gray-300/10',   border: 'border-gray-400/40',   text: 'text-gray-300',  icon: 'text-gray-300'  },
  3: { bg: 'bg-amber-600/10',  border: 'border-amber-600/40',  text: 'text-amber-500', icon: 'text-amber-500' },
}

function TrendIcon({ trend }: { trend: LadderEntry['trend'] }) {
  switch (trend) {
    case 'up':   return <TrendingUp className="w-3.5 h-3.5 text-green-400" />
    case 'down': return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
    case 'same': return <Minus className="w-3.5 h-3.5 text-muted" />
    case 'new':  return <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
  }
}

export function LadderClient({ standings, playerRank, resetMs, weekStart, activeGame }: Props) {
  const [remaining, setRemaining] = useState(resetMs)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Reset countdown + player rank */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="card flex items-center gap-3 flex-1">
          <Timer className="w-5 h-5 text-accent-cyan flex-shrink-0" />
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Resets in</p>
            <p className="font-orbitron font-bold text-white text-lg">{formatCountdown(remaining)}</p>
          </div>
        </div>

        {playerRank && (
          <div className="card flex items-center gap-3 flex-1 border border-accent-cyan/30">
            <Trophy className="w-5 h-5 text-accent-cyan flex-shrink-0" />
            <div>
              <p className="text-xs text-muted uppercase tracking-wider">Your Rank</p>
              <p className="font-orbitron font-bold text-accent-cyan text-lg">
                #{playerRank.rank}
                <span className="text-muted text-xs font-normal ml-2">
                  of {playerRank.total_players} players
                </span>
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted">Points</p>
              <p className="font-orbitron font-bold text-white">{playerRank.points}</p>
            </div>
          </div>
        )}
      </div>

      {/* Week info */}
      <p className="text-xs text-muted mb-4">
        Week of {new Date(weekStart + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        {' '} &middot; Points = ELO gained + streak bonus
      </p>

      {/* Standings table */}
      {standings.length === 0 ? (
        <div className="card text-center py-20">
          <p className="text-muted">No ladder entries yet this week. Play a match to get on the board.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-16">#</th>
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-right px-4 py-3">Points</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">W/L</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Win Rate</th>
                <th className="text-center px-4 py-3 w-16">Trend</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((entry) => {
                const style = RANK_STYLES[entry.rank]
                const isPlayer = playerRank?.player_id === entry.player_id

                return (
                  <tr
                    key={entry.player_id}
                    className={`
                      border-b border-border/50 transition-colors
                      ${isPlayer ? 'bg-accent-cyan/5 border-l-2 border-l-accent-cyan' : 'hover:bg-space-800/50'}
                      ${style ? `${style.bg} border ${style.border}` : ''}
                    `}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3">
                      <span className={`font-orbitron font-bold ${style?.text ?? 'text-muted'}`}>
                        {entry.rank}
                      </span>
                    </td>

                    {/* Player */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {entry.avatar_url ? (
                          <Image
                            src={entry.avatar_url}
                            alt={entry.username}
                            width={28}
                            height={28}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-space-700 flex-shrink-0" />
                        )}
                        <Link
                          href={`/profile/${entry.username}`}
                          className="text-white hover:text-accent-cyan transition-colors font-medium truncate"
                        >
                          {entry.username}
                        </Link>
                      </div>
                    </td>

                    {/* Points */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-orbitron font-bold text-white">{entry.points}</span>
                    </td>

                    {/* W/L */}
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-green-400">{entry.wins}</span>
                      <span className="text-muted mx-1">/</span>
                      <span className="text-red-400">{entry.losses}</span>
                    </td>

                    {/* Win Rate */}
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-muted">{entry.win_rate}%</span>
                    </td>

                    {/* Trend */}
                    <td className="px-4 py-3 text-center">
                      <TrendIcon trend={entry.trend} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
