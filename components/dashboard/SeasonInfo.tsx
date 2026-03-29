'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, Clock, Medal, ChevronRight, Gift, Crown, Star } from 'lucide-react'
import { getCurrentSeason, getNextSeason, getDaysRemaining, getSeasonProgress, getRewardForPosition } from '@/lib/seasons'
import type { Season, SeasonReward } from '@/lib/seasons'

const RANK_ICONS: Record<string, typeof Trophy> = {
  '#1': Crown,
  '#2': Medal,
  '#3': Medal,
  'Top 10': Star,
  'Top 50': Star,
}

const RANK_COLORS: Record<string, string> = {
  '#1': 'text-yellow-400',
  '#2': 'text-gray-300',
  '#3': 'text-orange-400',
  'Top 10': 'text-purple-400',
  'Top 50': 'text-blue-400',
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function update() {
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Season ended')
        return
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (d > 0) {
        setTimeLeft(`${d}d ${h}h ${m}m`)
      } else {
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${h}h ${m}m ${s}s`)
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return <span>{timeLeft}</span>
}

function RewardRow({ reward }: { reward: SeasonReward }) {
  const Icon = RANK_ICONS[reward.rank] ?? Star
  const color = RANK_COLORS[reward.rank] ?? 'text-gray-400'

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <span className={`text-sm font-semibold ${color} w-16`}>{reward.rank}</span>
      <div className="flex-1 text-sm">
        {reward.prizeUSDC > 0 && (
          <span className="text-emerald-400 font-bold mr-2">${reward.prizeUSDC} USDC</span>
        )}
        <span className="text-muted">{reward.badgeName}</span>
        {reward.permanentPerk && (
          <span className="text-amber-400 text-xs ml-2">+ {reward.permanentPerk}</span>
        )}
      </div>
    </div>
  )
}

export function SeasonInfo() {
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const season = getCurrentSeason()
  const nextSeason = getNextSeason()

  useEffect(() => {
    async function loadRank() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        // Get current user's session to find their rank
        // This is a simplified approach — in production you'd have a dedicated leaderboard API
        const res = await fetch('/api/matchmaking/queue')
        const data = await res.json()
        // For now we'll show rank as TBD until the season starts
        setRank(null)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    loadRank()
  }, [])

  // No active season
  if (!season) {
    if (nextSeason) {
      return (
        <div className="card">
          <h3 className="font-orbitron text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Next Season
          </h3>
          <div className="text-center py-4">
            <div className="font-orbitron text-lg font-bold text-white mb-1">{nextSeason.name}</div>
            <div className="text-sm text-muted mb-3">{nextSeason.subtitle}</div>
            <div className="text-sm text-muted mb-1">Starts in</div>
            <div className="font-orbitron text-xl font-bold text-accent-cyan">
              <CountdownTimer targetDate={nextSeason.startDate} />
            </div>
          </div>

          {/* Rewards Preview */}
          <div className="border-t border-gray-700 pt-3 mt-3">
            <h4 className="text-xs text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Season Rewards
            </h4>
            <div className="divide-y divide-gray-700/50">
              {nextSeason.rewards.map(r => (
                <RewardRow key={r.rank} reward={r} />
              ))}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const daysLeft = getDaysRemaining(season)
  const progress = getSeasonProgress(season)
  const myReward = rank ? getRewardForPosition(season, rank) : null

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-orbitron text-sm font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> {season.subtitle}
        </h3>
        <a href="/leaderboard" className="text-xs text-accent-cyan hover:underline flex items-center gap-0.5">
          Leaderboard <ChevronRight className="w-3 h-3" />
        </a>
      </div>

      {/* Season Name + Progress */}
      <div className="mb-4">
        <div className="font-orbitron text-lg font-bold text-white mb-2">{season.name}</div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-accent-cyan to-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{progress}% complete</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <CountdownTimer targetDate={season.endDate} /> remaining
          </span>
        </div>
      </div>

      {/* Player Rank */}
      <div className="card bg-gray-800/50 border-gray-700 mb-4">
        <div className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Your Seasonal Rank</div>
        {rank !== null ? (
          <div className="flex items-center justify-between">
            <div className={`font-orbitron text-2xl font-black ${RANK_COLORS[myReward?.rank ?? ''] ?? 'text-white'}`}>
              #{rank}
            </div>
            {myReward && (
              <div className="text-right">
                <div className={`text-sm font-semibold ${RANK_COLORS[myReward.rank] ?? 'text-gray-400'}`}>
                  {myReward.badgeName}
                </div>
                {myReward.prizeUSDC > 0 && (
                  <div className="text-xs text-emerald-400">${myReward.prizeUSDC} USDC</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted">
            {loading ? 'Loading...' : 'Play matches to earn a seasonal rank'}
          </div>
        )}
      </div>

      {/* Rewards Preview */}
      <div className="border-t border-gray-700 pt-3">
        <h4 className="text-xs text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5" /> Season Rewards
        </h4>
        <div className="divide-y divide-gray-700/50">
          {season.rewards.map(r => (
            <RewardRow key={r.rank} reward={r} />
          ))}
        </div>
      </div>
    </div>
  )
}
