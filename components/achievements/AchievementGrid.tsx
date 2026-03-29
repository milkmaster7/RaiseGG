'use client'

import { useState } from 'react'
import {
  ACHIEVEMENTS,
  RARITY_COLORS,
  getAchievementProgress,
  type Achievement,
  type AchievementRarity,
  type PlayerStats,
} from '@/lib/achievements'

interface UnlockedInfo {
  achievement_id: string
  earned_at: string
}

interface Props {
  unlockedMap: Record<string, UnlockedInfo>
  stats: PlayerStats | null
}

const RARITY_FILTERS: { label: string; value: AchievementRarity | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Common', value: 'common' },
  { label: 'Rare', value: 'rare' },
  { label: 'Epic', value: 'epic' },
  { label: 'Legendary', value: 'legendary' },
]

export default function AchievementGrid({ unlockedMap, stats }: Props) {
  const [filter, setFilter] = useState<AchievementRarity | 'all'>('all')
  const [selected, setSelected] = useState<Achievement | null>(null)

  const filtered = filter === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.rarity === filter)

  return (
    <div>
      {/* Rarity filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {RARITY_FILTERS.map(f => {
          const colors = f.value === 'all' ? null : RARITY_COLORS[f.value]
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition border ${
                filter === f.value
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                  : `bg-gray-800 text-muted border-gray-700 hover:text-white`
              }`}
            >
              {f.label}
              {colors && (
                <span className={`ml-1 inline-block w-2 h-2 rounded-full ${colors.bg} ${colors.border} border`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(achievement => {
          const unlocked = unlockedMap[achievement.id]
          const colors = RARITY_COLORS[achievement.rarity]
          const progress = stats && achievement.target
            ? getAchievementProgress(achievement, stats)
            : null

          return (
            <button
              key={achievement.id}
              onClick={() => setSelected(selected?.id === achievement.id ? null : achievement)}
              className={`
                relative rounded-lg border p-4 flex flex-col items-center text-center transition-all
                ${unlocked
                  ? `${colors.border} ${colors.bg} ${colors.glow ? `shadow-md ${colors.glow}` : ''} hover:scale-[1.02]`
                  : 'border-gray-700 bg-gray-800/30 opacity-60 hover:opacity-80'
                }
              `}
            >
              {/* Unlocked checkmark */}
              {unlocked && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <span className={`text-3xl mb-2 ${unlocked ? '' : 'grayscale'}`}>
                {unlocked ? achievement.icon : '?'}
              </span>

              {/* Name */}
              <h3 className={`text-xs font-bold mb-1 ${unlocked ? colors.text : 'text-gray-500'}`}>
                {achievement.name}
              </h3>

              {/* Rarity label */}
              <span className={`text-[10px] uppercase tracking-wider ${unlocked ? colors.text : 'text-gray-600'}`}>
                {achievement.rarity}
              </span>

              {/* Progress bar for progressive achievements */}
              {achievement.target && progress !== null && !unlocked && (
                <div className="w-full mt-2">
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{ width: `${(progress / achievement.target) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {progress}/{achievement.target}
                  </p>
                </div>
              )}

              {/* Unlock date */}
              {unlocked && (
                <p className="text-[10px] text-gray-500 mt-1">
                  {new Date(unlocked.earned_at).toLocaleDateString()}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div
            className={`bg-gray-900 border ${RARITY_COLORS[selected.rarity].border} rounded-xl p-6 max-w-sm mx-4 text-center`}
            onClick={e => e.stopPropagation()}
          >
            <span className="text-5xl block mb-3">{selected.icon}</span>
            <h3 className={`text-lg font-bold ${RARITY_COLORS[selected.rarity].text} mb-1`}>{selected.name}</h3>
            <span className={`text-xs uppercase tracking-wider ${RARITY_COLORS[selected.rarity].text}`}>
              {selected.rarity}
            </span>
            <p className="text-sm text-gray-400 mt-3">{selected.description}</p>
            {unlockedMap[selected.id] ? (
              <p className="text-xs text-green-400 mt-3">
                Unlocked on {new Date(unlockedMap[selected.id].earned_at).toLocaleDateString()}
              </p>
            ) : (
              <>
                {stats && selected.target && selected.progressKey && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${(getAchievementProgress(selected, stats) / selected.target) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getAchievementProgress(selected, stats)}/{selected.target}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-3">Not yet unlocked</p>
              </>
            )}
            <button onClick={() => setSelected(null)} className="mt-4 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-white transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
