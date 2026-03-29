'use client'

import { useEffect, useState } from 'react'
import AchievementGrid from '@/components/achievements/AchievementGrid'
import { ACHIEVEMENTS, RARITY_COLORS, type AchievementRarity, type PlayerStats } from '@/lib/achievements'
import { triggerAchievementToast } from '@/components/ui/AchievementToast'

interface UnlockedInfo {
  achievement_id: string
  earned_at: string
}

interface AchievementData {
  unlocked: UnlockedInfo[]
  stats: PlayerStats | null
  newlyUnlocked: string[]
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/achievements')
        if (res.ok) {
          const json: AchievementData = await res.json()
          setData(json)
          // Trigger toasts for newly unlocked
          if (json.newlyUnlocked?.length) {
            json.newlyUnlocked.forEach((id, i) => {
              setTimeout(() => triggerAchievementToast(id), i * 800)
            })
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-64" />
          <div className="h-4 bg-gray-800 rounded w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-36 bg-gray-800 rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  const unlockedMap: Record<string, UnlockedInfo> = {}
  data?.unlocked?.forEach(u => { unlockedMap[u.achievement_id] = u })

  const unlockedCount = data?.unlocked?.length ?? 0
  const totalCount = ACHIEVEMENTS.length

  // Rarity breakdown
  const rarityBreakdown = (['common', 'rare', 'epic', 'legendary'] as AchievementRarity[]).map(r => {
    const total = ACHIEVEMENTS.filter(a => a.rarity === r).length
    const unlocked = ACHIEVEMENTS.filter(a => a.rarity === r && unlockedMap[a.id]).length
    return { rarity: r, total, unlocked }
  })

  // Recent unlocks (sorted by earned_at desc)
  const recentUnlocks = [...(data?.unlocked ?? [])]
    .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
    .slice(0, 5)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Achievements</h1>
      <p className="text-muted mb-6">Track your progress and unlock rewards.</p>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-5 py-3 text-center">
          <div className="font-orbitron text-2xl font-bold text-white">{unlockedCount}/{totalCount}</div>
          <div className="text-xs text-muted uppercase tracking-wider">Unlocked</div>
        </div>
        {rarityBreakdown.map(r => {
          const colors = RARITY_COLORS[r.rarity]
          return (
            <div key={r.rarity} className={`bg-gray-800/50 border ${colors.border}/30 rounded-lg px-5 py-3 text-center`}>
              <div className={`font-orbitron text-lg font-bold ${colors.text}`}>
                {r.unlocked}/{r.total}
              </div>
              <div className={`text-xs uppercase tracking-wider ${colors.text} opacity-70`}>
                {r.rarity}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent unlocks */}
      {recentUnlocks.length > 0 && (
        <div className="mb-8">
          <h2 className="font-orbitron text-lg font-bold text-white mb-3">Recent Unlocks</h2>
          <div className="flex gap-3 flex-wrap">
            {recentUnlocks.map(u => {
              const achievement = ACHIEVEMENTS.find(a => a.id === u.achievement_id)
              if (!achievement) return null
              const colors = RARITY_COLORS[achievement.rarity]
              return (
                <div key={u.achievement_id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.border} ${colors.bg}`}>
                  <span className="text-xl">{achievement.icon}</span>
                  <div>
                    <p className={`text-xs font-bold ${colors.text}`}>{achievement.name}</p>
                    <p className="text-[10px] text-gray-500">{new Date(u.earned_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Achievement Grid */}
      <AchievementGrid unlockedMap={unlockedMap} stats={data?.stats ?? null} />
    </div>
  )
}
