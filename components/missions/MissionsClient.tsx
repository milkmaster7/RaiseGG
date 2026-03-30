'use client'

import { useEffect, useState, useCallback } from 'react'
import { Target, Trophy, Crosshair, Sword, Star, Clock, Flame, Zap, Lock, DollarSign, Gamepad2, Users, Crown } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ─── Types ───────────────────────────────────────────────────────
interface Mission {
  mission_id: string
  title: string
  description: string
  game: string | null
  mission_type: string
  target: number
  rp_reward: number
  period: 'daily' | 'weekly'
  icon: string
  progress: number
  completed: boolean
  claimed: boolean
}

interface MissionsResponse {
  daily: Mission[]
  weekly: Mission[]
  raise_points: number
  today: string
  week_start: string
}

// ─── Icon map ────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  trophy: Trophy,
  sword: Sword,
  crosshair: Crosshair,
  star: Star,
  clock: Clock,
  fire: Flame,
  flame: Flame,
  lightning: Zap,
  money: DollarSign,
  lock: Lock,
  gamepad: Gamepad2,
  users: Users,
  crown: Crown,
}

// ─── Fallback missions (shown when API returns empty) ────────────
const FALLBACK_DAILY: Mission[] = [
  { mission_id: 'fb_d1', title: 'Play 3 CS2 Matches', description: 'Complete 3 CS2 matches today.', game: 'cs2', mission_type: 'play_match', target: 3, rp_reward: 80, period: 'daily', icon: 'crosshair', progress: 0, completed: false, claimed: false },
  { mission_id: 'fb_d2', title: 'Win a Dota 2 Match', description: 'Win a Dota 2 match today.', game: 'dota2', mission_type: 'win_match', target: 1, rp_reward: 50, period: 'daily', icon: 'sword', progress: 0, completed: false, claimed: false },
  { mission_id: 'fb_d3', title: 'Complete a Match Under 30 Minutes', description: 'Finish any match in under 30 minutes.', game: null, mission_type: 'play_match', target: 1, rp_reward: 60, period: 'daily', icon: 'clock', progress: 0, completed: false, claimed: false },
  { mission_id: 'fb_d4', title: 'Win with Under 20 Ping', description: 'Win a match with under 20ms ping.', game: null, mission_type: 'win_match', target: 1, rp_reward: 75, period: 'daily', icon: 'lightning', progress: 0, completed: false, claimed: false },
]

const FALLBACK_WEEKLY: Mission[] = [
  { mission_id: 'fb_w1', title: 'Play 5 Matches This Week', description: 'Complete 5 matches this week.', game: null, mission_type: 'play_match', target: 5, rp_reward: 300, period: 'weekly', icon: 'fire', progress: 0, completed: false, claimed: false },
  { mission_id: 'fb_w2', title: 'Win 3 Matches in a Row', description: 'Achieve a 3-match win streak.', game: null, mission_type: 'win_streak', target: 3, rp_reward: 250, period: 'weekly', icon: 'flame', progress: 0, completed: false, claimed: false },
  { mission_id: 'fb_w3', title: 'Try All 3 Games', description: 'Play at least 1 match in CS2, Dota 2, and Deadlock.', game: null, mission_type: 'multi_game', target: 3, rp_reward: 250, period: 'weekly', icon: 'gamepad', progress: 0, completed: false, claimed: false },
]

