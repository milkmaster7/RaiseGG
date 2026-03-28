'use client'
import { useState, useEffect } from 'react'
import { EloGraph } from './EloGraph'

type Point = { elo: number; recorded_at: string }

export function EloTrendWidget({ playerId }: { playerId: string }) {
  const [points, setPoints] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/player/elo-history?game=cs2')
      .then(r => r.json())
      .then(d => setPoints(d.points ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [playerId])

  if (loading) {
    return <div className="h-15 flex items-center justify-center text-xs text-muted">Loading…</div>
  }

  return <EloGraph points={points} width={600} height={60} />
}
