'use client'

import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

interface Winner {
  username: string
  flag: string
  game: string
  amount: number
  minutesAgo: number
}

const PLAYERS: { username: string; flag: string; game: string }[] = [
  { username: 'kara_yilan', flag: '\u{1F1F9}\u{1F1F7}', game: 'CS2' },
  { username: 'deagle_ace', flag: '\u{1F1EC}\u{1F1EA}', game: 'Dota 2' },
  { username: 'b1t_fan99', flag: '\u{1F1FA}\u{1F1E6}', game: 'CS2' },
  { username: '\u0441\u043E\u0444\u0442_\u0430\u0438\u043C', flag: '\u{1F1F7}\u{1F1FA}', game: 'Deadlock' },
  { username: 'clutch_bey', flag: '\u{1F1F9}\u{1F1F7}', game: 'CS2' },
  { username: 'navi_dream', flag: '\u{1F1F0}\u{1F1FF}', game: 'Dota 2' },
  { username: '\u0440\u0430\u0448_\u0431', flag: '\u{1F1F7}\u{1F1FA}', game: 'CS2' },
  { username: 'aimbot_ali', flag: '\u{1F1E6}\u{1F1FF}', game: 'CS2' },
  { username: 'headshot_iv', flag: '\u{1F1E7}\u{1F1EC}', game: 'CS2' },
  { username: 'spray_ctrl', flag: '\u{1F1F7}\u{1F1F8}', game: 'Dota 2' },
  { username: 'dota_king77', flag: '\u{1F1EC}\u{1F1EA}', game: 'Dota 2' },
  { username: 'mid_or_feed', flag: '\u{1F1F9}\u{1F1F7}', game: 'Deadlock' },
  { username: 'invoker_god', flag: '\u{1F1E6}\u{1F1F2}', game: 'Dota 2' },
  { username: 'carry_pls', flag: '\u{1F1F7}\u{1F1F4}', game: 'CS2' },
  { username: 'sniper_gg', flag: '\u{1F1F5}\u{1F1F1}', game: 'CS2' },
  { username: 'deadlock_1', flag: '\u{1F1F9}\u{1F1F7}', game: 'Deadlock' },
]

const AMOUNTS = [4, 9, 18, 36, 45, 90]

/** Simple seeded PRNG (mulberry32) for deterministic generation */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateEntries(): Winner[] {
  // Seed based on current 10-minute window so entries stay stable for 10 min
  const windowSeed = Math.floor(Date.now() / (10 * 60 * 1000))
  const rng = mulberry32(windowSeed)

  const count = 8 + Math.floor(rng() * 3) // 8-10 entries
  const shuffled = [...PLAYERS].sort(() => rng() - 0.5)
  const entries: Winner[] = []

  for (let i = 0; i < count; i++) {
    const player = shuffled[i % shuffled.length]
    entries.push({
      username: player.username,
      flag: player.flag,
      game: player.game,
      amount: AMOUNTS[Math.floor(rng() * AMOUNTS.length)],
      minutesAgo: 1 + Math.floor(rng() * 15),
    })
  }

  return entries
}

export function WinnersTicker() {
  const [entries, setEntries] = useState<Winner[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  // Generate entries on mount and refresh every 10 minutes
  useEffect(() => {
    setEntries(generateEntries())
    const interval = setInterval(() => {
      setEntries(generateEntries())
      setActiveIndex(0)
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Rotate entries every 4 seconds with fade
  useEffect(() => {
    if (entries.length === 0) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % entries.length)
        setVisible(true)
      }, 300)
    }, 4000)
    return () => clearInterval(interval)
  }, [entries])

  if (entries.length === 0) return null

  // On desktop show 2 entries, on mobile show 1
  const current = entries[activeIndex]
  const next = entries[(activeIndex + 1) % entries.length]

  return (
    <div className="w-full bg-space-800 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div
          className={`flex items-center justify-center gap-8 transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Entry 1 — always visible */}
          <WinnerEntry winner={current} />
          {/* Entry 2 — desktop only */}
          <div className="hidden md:flex items-center">
            <span className="text-gray-700 mr-8">&bull;</span>
            <WinnerEntry winner={next} />
          </div>
        </div>
      </div>
    </div>
  )
}

function WinnerEntry({ winner }: { winner: Winner }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span>{winner.flag}</span>
      <span className="text-white font-semibold">{winner.username}</span>
      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span className="text-muted">won</span>
      <span className="font-orbitron text-accent-cyan font-bold">
        ${winner.amount.toFixed(2)}
      </span>
      <span className="text-muted">in {winner.game}</span>
      <span className="text-gray-600">&mdash;</span>
      <span className="text-muted text-xs">{winner.minutesAgo}m ago</span>
    </span>
  )
}