// ─── Game icons ──────────────────────────────────────────────────
function GameBadge({ game }: { game: string | null }) {
  if (!game) return null
  const labels: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
  const colors: Record<string, string> = {
    cs2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    dota2: 'bg-red-500/20 text-red-400 border-red-500/30',
    deadlock: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  }
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${colors[game] ?? 'bg-space-800 text-muted border-border'}`}>
      {labels[game] ?? game}
    </span>
  )
}

// ─── Countdown timer ─────────────────────────────────────────────
function useCountdown(targetDate: Date) {
  const calc = useCallback(() => {
    const diff = Math.max(0, targetDate.getTime() - Date.now())
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return { h, m, s, total: diff }
  }, [targetDate])

  const [time, setTime] = useState(calc)

  useEffect(() => {
    const iv = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(iv)
  }, [calc])

  return time
}

function ResetTimer({ label, target }: { label: string; target: Date }) {
  const { h, m, s } = useCountdown(target)
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <Clock className="w-3.5 h-3.5 text-accent-cyan" />
      <span>{label} resets in</span>
      <span className="font-mono text-white">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </div>
  )
}

// ─── Mission Card ────────────────────────────────────────────────
function MissionCard({
  mission,
  periodStart,
  onClaim,
  claiming,
}: {
  mission: Mission
  periodStart: string
  onClaim: (missionId: string, periodStart: string) => void
  claiming: string | null
}) {
  const Icon = ICON_MAP[mission.icon] ?? Target
  const pct = mission.target > 0 ? Math.round((mission.progress / mission.target) * 100) : 0
  const isClaiming = claiming === mission.mission_id

  return (
    <div
      className={`
        relative rounded bg-space-950 border p-4 transition-all duration-200
        ${mission.claimed
          ? 'border-green-500/30 opacity-60'
          : mission.completed
            ? 'border-accent-cyan/40 shadow-[0_0_12px_rgba(0,230,255,0.1)]'
            : 'border-border hover:border-accent-purple/30'
        }
      `}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`
              w-9 h-9 rounded flex items-center justify-center flex-shrink-0
              ${mission.completed ? 'bg-accent-cyan/15 text-accent-cyan' : 'bg-space-800 text-muted'}
            `}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white truncate">{mission.title}</h3>
              <GameBadge game={mission.game} />
            </div>
            <p className="text-xs text-muted mt-0.5 line-clamp-1">{mission.description}</p>
          </div>
        </div>

        {/* Reward badge */}
        <div className="flex-shrink-0 text-right">
          <span className="text-xs font-bold text-accent-purple">+{mission.rp_reward} RP</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] text-muted mb-1">
          <span>
            {mission.progress}/{mission.target}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-space-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              mission.completed ? 'bg-accent-cyan shadow-glow-sm' : 'bg-accent-purple/70'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Claim button */}
      {mission.claimed ? (
        <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
          <Trophy className="w-3.5 h-3.5" />
          Claimed
        </div>
      ) : mission.completed ? (
        <Button
          onClick={() => onClaim(mission.mission_id, periodStart)}
          disabled={isClaiming}
          className="w-full text-xs py-1.5"
        >
          {isClaiming ? 'Claiming...' : 'Claim Reward'}
        </Button>
      ) : null}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function MissionsClient() {
  const [data, setData] = useState<MissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<string | null>(null)

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions')
      if (!res.ok) {
        if (res.status === 401) {
          setError('Sign in to view your missions.')
          setLoading(false)
          return
        }
        throw new Error('Failed to load missions')
      }
      const json: MissionsResponse = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError('Failed to load missions. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  const handleClaim = async (missionId: string, periodStart: string) => {
    setClaiming(missionId)
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: missionId, period_start: periodStart }),
      })
      if (res.ok) {
        await fetchMissions()
      }
    } finally {
      setClaiming(null)
    }
  }

  // Compute reset times
  const now = new Date()
  const dailyReset = new Date(now)
  dailyReset.setUTCDate(dailyReset.getUTCDate() + 1)
  dailyReset.setUTCHours(0, 0, 0, 0)

  const weeklyReset = new Date(now)
  const daysUntilMonday = (8 - weeklyReset.getUTCDay()) % 7 || 7
  weeklyReset.setUTCDate(weeklyReset.getUTCDate() + daysUntilMonday)
  weeklyReset.setUTCHours(0, 0, 0, 0)

  // Use real data or fallbacks
  const daily = data?.daily?.length ? data.daily : FALLBACK_DAILY
  const weekly = data?.weekly?.length ? data.weekly : FALLBACK_WEEKLY

  // RP counters
  const dailyClaimed = daily.filter(m => m.claimed).reduce((s, m) => s + m.rp_reward, 0)
  const weeklyClaimed = weekly.filter(m => m.claimed).reduce((s, m) => s + m.rp_reward, 0)

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded bg-space-950 border border-border animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <Target className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* RP Summary */}
      <div className="flex flex-wrap gap-4">
        <div className="card flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="w-10 h-10 rounded bg-accent-purple/15 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <p className="text-xs text-muted">Total RaisePoints</p>
            <p className="text-lg font-bold text-white font-orbitron">
              {(data?.raise_points ?? 0).toLocaleString()} RP
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="w-10 h-10 rounded bg-accent-cyan/15 flex items-center justify-center">
            <Target className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <p className="text-xs text-muted">Earned Today</p>
            <p className="text-lg font-bold text-white font-orbitron">{dailyClaimed} RP</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="w-10 h-10 rounded bg-green-500/15 flex items-center justify-center">
            <Crown className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted">Earned This Week</p>
            <p className="text-lg font-bold text-white font-orbitron">{weeklyClaimed} RP</p>
          </div>
        </div>
      </div>

      {/* Daily Missions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-orbitron text-lg font-bold text-white">Daily Missions</h2>
          <ResetTimer label="Daily" target={dailyReset} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {daily.map(m => (
            <MissionCard
              key={m.mission_id}
              mission={m}
              periodStart={data?.today ?? new Date().toISOString().split('T')[0]}
              onClaim={handleClaim}
              claiming={claiming}
            />
          ))}
        </div>
      </section>

      {/* Weekly Missions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-orbitron text-lg font-bold text-white">Weekly Missions</h2>
          <ResetTimer label="Weekly" target={weeklyReset} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weekly.map(m => (
            <MissionCard
              key={m.mission_id}
              mission={m}
              periodStart={data?.week_start ?? new Date().toISOString().split('T')[0]}
              onClaim={handleClaim}
              claiming={claiming}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <div className="card">
        <h2 className="font-orbitron text-sm font-bold text-white mb-3">How Missions Work</h2>
        <ul className="space-y-2 text-muted text-sm">
          <li className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">1.</span>
            4 daily missions rotate every day at 00:00 UTC
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">2.</span>
            3 weekly missions rotate every Monday at 00:00 UTC
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">3.</span>
            Progress updates automatically as you play matches
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">4.</span>
            Claim your RaisePoints once a mission is complete
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">5.</span>
            Spend RP in the Cosmetics shop for exclusive items
          </li>
        </ul>
      </div>
    </div>
  )
}
