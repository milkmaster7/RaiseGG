'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trophy, Bell, BellOff, Clock } from 'lucide-react'
import Link from 'next/link'

interface NextTournament {
  id: string
  name: string
  game: string
  prizePool: number
  startsAt: string
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
const GAME_COLORS: Record<string, string> = { cs2: 'text-cyan-400', dota2: 'text-red-400', deadlock: 'text-purple-400' }

export function DashboardTournamentCountdown() {
  const [tournament, setTournament] = useState<NextTournament | null>(null)
  const [countdown, setCountdown] = useState('')
  const [reminded, setReminded] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchNext = useCallback(async () => {
    try {
      const res = await fetch('/api/tournaments?status=registration&limit=1&sort=starts_at')
      if (!res.ok) return
      const data = await res.json()
      const list = data.tournaments ?? data ?? []
      if (list.length > 0) {
        const t = list[0]
        setTournament({
          id: t.id,
          name: t.name,
          game: t.game,
          prizePool: Number(t.prize_pool ?? t.prizePool ?? 0),
          startsAt: t.starts_at ?? t.startsAt,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNext()
  }, [fetchNext])

  // Check localStorage for reminder
  useEffect(() => {
    if (!tournament) return
    const stored = localStorage.getItem(`rgg_remind_${tournament.id}`)
    if (stored) setReminded(true)
  }, [tournament])

  // Countdown ticker
  useEffect(() => {
    if (!tournament) return

    function update() {
      const diff = new Date(tournament!.startsAt).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('Starting now!')
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)

      if (d > 0) setCountdown(`${d}d ${h}h ${m}m`)
      else if (h > 0) setCountdown(`${h}h ${m}m ${s}s`)
      else setCountdown(`${m}m ${s}s`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [tournament])

  function toggleReminder() {
    if (!tournament) return
    const key = `rgg_remind_${tournament.id}`
    if (reminded) {
      localStorage.removeItem(key)
      setReminded(false)
    } else {
      localStorage.setItem(key, 'true')
      setReminded(true)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-space-800 border border-border p-4 animate-pulse h-28" />
    )
  }

  if (!tournament) {
    return (
      <div className="rounded-xl bg-space-800 border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-muted" />
          <span className="text-xs font-medium text-muted">Next Tournament</span>
        </div>
        <p className="text-sm text-muted">No upcoming tournaments</p>
      </div>
    )
  }

  const gameColor = GAME_COLORS[tournament.game] ?? 'text-white'

  return (
    <div className="rounded-xl bg-space-800 border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs font-medium text-muted">Next Tournament</span>
        </div>
        <button
          onClick={toggleReminder}
          className={`p-1.5 rounded-md transition-colors ${
            reminded
              ? 'bg-accent-cyan/10 text-accent-cyan'
              : 'hover:bg-space-700 text-muted hover:text-white'
          }`}
          title={reminded ? 'Remove reminder' : 'Remind me'}
        >
          {reminded ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      <p className="font-orbitron text-xl font-bold text-white mb-1">{countdown}</p>

      <Link
        href={`/tournaments/${tournament.id}`}
        className="block group"
      >
        <p className="text-sm font-semibold text-white group-hover:text-accent-cyan transition-colors truncate">
          {tournament.name}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
          <span className={gameColor}>{GAME_LABELS[tournament.game] ?? tournament.game}</span>
          <span className="flex items-center gap-1 text-accent-gold">
            <Trophy className="w-3 h-3" /> ${tournament.prizePool.toFixed(0)} Prize Pool
          </span>
        </div>
      </Link>
    </div>
  )
}
