'use client'

import { useState, useEffect } from 'react'
import { getTier, TIERS } from '@/lib/elo'

type Game = 'cs2' | 'dota2' | 'deadlock'
const GAME_LABELS: Record<Game, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
const GAMES: Game[] = ['cs2', 'dota2', 'deadlock']

interface PlayerData {
  username: string
  cs2_elo: number
  dota2_elo: number
  deadlock_elo: number
  cs2_wins: number
  cs2_losses: number
  dota2_wins: number
  dota2_losses: number
  deadlock_wins: number
  deadlock_losses: number
  current_streak: number
  best_streak: number
  usdc_balance: number
  usdt_balance: number
}

interface EloPoint {
  elo: number
  recorded_at: string
}

interface StatsData {
  player: PlayerData
  eloHistory: Record<string, EloPoint[]>
  totalEarnings: number
  biggestWin: number
  perGame: Record<string, { earnings: number }>
}

/* ── Donut Chart (pure CSS) ─────────────────────────────── */
function WinRateDonut({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses
  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-28 h-28">
        <span className="text-xs text-muted">No data</span>
      </div>
    )
  }
  const pct = Math.round((wins / total) * 100)
  const deg = (wins / total) * 360

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `conic-gradient(#22c55e 0deg ${deg}deg, #ef4444 ${deg}deg 360deg)`,
        }}
      />
      <div className="absolute inset-2 rounded-full bg-space-900 flex items-center justify-center">
        <div className="text-center">
          <div className="font-orbitron text-lg font-bold text-white">{pct}%</div>
          <div className="text-[10px] text-muted uppercase tracking-wider">Win Rate</div>
        </div>
      </div>
    </div>
  )
}

/* ── Sparkline (pure SVG) ───────────────────────────────── */
function Sparkline({ points, label }: { points: EloPoint[]; label: string }) {
  const width = 200
  const height = 40

  if (!points || points.length < 2) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
        <div className="flex items-center justify-center text-xs text-muted" style={{ height }}>
          Not enough data
        </div>
      </div>
    )
  }

  const elos = points.map(p => p.elo)
  const min = Math.min(...elos)
  const max = Math.max(...elos)
  const range = max - min || 1
  const pad = 3
  const w = width - pad * 2
  const h = height - pad * 2

  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * w,
    y: pad + (1 - (p.elo - min) / range) * h,
  }))

  const polyPoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const last = coords[coords.length - 1]
  const trending = elos[elos.length - 1] >= elos[0]
  const color = trending ? '#22c55e' : '#ef4444'
  const fillPath = `M${coords[0].x},${height} ` + coords.map(c => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') + ` L${last.x},${height} Z`
  const gradId = `spark-${label.replace(/\s/g, '')}`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
        <span className="text-xs font-orbitron font-bold" style={{ color }}>
          {elos[elos.length - 1]}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradId})`} />
        <polyline points={polyPoints} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
      </svg>
    </div>
  )
}

/* ── Rank Badge ─────────────────────────────────────────── */
function RankBadge({ elo }: { elo: number }) {
  const tier = getTier(elo)
  const isApex = tier.name === 'Apex'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-orbitron font-bold ${isApex ? 'font-black' : ''}`}
      style={{
        color: isApex ? '#fbbf24' : tier.color,
        background: isApex
          ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(255,255,255,0.1))'
          : tier.bg,
        border: `1px solid ${tier.color}40`,
        textShadow: isApex ? '0 0 8px rgba(251,191,36,0.6)' : undefined,
      }}
    >
      {tier.name} — {elo}
    </span>
  )
}

