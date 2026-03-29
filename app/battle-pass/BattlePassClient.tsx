'use client'
import { useState, useEffect, useCallback } from 'react'
import { BattlePassTrack } from '@/components/battle-pass/BattlePassTrack'
import { BuyPassButton } from '@/components/battle-pass/BuyPassButton'
import { SEASON_CONFIG, BATTLE_TIERS, XP_SOURCES, type XPSource } from '@/lib/battle-pass'

interface BattlePassData {
  season: number
  seasonName: string
  seasonEnd: string
  totalXP: number
  currentTier: number
  nextTier: { current: number; needed: number; progress: number }
  isPremium: boolean
  claimedTiers: number[]
  unclaimed: { tier: number; track: 'free' | 'premium'; reward: { name: string } }[]
  streakDays: number
}

function useCountdown(endDate: string) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    function calc() {
      const diff = Math.max(0, new Date(endDate).getTime() - Date.now())
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endDate])

  return time
}

export function BattlePassClient() {
  const [data, setData] = useState<BattlePassData | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const countdown = useCountdown(SEASON_CONFIG.endDate)

  const fetchData = useCallback(() => {
    fetch('/api/battle-pass')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleClaim(tier: number, track: 'free' | 'premium') {
    if (claiming) return
    setClaiming(true)
    try {
      const res = await fetch('/api/battle-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', tier, track }),
      })
      if (res.ok) fetchData()
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse h-48" />
        <div className="card animate-pulse h-32" />
      </div>
    )
  }

  // Unauthenticated state
  if (!data) {
    return (
      <div>
        <HeroSection countdown={countdown} />
        <div className="card mt-8">
          <p className="text-muted text-sm">Log in to track your Battle Pass progress and earn rewards.</p>
        </div>
        <TierPreview />
        <XPSourcesSection />
      </div>
    )
  }

  const maxTierXP = BATTLE_TIERS[BATTLE_TIERS.length - 1].xpRequired

  return (
    <div>
      <HeroSection countdown={countdown} />

      {/* Progress summary */}
      <div className="card mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-orbitron text-2xl font-black text-white">Tier {data.currentTier}</span>
              <span className="text-xs text-gray-400">/ 30</span>
              {data.isPremium && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  PREMIUM
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {data.totalXP.toLocaleString()} / {maxTierXP.toLocaleString()} Total XP
              {data.streakDays > 0 && (
                <span className="ml-3 text-orange-400">{data.streakDays}-day login streak</span>
              )}
            </p>
          </div>
          <BuyPassButton isPremium={data.isPremium} onPurchased={fetchData} />
        </div>

        {/* XP progress bar to next tier */}
        {data.currentTier < 30 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Tier {data.currentTier} → Tier {data.currentTier + 1}</span>
              <span>{data.nextTier.current} / {data.nextTier.needed} XP</span>
            </div>
            <div className="h-3 rounded-full bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-500"
                style={{ width: `${data.nextTier.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Unclaimed rewards notification */}
        {data.unclaimed.length > 0 && (
          <div className="mt-4 p-3 rounded bg-green-500/10 border border-green-500/30">
            <span className="text-green-400 text-sm font-semibold">
              {data.unclaimed.length} unclaimed reward{data.unclaimed.length > 1 ? 's' : ''}!
            </span>
            <span className="text-gray-400 text-xs ml-2">Click a tier below to claim.</span>
          </div>
        )}
      </div>

      {/* Tier track */}
      <div className="mt-8">
        <h2 className="font-orbitron text-sm font-bold text-white mb-4">Reward Track</h2>
        <BattlePassTrack
          currentTier={data.currentTier}
          isPremium={data.isPremium}
          claimedTiers={data.claimedTiers}
          onClaim={handleClaim}
        />
      </div>

      <XPSourcesSection />
    </div>
  )
}

function HeroSection({ countdown }: { countdown: { days: number; hours: number; minutes: number; seconds: number } }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 sm:p-12">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <div className="text-xs text-yellow-400 font-semibold uppercase tracking-widest mb-2">
          Season {SEASON_CONFIG.season}
        </div>
        <h1 className="font-orbitron text-3xl sm:text-4xl font-black text-white mb-3">
          {SEASON_CONFIG.name}
        </h1>
        <p className="text-gray-400 text-sm mb-6 max-w-xl">
          Earn XP by playing matches, completing challenges, and logging in daily.
          Unlock exclusive rewards across 30 tiers — upgrade to Premium for USDC prizes and rare cosmetics.
        </p>

        {/* Countdown */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Season ends in</span>
          <div className="flex gap-2">
            {[
              { label: 'D', value: countdown.days },
              { label: 'H', value: countdown.hours },
              { label: 'M', value: countdown.minutes },
              { label: 'S', value: countdown.seconds },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 min-w-[40px]">
                  <span className="font-orbitron text-lg font-bold text-white">
                    {String(value).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TierPreview() {
  // Show first 10 tiers as preview for logged-out users
  const previewTiers = BATTLE_TIERS.slice(0, 10)
  return (
    <div className="mt-8">
      <h2 className="font-orbitron text-sm font-bold text-white mb-4">Preview — First 10 Tiers</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {previewTiers.map(t => {
          const reward = t.freeReward ?? t.premiumReward
          return (
            <div key={t.tier} className="rounded border border-gray-700/50 bg-gray-800/50 p-3 text-center">
              <div className="text-xs text-gray-500 font-bold mb-1">Tier {t.tier}</div>
              <div className="text-xs text-gray-400">{reward?.name ?? '—'}</div>
              <div className="text-[10px] text-gray-600 mt-1">{t.xpRequired.toLocaleString()} XP</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function XPSourcesSection() {
  const sources: { source: XPSource; label: string }[] = [
    { source: 'match_win', label: 'Match Win' },
    { source: 'match_loss', label: 'Match Loss' },
    { source: 'daily_login', label: 'Daily Login' },
    { source: 'challenge_complete', label: 'Challenge Complete' },
    { source: 'login_streak_bonus', label: 'Login Streak (per day)' },
  ]

  return (
    <div className="card mt-8">
      <h2 className="font-orbitron text-sm font-bold text-white mb-3">How to Earn XP</h2>
      <div className="space-y-2">
        {sources.map(({ source, label }) => (
          <div key={source} className="flex items-center justify-between py-1.5 border-b border-gray-700/50 last:border-0">
            <span className="text-sm text-gray-300">{label}</span>
            <span className="text-sm font-semibold text-yellow-400">+{XP_SOURCES[source]} XP</span>
          </div>
        ))}
      </div>
    </div>
  )
}
