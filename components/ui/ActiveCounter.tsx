'use client'
import { useState, useEffect } from 'react'

export function ActiveCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/players/active-count').then(r => r.json()).then(d => setCount(d.count))
    const t = setInterval(() => {
      fetch('/api/players/active-count').then(r => r.json()).then(d => setCount(d.count))
    }, 60000)
    return () => clearInterval(t)
  }, [])

  if (count === null) return <span>Active Players</span>
  return <span>{count > 0 ? `${count} active today` : 'Active Players'}</span>
}
