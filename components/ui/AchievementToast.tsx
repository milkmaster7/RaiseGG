'use client'

import { useEffect, useState } from 'react'
import { ACHIEVEMENTS_MAP, RARITY_COLORS, type AchievementRarity } from '@/lib/achievements'

interface ToastItem {
  id: string
  name: string
  icon: string
  rarity: AchievementRarity
  visible: boolean
}

export function AchievementToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handleAchievement(e: CustomEvent<{ achievementId: string }>) {
      const achievement = ACHIEVEMENTS_MAP.get(e.detail.achievementId)
      if (!achievement) return
      const toast: ToastItem = {
        id: achievement.id + '_' + Date.now(),
        name: achievement.name,
        icon: achievement.icon,
        rarity: achievement.rarity,
        visible: false,
      }
      setToasts(prev => [...prev, toast])
      // Trigger entrance animation
      requestAnimationFrame(() => {
        setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, visible: true } : t))
      })
      // Auto-dismiss after 5s
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, visible: false } : t))
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
        }, 400)
      }, 5000)
    }

    window.addEventListener('achievement-unlocked', handleAchievement as EventListener)
    return () => window.removeEventListener('achievement-unlocked', handleAchievement as EventListener)
  }, [])

  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => {
          const colors = RARITY_COLORS[toast.rarity]
          const isSpecial = toast.rarity === 'epic' || toast.rarity === 'legendary'
          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg
                border ${colors.border} ${colors.bg} backdrop-blur-sm
                transition-all duration-400 ease-out
                ${toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                ${isSpecial ? 'achievement-toast-special' : ''}
                ${colors.glow ? `shadow-lg ${colors.glow}` : ''}
              `}
            >
              {/* Icon */}
              <span className="text-2xl flex-shrink-0">{toast.icon}</span>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Achievement Unlocked!
                </p>
                <p className={`text-sm font-bold ${colors.text}`}>{toast.name}</p>
              </div>
              {/* Sound icon (visual only) */}
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              {/* Sparkle particles for epic/legendary */}
              {isSpecial && (
                <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <span
                      key={i}
                      className="achievement-sparkle absolute w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: toast.rarity === 'legendary' ? '#fbbf24' : '#a78bfa',
                        left: `${15 + i * 15}%`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

    </>
  )
}

/** Dispatch an achievement unlock event */
export function triggerAchievementToast(achievementId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('achievement-unlocked', { detail: { achievementId } })
    )
  }
}
