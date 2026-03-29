'use client'

import { useState, useEffect } from 'react'

interface Props {
  startsAt: string
  isLive: boolean
  isCompleted: boolean
}

export function TournamentCountdown({ startsAt, isLive, isCompleted }: Props) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (isLive || isCompleted) return

    function update() {
      const diff = new Date(startsAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Starting...')
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)

      if (d > 0) setRemaining(`${d}d ${h}h`)
      else if (h > 0) setRemaining(`${h}h ${m}m`)
      else setRemaining(`${m}m ${s}s`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startsAt, isLive, isCompleted])

  if (isCompleted) return <span>Finished</span>
  if (isLive) return <span className="text-green-400">In Progress</span>
  return <span>{remaining}</span>
}
