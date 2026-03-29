'use client'

import { useState, useEffect, useRef } from 'react'
import { DollarSign, TrendingUp } from 'lucide-react'

interface PayoutEntry {
  id: string
  username: string
  amount: number
  game: string
  timeAgo: string
}

interface PayoutStats {
  total24h: number
  totalAllTime: number
}

const GAME_LABELS: Record<string, string> = {
  cs2: 'CS2',
  dota2: 'Dota 2',
  deadlock: 'Deadlock',
}

export function PayoutTicker() {
  const [payouts, setPayouts] = useState<PayoutEntry[]>([])
  const [stats, setStats] = useState<PayoutStats>({ total24h: 0, totalAllTime: 0 })
  const tickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/payouts')
        const data = await res.json()
        setPayouts(data.payouts ?? [])
        setStats({ total24h: data.total24h ?? 0, totalAllTime: data.totalAllTime ?? 0 })
      } catch {
        // silent
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (payouts.length === 0) return null

  // Duplicate entries for seamless loop
  const tickerItems = [...payouts, ...payouts]

  return (
    <div className="w-full overflow-hidden border-y border-gray-700/50 bg-gray-900/80">
      {/* Scrolling ticker */}
      <div className="relative">
        <div
          ref={tickerRef}
          className="flex items-center gap-8 py-3 animate-ticker whitespace-nowrap"
          style={{
            animationDuration: `${Math.max(20, payouts.length * 4)}s`,
          }}
        >
          {tickerItems.map((p, i) => (
            <span key={`${p.id}-${i}`} className="inline-flex items-center gap-2 text-sm">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-white font-semibold">{p.username}</span>
              <span className="text-muted">won</span>
              <span className="text-emerald-400 font-bold">${p.amount.toFixed(2)}</span>
              <span className="text-muted">on {GAME_LABELS[p.game] ?? p.game}</span>
              <span className="text-gray-600">&bull;</span>
              <span className="text-gray-500 text-xs">{p.timeAgo}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="flex items-center justify-center gap-6 py-2 border-t border-gray-800 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          Last 24h: <span className="text-white font-semibold">${stats.total24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> paid out
        </span>
        <span className="text-gray-700">&bull;</span>
        <span>
          Total: <span className="text-white font-semibold">${stats.totalAllTime.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> all-time
        </span>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker linear infinite;
        }
      `}</style>
    </div>
  )
}
