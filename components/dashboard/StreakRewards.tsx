'use client'

import { useEffect, useState } from 'react'

interface NextMilestone {
  day: number
  label: string
}

interface StreakData {
  alreadyClaimed: boolean
  loginStreak: number
  multiplier: number
  xp: number
  nextMilestone: NextMilestone | null
  daysToNextMilestone: number
}

const MILESTONES = [
  { day: 3,  label: '100 RaisePoints',       icon: '\u2B50', color: 'text-yellow-400',  bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/40' },
  { day: 7,  label: '$1 Match Credit',        icon: '\uD83D\uDCB0', color: 'text-green-400',   bgColor: 'bg-green-500/20',  borderColor: 'border-green-500/40' },
  { day: 14, label: '500 RP + Badge',          icon: '\uD83C\uDFC5', color: 'text-cyan-400',    bgColor: 'bg-cyan-500/20',   borderColor: 'border-cyan-500/40' },
  { day: 30, label: 'Free Tournament Entry',   icon: '\uD83C\uDFC6', color: 'text-purple-400',  bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/40' },
  { day: 60, label: '$5 Match Credit',         icon: '\uD83D\uDC8E', color: 'text-pink-400',    bgColor: 'bg-pink-500/20',   borderColor: 'border-pink-500/40' },
]

export function StreakRewards() {
  const [data, setData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/daily-reward')
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
          <div className="h-16 bg-space-700 rounded" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const streak = data.loginStreak ?? 0

  // Find current milestone bracket and next milestone
  let currentMilestoneIndex = -1
  let nextMilestoneIndex = -1
  for (let i = 0; i < MILESTONES.length; i++) {
    if (streak >= MILESTONES[i].day) {
      currentMilestoneIndex = i
    } else if (nextMilestoneIndex === -1) {
      nextMilestoneIndex = i
    }
  }

  const nextMilestone = nextMilestoneIndex >= 0 ? MILESTONES[nextMilestoneIndex] : null
  const daysToNext = nextMilestone ? nextMilestone.day - streak : 0

  // Progress bar: percentage between last milestone and next
  const prevDay = currentMilestoneIndex >= 0 ? MILESTONES[currentMilestoneIndex].day : 0
  const nextDay = nextMilestone ? nextMilestone.day : MILESTONES[MILESTONES.length - 1].day
  const progressRange = nextDay - prevDay
  const progressCurrent = streak - prevDay
  const progressPct = progressRange > 0 ? Math.min(Math.round((progressCurrent / progressRange) * 100), 100) : 100

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-orbitron font-bold text-white text-sm">Streak Rewards</h2>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30">
            {streak}-day streak
          </span>
        )}
      </div>

      {/* Milestone timeline */}
      <div className="flex items-start justify-between gap-1 mb-3">
        {MILESTONES.map((m) => {
          const reached = streak >= m.day
          return (
            <div key={m.day} className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-all ${
                  reached
                    ? `${m.bgColor} ${m.borderColor} ${m.color}`
                    : 'bg-space-800 border-border text-muted'
                }`}
              >
                {reached ? m.icon : m.day}
              </div>
              <span className={`text-[9px] mt-1 text-center leading-tight ${reached ? m.color : 'text-muted'}`}>
                {m.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar between milestones */}
      <div className="relative h-2 bg-space-700 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-purple-500 transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Next milestone info */}
      {nextMilestone ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">
            Next reward in <span className="font-orbitron text-white font-bold">{daysToNext}</span> day{daysToNext !== 1 ? 's' : ''}
          </span>
          <span className={nextMilestone.color}>
            {nextMilestone.icon} {nextMilestone.label}
          </span>
        </div>
      ) : (
        <div className="text-xs text-center text-accent-cyan font-orbitron">
          All milestones reached — legendary streak!
        </div>
      )}

      {/* Multiplier info */}
      {data.multiplier > 1 && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20">
            {data.multiplier}x XP Multiplier Active — +{data.xp} XP/day
          </span>
        </div>
      )}
    </div>
  )
}
