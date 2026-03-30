'use client'

import { useState, useEffect } from 'react'
import { Zap, TrendingUp, Percent, Clock, Calendar, Sparkles } from 'lucide-react'

interface EventData {
  id: string
  name: string
  type: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  endsAt?: string
}

interface UpcomingEventData extends EventData {
  startsAt: string
}

const EVENT_ICONS: Record<string, typeof Zap> = {
  double_elo: TrendingUp,
  reduced_rake: Percent,
  bonus_xp: Sparkles,
  happy_hour: Zap,
}

function useCountdown(targetDate: string | undefined) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!targetDate) return

    function update() {
      const diff = new Date(targetDate!).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Ended')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 0) {
        setTimeLeft(`${h}h ${m}m ${s}s`)
      } else {
        setTimeLeft(`${m}m ${s}s`)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

function ActiveEventBanner({ event }: { event: EventData }) {
  const Icon = EVENT_ICONS[event.type] ?? Zap
  const countdown = useCountdown(event.endsAt)

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${event.borderColor} ${event.bgColor}`}>
      <div className={`shrink-0 w-10 h-10 rounded-lg ${event.bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${event.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-orbitron text-sm font-bold ${event.color}`}>{event.name}</div>
        <div className="text-xs text-muted">{event.description}</div>
      </div>
      {countdown && (
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted">Ends in</div>
          <div className={`font-orbitron text-sm font-bold ${event.color}`}>{countdown}</div>
        </div>
      )}
    </div>
  )
}

function UpcomingEventRow({ event }: { event: UpcomingEventData }) {
  const Icon = EVENT_ICONS[event.type] ?? Zap
  const countdown = useCountdown(event.startsAt)

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className={`w-4 h-4 ${event.color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white">{event.name}</span>
      </div>
      <div className="shrink-0 text-xs text-muted">
        <Clock className="w-3 h-3 inline mr-1" />
        {countdown}
      </div>
    </div>
  )
}

export function ActiveEvents() {
  const [active, setActive] = useState<EventData[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingEventData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/events')
        const data = await res.json()
        setActive(data.active ?? [])
        setUpcoming(data.upcoming ?? [])
      } catch (_) {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
    // Refresh every 60 seconds
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return null
  if (active.length === 0 && upcoming.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Active Events */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map(event => (
            <ActiveEventBanner key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <div className="card">
          <h3 className="text-xs text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Upcoming Events
          </h3>
          <div className="divide-y divide-gray-700/50">
            {upcoming.slice(0, 5).map(event => (
              <UpcomingEventRow key={`${event.id}-${event.startsAt}`} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
