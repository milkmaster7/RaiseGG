'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface WeeklyStats {
  matchesPlayed: number
  wins: number
  losses: number
  winRate: number
  eloChange: number
  totalEarned: number
  currentStreak: number
  rank: number
}

export function WeeklyHighlights() {
  const [data, setData] = useState<WeeklyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/highlights')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-space-700 rounded w-40" />
          <div className="h-20 bg-space-700 rounded" />
        </div>
      </div>
    )
  }

  if (!data || data.matchesPlayed === 0) {
    return (
      <div className="card">
        <h2 className="font-orbitron font-bold text-white text-sm mb-3">This Week</h2>
        <p className="text-xs text-muted mb-3">No matches this week yet. Jump into a game!</p>
        <Link href="/play" className="text-xs text-accent-cyan hover:underline font-orbitron">
          Find a Match
        </Link>
      </div>
    )
  }

  const miniStats = [
    { label: 'W/L', value: `${data.wins}/${data.losses}`, color: 'text-white' },
    { label: 'WR', value: `${data.winRate}%`, color: data.winRate >= 50 ? 'text-green-400' : 'text-red-400' },
    { label: 'ELO', value: `${data.eloChange >= 0 ? '+' : ''}${data.eloChange}`, color: data.eloChange >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Earned', value: `${data.totalEarned >= 0 ? '+' : ''}$${data.totalEarned.toFixed(2)}`, color: data.totalEarned >= 0 ? 'text-green-400' : 'text-red-400' },
  ]

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-orbitron font-bold text-white text-sm">This Week</h2>
        <span className="text-[10px] text-muted uppercase tracking-wider">
          {data.matchesPlayed} match{data.matchesPlayed !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {miniStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className={`font-orbitron text-sm font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[9px] text-muted uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick win rate bar */}
      <div className="w-full h-1.5 rounded-full bg-space-700 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
          style={{ width: `${data.winRate}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          Rank <span className="font-orbitron text-accent-cyan font-bold">#{data.rank}</span>
        </span>
        <Link
          href="/highlights"
          className="text-xs text-accent-cyan hover:text-accent-cyan-glow transition-colors font-orbitron"
        >
          View Full Report &rarr;
        </Link>
      </div>
    </div>
  )
}
