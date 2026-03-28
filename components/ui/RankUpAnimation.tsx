'use client'

import { useEffect, useState } from 'react'
import { getTier } from '@/lib/elo'

interface RankUpAnimationProps {
  show: boolean
  oldElo: number
  newElo: number
  newRank: string
  onComplete: () => void
}

// 8 burst particles at 45-degree intervals
const BURST_PARTICLES = [
  { tx: '0px',     ty: '-80px'  },
  { tx: '57px',    ty: '-57px'  },
  { tx: '80px',    ty: '0px'    },
  { tx: '57px',    ty: '57px'   },
  { tx: '0px',     ty: '80px'   },
  { tx: '-57px',   ty: '57px'   },
  { tx: '-80px',   ty: '0px'    },
  { tx: '-57px',   ty: '-57px'  },
]

export function RankUpAnimation({ show, oldElo, newElo, newRank, onComplete }: RankUpAnimationProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'done'>('done')

  const tier = getTier(newElo)

  useEffect(() => {
    if (!show) {
      setPhase('done')
      return
    }

    setPhase('in')

    // After entrance animation (450ms), hold
    const holdTimer = setTimeout(() => setPhase('hold'), 450)

    // After 3 seconds total, start exit
    const outTimer = setTimeout(() => setPhase('out'), 3000)

    // After exit animation (400ms), call onComplete
    const doneTimer = setTimeout(() => {
      setPhase('done')
      onComplete()
    }, 3400)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(outTimer)
      clearTimeout(doneTimer)
    }
  }, [show, onComplete])

  if (phase === 'done') return null

  const cardClass =
    phase === 'out' ? 'animate-rankup-out' : 'animate-rankup-in'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => { setPhase('out'); setTimeout(() => { setPhase('done'); onComplete() }, 400) }}
      role="dialog"
      aria-modal="true"
      aria-label="Rank up notification"
    >
      {/* Card */}
      <div
        className={`relative bg-space-800 border-2 rounded-lg p-10 text-center max-w-sm w-full mx-4 shadow-2xl ${cardClass}`}
        style={{ borderColor: tier.color, boxShadow: `0 0 40px ${tier.color}40, 0 0 80px ${tier.color}20` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Burst particles — absolute, centered in card */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-lg">
          {BURST_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full animate-burst"
              style={{
                '--tx': p.tx,
                '--ty': p.ty,
                backgroundColor: tier.color,
                animationDelay: `${i * 40}ms`,
                animationDuration: '0.8s',
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* RANK UP heading */}
        <div
          className="font-orbitron text-5xl font-black mb-2 animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${tier.color}, #ffffff)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          RANK UP!
        </div>

        {/* Rank name */}
        <div
          className="font-orbitron text-2xl font-bold mb-6 tracking-widest uppercase"
          style={{ color: tier.color }}
        >
          {newRank}
        </div>

        {/* ELO transition */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="text-center">
            <div className="font-orbitron text-xl font-bold text-muted">{oldElo}</div>
            <div className="text-xs text-muted uppercase tracking-wider mt-0.5">Old ELO</div>
          </div>

          <div className="flex flex-col items-center gap-0.5 px-2">
            <div className="text-2xl text-white">→</div>
            <div
              className="font-orbitron text-xs font-bold"
              style={{ color: tier.color }}
            >
              +{newElo - oldElo}
            </div>
          </div>

          <div className="text-center">
            <div
              className="font-orbitron text-xl font-bold"
              style={{ color: tier.color }}
            >
              {newElo}
            </div>
            <div className="text-xs text-muted uppercase tracking-wider mt-0.5">New ELO</div>
          </div>
        </div>

        {/* Dismiss hint */}
        <p className="text-xs text-muted">Click anywhere to dismiss</p>
      </div>
    </div>
  )
}