/* ── Stat Pill ──────────────────────────────────────────── */
function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center p-3 rounded bg-space-800 border border-border min-w-[80px]">
      <div className={`font-orbitron text-lg font-bold ${color ?? 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────── */
export function PlayerStats() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<Game | 'all'>('all')

  useEffect(() => {
    fetch('/api/player/stats')
      .then(r => r.json())
      .then(d => {
        if (!d.error) setData(d)
      })
      .catch((_) => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-space-700 rounded w-48" />
          <div className="h-32 bg-space-700 rounded" />
          <div className="h-20 bg-space-700 rounded" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card text-center py-8 text-muted">
        Could not load stats. Play some matches to get started.
      </div>
    )
  }

  const { player, eloHistory, totalEarnings, biggestWin, perGame } = data

  const totalWins = player.cs2_wins + player.dota2_wins + player.deadlock_wins
  const totalLosses = player.cs2_losses + player.dota2_losses + player.deadlock_losses
  const totalMatches = totalWins + totalLosses
  const peakElo = Math.max(player.cs2_elo, player.dota2_elo, player.deadlock_elo)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <h2 className="font-orbitron font-bold text-white text-sm mb-4">Player Stats</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Donut */}
          <WinRateDonut wins={totalWins} losses={totalLosses} />

          {/* Quick stats */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <RankBadge elo={peakElo} />
              {player.current_streak > 0 && (
                <span className="text-xs font-orbitron text-orange-400">
                  Streak: {player.current_streak}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <StatPill label="Played" value={totalMatches} />
              <StatPill label="Wins" value={totalWins} color="text-green-400" />
              <StatPill label="Losses" value={totalLosses} color="text-red-400" />
              <StatPill
                label="Earnings"
                value={`$${totalEarnings >= 0 ? '+' : ''}${totalEarnings.toFixed(2)}`}
                color={totalEarnings >= 0 ? 'text-green-400' : 'text-red-400'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ELO Sparklines */}
      <div className="card">
        <h2 className="font-orbitron font-bold text-white text-sm mb-4">ELO History</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {GAMES.map(g => (
            <Sparkline key={g} points={eloHistory[g] ?? []} label={GAME_LABELS[g]} />
          ))}
        </div>
      </div>

      {/* Best Performance */}
      <div className="card">
        <h2 className="font-orbitron font-bold text-white text-sm mb-4">Best Performance</h2>
        <div className="flex flex-wrap gap-3">
          <StatPill label="Best Streak" value={player.best_streak} color="text-accent-cyan" />
          <StatPill
            label="Biggest Win"
            value={biggestWin > 0 ? `$${biggestWin.toFixed(2)}` : '—'}
            color="text-accent-cyan"
          />
          <StatPill label="Peak ELO" value={peakElo} color="text-accent-cyan" />
        </div>
      </div>

      {/* Per-Game Breakdown */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-orbitron font-bold text-white text-sm">Per-Game Breakdown</h2>
          <div className="flex gap-1">
            {(['all', ...GAMES] as const).map(g => (
              <button
                key={g}
                onClick={() => setSelectedGame(g)}
                className={`text-[10px] font-orbitron uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                  selectedGame === g
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                    : 'text-muted hover:text-white border border-transparent'
                }`}
              >
                {g === 'all' ? 'All' : GAME_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {GAMES.filter(g => selectedGame === 'all' || selectedGame === g).map(g => {
            const wins = player[`${g}_wins`] ?? 0
            const losses = player[`${g}_losses`] ?? 0
            const total = wins + losses
            const wr = total > 0 ? Math.round((wins / total) * 100) : 0
            const elo = player[`${g}_elo`] ?? 1000
            const tier = getTier(elo)
            const earnings = perGame[g]?.earnings ?? 0

            return (
              <div key={g} className="p-4 rounded bg-space-800 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-orbitron text-xs text-accent-cyan uppercase tracking-wider">
                    {GAME_LABELS[g]}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: tier.color,
                      background: tier.bg,
                      border: `1px solid ${tier.color}40`,
                    }}
                  >
                    {tier.name}
                  </span>
                </div>
                <div className="font-orbitron text-xl font-bold text-white mb-2">{elo}</div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-green-400">{wins}W</span>
                  <span className="text-muted">{wr}%</span>
                  <span className="text-red-400">{losses}L</span>
                </div>
                {/* Mini win rate bar */}
                <div className="w-full h-1.5 rounded-full bg-space-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${wr}%` }}
                  />
                </div>
                <div className="mt-2 text-xs">
                  <span className={earnings >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {earnings >= 0 ? '+' : ''}{earnings.toFixed(2)} USDC
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
