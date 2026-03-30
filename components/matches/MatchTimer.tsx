'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import type { Match } from '@/types'

interface MatchTimerProps {
  match: Match
  className?: string
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

export function MatchTimer({ match, className = '' }: MatchTimerProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Determine which deadline to show based on match status
  let deadline: string | null = null
  let label = ''

  if (match.status === 'open' && match.expires_at) {
    deadline = match.expires_at
    label = 'Expires in'
  } else if ((match.status === 'locked' || match.status === 'live') && match.resolve_deadline) {
    deadline = match.resolve_deadline
    label = 'Time limit'
  } else {
    return null
  }

  const deadlineMs = new Date(deadline).getTime()
  const timeLeft = deadlineMs - now
  const isExpired = timeLeft <= 0
  const isUrgent = timeLeft > 0 && timeLeft < 5 * 60 * 1000 // under 5 minutes

  return (
    <div
      className={`flex items-center gap-1 text-[10px] font-mono ${
        isExpired
          ? 'text-red-400'
          : isUrgent
            ? 'text-red-400 animate-pulse'
            : 'text-muted'
      } ${className}`}
    >
      <Clock className={`w-3 h-3 ${isUrgent ? 'text-red-400' : ''}`} />
      <span>
        {isExpired ? 'Expired' : `${label}: ${formatTimeLeft(timeLeft)}`}
      </span>
    </div>
  )
}
