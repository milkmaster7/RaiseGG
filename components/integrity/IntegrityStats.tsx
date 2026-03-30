'use client'

import { useState, useEffect } from 'react'
import { Shield, Film, Scale, CheckCircle } from 'lucide-react'

type Stats = {
  total: { vacBans: number; demosRecorded: number; disputesResolved: number; matchesVerified: number }
  monthly: { cheatersBanned: number; demosReviewed: number; disputesResolved: number }
}

const STAT_CARDS = [
  { key: 'vacBans', label: 'VAC Bans Detected', icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
  { key: 'demosRecorded', label: 'Demos Recorded', icon: Film, color: 'text-accent-cyan', bgColor: 'bg-accent-cyan/10 border-accent-cyan/30' },
  { key: 'disputesResolved', label: 'Disputes Resolved', icon: Scale, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  { key: 'matchesVerified', label: 'Matches Verified', icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30' },
] as const

export function IntegrityStats() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/integrity/stats')
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Live Stats */}
      <div>
        <h2 className="font-orbitron text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live Platform Stats
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bgColor }) => (
            <div key={key} className="card text-center">
              <div className={`w-8 h-8 rounded border ${bgColor} flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="font-orbitron text-2xl font-black text-white">
                {stats.total[key as keyof typeof stats.total].toLocaleString()}
              </div>
              <div className="text-muted text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Transparency Report */}
      <div className="card border-accent-cyan/20">
        <h2 className="font-orbitron text-lg font-bold text-white mb-4">
          Monthly Transparency Report
        </h2>
        <p className="text-muted text-sm mb-4">
          Updated in real time. This month&apos;s enforcement activity:
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="font-orbitron text-xl font-bold text-red-400">
              {stats.monthly.cheatersBanned}
            </div>
            <div className="text-muted text-xs">Cheaters Banned</div>
          </div>
          <div className="text-center">
            <div className="font-orbitron text-xl font-bold text-accent-cyan">
              {stats.monthly.demosReviewed}
            </div>
            <div className="text-muted text-xs">Demos Reviewed</div>
          </div>
          <div className="text-center">
            <div className="font-orbitron text-xl font-bold text-yellow-400">
              {stats.monthly.disputesResolved}
            </div>
            <div className="text-muted text-xs">Disputes Resolved</div>
          </div>
        </div>
      </div>
    </div>
  )
}
