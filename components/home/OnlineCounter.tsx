'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'

export function OnlineCounter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/online')
        const data = await res.json()
        setCount(data.online ?? 0)
      } catch {
        // Don't show anything if API fails
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <Users className="w-3.5 h-3.5 text-accent-cyan" />
      <span className="text-white font-semibold">{count}</span>
      <span className="text-muted">registered players</span>
    </div>
  )
}
