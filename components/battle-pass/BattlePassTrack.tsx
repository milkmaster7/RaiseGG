'use client'
import { useState, useRef, useEffect } from 'react'
import { BATTLE_TIERS, type BattleTier, type TierReward } from '@/lib/battle-pass'

interface BattlePassTrackProps {
  currentTier: number
  isPremium: boolean
  claimedTiers: number[]
  onClaim: (tier: number, track: 'free' | 'premium') => void
}

const REWARD_ICONS: Record<string, string> = {
  badge: '🏅',
  elo_boost: '⚡',
  profile_border: '🔲',
  rake_discount: '💰',
  avatar_ring: '💫',
  title: '🏷️',
  usdc: '💵',
  pnl_border: '🖼️',
  animated_badge: '🏆',
}

export function BattlePassTrack({ currentTier, isPremium, claimedTiers, onClaim }: BattlePassTrackProps) {
  const [showPremium, setShowPremium] = useState(isPremium)
  const [selectedTier, setSelectedTier] = useState<BattleTier | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLDivElement>(null)

  // Scroll to current tier on mount
  useEffect(() => {
    if (currentRef.current && trackRef.current) {
      const offset = currentRef.current.offsetLeft - trackRef.current.clientWidth / 2 + 60
      trackRef.current.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' })
    }
  }, [currentTier])

  function isClaimed(tier: number, track: 'free' | 'premium'): boolean {
    const key = track === 'premium' ? tier * 100 : tier
    return claimedTiers.includes(key)
  }

  function getReward(t: BattleTier): TierReward | null {
    return showPremium ? t.premiumReward : t.freeReward
  }

  function canClaim(t: BattleTier, track: 'free' | 'premium'): boolean {
    if (t.tier > currentTier) return false
    if (track === 'premium' && !isPremium) return false
    const reward = track === 'premium' ? t.premiumReward : t.freeReward
    if (!reward) return false
    return !isClaimed(t.tier, track)
  }

  return (
    <div>
      {/* Track toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowPremium(false)}
          className={`px-4 py-1.5 rounded text-sm font-semibold transition ${!showPremium ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
        >
          Free Track
        </button>
        <button
          onClick={() => setShowPremium(true)}
          className={`px-4 py-1.5 rounded text-sm font-semibold transition ${showPremium ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
        >
          Premium Track
        </button>
      </div>

      {/* Scrollable tier strip */}
      <div
        ref={trackRef}
        className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700"
        style={{ scrollbarWidth: 'thin' }}
      >
        {BATTLE_TIERS.map(t => {
          const reward = getReward(t)
          const unlocked = t.tier <= currentTier
          const isCurrent = t.tier === currentTier
          const claimed = reward ? isClaimed(t.tier, showPremium ? 'premium' : 'free') : false
          const claimable = reward ? canClaim(t, showPremium ? 'premium' : 'free') : false

          return (
            <div
              key={t.tier}
              ref={isCurrent ? currentRef : undefined}
              onClick={() => setSelectedTier(t)}
              className={`
                flex-shrink-0 w-[120px] rounded border p-3 cursor-pointer transition-all
                ${isCurrent
                  ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                  : unlocked
                    ? 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    : 'border-gray-700/50 bg-gray-800/50 opacity-50'
                }
              `}
            >
              {/* Tier number */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${isCurrent ? 'text-yellow-400' : unlocked ? 'text-white' : 'text-gray-500'}`}>
                  Tier {t.tier}
                </span>
                {claimed && <span className="text-green-400 text-xs">✓</span>}
                {!unlocked && <span className="text-gray-600 text-xs">🔒</span>}
              </div>

              {/* Reward */}
              {reward ? (
                <div className="text-center">
                  <div className="text-2xl mb-1">{REWARD_ICONS[reward.type] ?? '🎁'}</div>
                  <div className={`text-xs leading-tight ${unlocked ? 'text-gray-300' : 'text-gray-500'}`}>
                    {reward.name}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-2xl mb-1 opacity-30">—</div>
                  <div className="text-xs text-gray-600">No reward</div>
                </div>
              )}

              {/* XP requirement */}
              <div className="mt-2 text-[10px] text-gray-500 text-center">
                {t.xpRequired.toLocaleString()} XP
              </div>

              {/* Claim button */}
              {claimable && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClaim(t.tier, showPremium ? 'premium' : 'free') }}
                  className="mt-2 w-full py-1 text-xs font-semibold rounded bg-green-600 hover:bg-green-500 text-white transition"
                >
                  Claim
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected tier detail modal */}
      {selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTier(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-orbitron text-lg font-bold text-white">Tier {selectedTier.tier}</h3>
              <button onClick={() => setSelectedTier(null)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">{selectedTier.xpRequired.toLocaleString()} XP required</p>

            {selectedTier.freeReward && (
              <div className="mb-3 p-3 rounded border border-gray-700 bg-gray-800">
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Free Track</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{REWARD_ICONS[selectedTier.freeReward.type] ?? '🎁'}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{selectedTier.freeReward.name}</div>
                    <div className="text-xs text-gray-400">{selectedTier.freeReward.description}</div>
                  </div>
                </div>
              </div>
            )}

            {selectedTier.premiumReward && (
              <div className="p-3 rounded border border-yellow-500/30 bg-yellow-500/5">
                <div className="text-xs text-yellow-400 mb-1 uppercase tracking-wide">Premium Track</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{REWARD_ICONS[selectedTier.premiumReward.type] ?? '🎁'}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{selectedTier.premiumReward.name}</div>
                    <div className="text-xs text-gray-400">{selectedTier.premiumReward.description}</div>
                  </div>
                </div>
                {!isPremium && (
                  <div className="mt-2 text-xs text-yellow-500">Requires Premium Pass</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
