'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface TickerItem {
  id: string
  message: string
  game: string
  amount: number
  username: string
}

const SEED_MESSAGES: TickerItem[] = [
  { id: 's1', message: 'kerim_tr just won $45 on CS2',       game: 'CS2',    amount: 45,  username: 'kerim_tr' },
  { id: 's2', message: 'tbilisi_pro took $120 in Dota 2',    game: 'Dota 2', amount: 120, username: 'tbilisi_pro' },
  { id: 's3', message: 'danube_aim cleaned up $30 CS2',       game: 'CS2',    amount: 30,  username: 'danube_aim' },
  { id: 's4', message: 'baku_sniper won $55 on CS2',          game: 'CS2',    amount: 55,  username: 'baku_sniper' },
  { id: 's5', message: 'sofia_carry took $80 in Dota 2',      game: 'Dota 2', amount: 80,  username: 'sofia_carry' },
]

const TICKER_STYLE = `
@keyframes ticker {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
`

export default function LiveWinTicker() {
  const [items, setItems] = useState<TickerItem[]>(SEED_MESSAGES)
  const [usingSeed, setUsingSeed] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchWins = async () => {
    try {
      const res = await fetch('/api/win-ticker', { cache: 'no-store' })
      if (!res.ok) return
      const data: TickerItem[] = await res.json()
      if (data && data.length > 0) {
        setItems(data)
        setUsingSeed(false)
      }
    } catch {
      // keep current items on network error
    }
  }

  useEffect(() => {
    fetchWins()
    intervalRef.current = setInterval(fetchWins, 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const tickerText = items.map((item) => item.message).join('  ·  ')

  return (
    <>
      <style>{TICKER_STYLE}</style>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center bg-space-950/95 backdrop-blur border-t border-border"
        style={{ height: '36px' }}
      >
        {/* Left label */}
        <div className="flex items-center gap-1.5 px-3 shrink-0 border-r border-border h-full">
          <span
            className="inline-block w-2 h-2 rounded-full bg-red-500"
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          />
          <span className="font-orbitron text-xs font-bold text-accent-purple whitespace-nowrap">
            LIVE WINS
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden h-full relative">
          <div
            className="absolute inset-0 flex items-center"
            style={{ animation: 'ticker 30s linear infinite', whiteSpace: 'nowrap' }}
          >
            <span className="text-xs text-muted px-4">
              {tickerText}
              {/* Duplicate for seamless loop feel */}
              <span className="mx-8 text-border">·</span>
              {tickerText}
            </span>
          </div>
        </div>

        {/* Right link */}
        <div className="shrink-0 px-3 border-l border-border h-full flex items-center">
          <Link
            href="/feed"
            className="text-xs text-muted hover:text-accent-purple transition-colors duration-150 whitespace-nowrap font-sans"
          >
            View All →
          </Link>
        </div>
      </div>
    </>
  )
}
