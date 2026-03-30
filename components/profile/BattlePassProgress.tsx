'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { getCurrentTier, getNextTierXP, BATTLE_TIERS, SEASON_CONFIG } from '@/lib/battle-pass'

interface Props {
  playerId: string
}

export function BattlePassProgress({ playerId }: Props) {
  const [totalXP, setTotalXP] = useState<number | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/player/battle-pass?playerId=${encodeURIComponent(playerId)}`)
        if (res.ok) {
          const data = await res.json()
          setTotalXP(data.totalXP ?? data.xp ?? 0)
          setIsPremium(data.isPremium ?? data.premium ?? false)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [playerId])

  if (loading || totalXP === null) return null

  const tier = getCurrentTier(totalXP)
  const { current, needed, progress } = getNextTierXP(totalXP)
  const nextTierData = tier < 30 ? BATTLE_TIERS[tier] : null
  const nextReward = nextTierData?.freeReward ?? nextTierData?.premiumReward

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-cyan" />
          <h2 className="font-orbitron font-bold text-white text-sm">Battle Pass</h2>
          {isPremium && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
              Premium
            </span>
          )}
        </div>
        <Link href="/battle-pass" className="text-xs text-accent-cyan hover:underline font-semibold">
          View All
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex-shrink-0">
          <div className="font-orbitron text-2xl font-black text-gradient">
            {tier}
          </div>
          <div className="text-[10px] text-muted uppercase tracking-widest">Tier</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted">
              {current} / {needed} XP
            </span>
            <span className="text-white font-semibold">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-space-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-purple transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {nextReward && tier < 30 && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Next reward:</span>
          <span className="text-white font-semibold">{nextReward.name}</span>
          <span className="text-muted">at Tier {tier + 1}</span>
        </div>
      )}

      {tier >= 30 && (
        <div className="text-xs text-accent-cyan font-semibold">
          Max tier reached — {SEASON_CONFIG.name}
        </div>
      )}
    </div>
  )
}
