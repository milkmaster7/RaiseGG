'use client'

import { useEffect, useState } from 'react'

async function measurePing(): Promise<number> {
  const samples: number[] = []
  for (let i = 0; i < 3; i++) {
    const t = performance.now()
    try {
      await fetch('/api/ping', { cache: 'no-store' })
    } catch {
      // ignore
    }
    samples.push(Math.round(performance.now() - t))
  }
  // Drop highest, average rest
  samples.sort((a, b) => a - b)
  const used = samples.slice(0, 2)
  return Math.round(used.reduce((a, b) => a + b, 0) / used.length)
}

export function usePing() {
  const [ping, setPing] = useState<number | null>(null)

  useEffect(() => {
    measurePing().then(setPing)
  }, [])

  return ping
}
