'use client'

import { Trophy, Swords, Users, Shield, DollarSign, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ClanStats {
  totalWins: number
  memberCount: number
  longestWinStreak: number
  totalEarnings: number
  createdAt: string
}

interface Props {
  stats: ClanStats
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  check: (stats: ClanStats) => boolean
  progress: (stats: ClanStats) => { current: number; target: number }
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Win your first clan war',
    icon: Swords,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    check: (s) => s.totalWins >= 1,
    progress: (s) => ({ current: Math.min(s.totalWins, 1), target: 1 }),
  },
  {
    id: 'war_machine',
    name: 'War Machine',
    description: 'Win 10 clan wars',
    icon: Trophy,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    check: (s) => s.totalWins >= 10,
    progress: (s) => ({ current: Math.min(s.totalWins, 10), target: 10 }),
  },
  {
    id: 'full_roster',
    name: 'Full Roster',
    description: 'Have 10 or more members',
    icon: Users,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    check: (s) => s.memberCount >= 10,
    progress: (s) => ({ current: Math.min(s.memberCount, 10), target: 10 }),
  },
  {
    id: 'undefeated',
    name: 'Undefeated',
    description: 'Win 5 clan wars in a row',
    icon: Shield,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    check: (s) => s.longestWinStreak >= 5,
    progress: (s) => ({ current: Math.min(s.longestWinStreak, 5), target: 5 }),
  },
  {
    id: 'treasury',
    name: 'Treasury',
    description: 'Earn $100 or more in total',
    icon: DollarSign,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    check: (s) => s.totalEarnings >= 100,
    progress: (s) => ({ current: Math.min(s.totalEarnings, 100), target: 100 }),
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Clan active for 30 or more days',
    icon: Clock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    check: (s) => {
      const days = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 86400000)
      return days >= 30
    },
    progress: (s) => {
      const days = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 86400000)
      return { current: Math.min(days, 30), target: 30 }
    },
  },
]

export default function ClanAchievements({ stats }: Props) {
  const unlockedCount = ACHIEVEMENTS.filter(a => a.check(stats)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent-purple" />
          <h3 className="text-lg font-orbitron font-bold text-white">Achievements</h3>
        </div>
        <span className="text-sm text-muted">
          {unlockedCount}/{ACHIEVEMENTS.length} unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACHIEVEMENTS.map(achievement => {
          const unlocked = achievement.check(stats)
          const { current, target } = achievement.progress(stats)
          const pct = Math.min(100, (current / target) * 100)
          const Icon = achievement.icon

          return (
            <div
              key={achievement.id}
              className={`rounded-xl border p-4 transition-all ${
                unlocked
                  ? `${achievement.bgColor} ${achievement.borderColor}`
                  : 'bg-space-800 border-border opacity-60'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  unlocked ? achievement.bgColor : 'bg-space-700'
                }`}>
                  <Icon className={`w-5 h-5 ${unlocked ? achievement.color : 'text-muted'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${unlocked ? 'text-white' : 'text-muted'}`}>
                    {achievement.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{achievement.description}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-space-600 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    unlocked ? 'bg-accent-cyan' : 'bg-muted/40'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted mt-1 text-right">
                {current}/{target}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
