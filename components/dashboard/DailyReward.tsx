'use client'

import { useEffect, useState, useCallback } from 'react'

interface Reward {
  type: 'elo_boost' | 'usdc_bonus' | 'rake_discount'
  value: number
  label: string
}

interface NextMilestone {
  day: number
  label: string
}

export default function DailyReward() {
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [reward, setReward] = useState<Reward | null>(null)
  const [milestone, setMilestone] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [xp, setXp] = useState(20)
  const [cosmeticDrop, setCosmeticDrop] = useState<string | null>(null)
  const [nextMilestone, setNextMilestone] = useState<NextMilestone | null>(null)
  const [daysToNextMilestone, setDaysToNextMilestone] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [countdown, setCountdown] = useState('')

  // Check status on mount
  useEffect(() => {
    fetch('/api/daily-reward')
      .then((r) => r.json())
      .then((data) => {
        setAlreadyClaimed(data.alreadyClaimed)
        setStreak(data.loginStreak ?? 0)
        setMultiplier(data.multiplier ?? 1)
        setXp(data.xp ?? 20)
        setNextMilestone(data.nextMilestone ?? null)
        setDaysToNextMilestone(data.daysToNextMilestone ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Countdown to midnight UTC
  useEffect(() => {
    if (!alreadyClaimed) return
    const tick = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)
      const diff = tomorrow.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${h}h ${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [alreadyClaimed])

  const claim = useCallback(async () => {
    setClaiming(true)
    setSpinning(true)

    // Spin animation for 2 seconds before revealing
    await new Promise((r) => setTimeout(r, 2000))
    setSpinning(false)

    try {
      const res = await fetch('/api/daily-reward', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setReward(data.reward)
        setStreak(data.loginStreak)
        setMilestone(data.milestone)
        setMultiplier(data.multiplier ?? 1)
        setXp(data.xp ?? 20)
        setCosmeticDrop(data.cosmeticDrop ?? null)
        setNextMilestone(data.nextMilestone ?? null)
        setDaysToNextMilestone(data.daysToNextMilestone ?? 0)
        setAlreadyClaimed(true)
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3000)
      }
    } catch (_) {
      // silently fail
    } finally {
      setClaiming(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 animate-pulse">
        <div className="h-6 w-40 bg-gray-700 rounded mb-3" />
        <div className="h-10 w-full bg-gray-700 rounded" />
      </div>
    )
  }

  const streakEmoji = streak >= 30 ? '\u{1F451}' : streak >= 7 ? '\u{1F525}' : streak >= 3 ? '\u{1F525}' : '\u2B50'

  // Milestone progress bar
  const milestoneSteps = [
    { day: 3, label: '2x XP' },
    { day: 7, label: '3x + Cosmetic' },
    { day: 14, label: '4x XP' },
    { day: 30, label: '5x + Badge' },
  ]

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="celebration-burst" />
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                '--angle': `${i * 30}deg`,
                '--delay': `${i * 0.05}s`,
                '--color': ['#fbbf24', '#34d399', '#60a5fa', '#f472b6'][i % 4],
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Daily Reward
        </h3>
        {/* Streak multiplier badge */}
        {multiplier > 1 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
            {multiplier}x XP!
          </span>
        )}
      </div>

      {/* Streak display */}
      {streak > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{streakEmoji}</span>
            <span className="text-sm font-medium text-yellow-400">
              {streak}-day streak!
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              +{xp} XP/day
            </span>
          </div>

          {/* Milestone progress bar */}
          <div className="relative">
            <div className="flex justify-between mb-1">
              {milestoneSteps.map((step) => (
                <div
                  key={step.day}
                  className={`flex flex-col items-center ${
                    streak >= step.day ? 'text-yellow-400' : 'text-gray-500'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                      streak >= step.day
                        ? 'bg-yellow-500/20 border-yellow-500'
                        : 'bg-gray-700/50 border-gray-600'
                    }`}
                  >
                    {step.day}
                  </div>
                  <span className="text-[9px] mt-0.5 whitespace-nowrap">{step.label}</span>
                </div>
              ))}
            </div>
            {/* Progress track */}
            <div className="h-1 bg-gray-700 rounded-full mt-1">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Next milestone hint */}
          {nextMilestone && daysToNextMilestone > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {daysToNextMilestone} day{daysToNextMilestone !== 1 ? 's' : ''} to {nextMilestone.label}
            </p>
          )}
        </div>
      )}

      {/* Unclaimed — show spin button */}
      {!alreadyClaimed && !reward && (
        <div className="flex flex-col items-center gap-3">
          {/* Spinning wheel */}
          {spinning && (
            <div className="relative w-20 h-20">
              <div className="spin-wheel">
                <div className="spin-segment bg-yellow-500/80" />
                <div className="spin-segment bg-green-500/80" style={{ transform: 'rotate(120deg)' }} />
                <div className="spin-segment bg-blue-500/80" style={{ transform: 'rotate(240deg)' }} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-white shadow-lg z-10" />
              </div>
            </div>
          )}

          <button
            onClick={claim}
            disabled={claiming}
            className="w-full py-2.5 rounded-md font-semibold text-sm transition-all
              bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500
              text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
          >
            {claiming ? 'Spinning...' : `Claim Daily Reward (+${xp} XP)`}
          </button>
        </div>
      )}

      {/* Just claimed — show reward */}
      {reward && (
        <div className={`text-center py-2 ${showCelebration ? 'animate-bounce' : ''}`}>
          <div className="text-2xl mb-1">
            {reward.type === 'elo_boost' && '\u{1F4AA}'}
            {reward.type === 'usdc_bonus' && '\u{1F4B0}'}
            {reward.type === 'rake_discount' && '\u{1F3AB}'}
          </div>
          <p className="text-sm font-semibold text-white">{reward.label}</p>
          {multiplier > 1 && (
            <p className="text-xs text-yellow-400 mt-1">{multiplier}x streak bonus: +{xp} XP</p>
          )}
          {cosmeticDrop && (
            <p className="text-xs text-emerald-400 mt-1 font-medium">
              Cosmetic drop: {cosmeticDrop.replace(/_/g, ' ')}!
            </p>
          )}
          {milestone && (
            <p className="text-xs text-yellow-400 mt-2 font-medium">{milestone}</p>
          )}
        </div>
      )}

      {/* Already claimed — countdown */}
      {alreadyClaimed && !reward && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-400 mb-1">Come back tomorrow!</p>
          <p className="text-xs text-gray-500 font-mono">{countdown}</p>
        </div>
      )}

    </div>
  )
}
