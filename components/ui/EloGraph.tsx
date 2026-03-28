'use client'

type Point = { elo: number; recorded_at: string }

export function EloGraph({ points, width = 300, height = 60 }: { points: Point[]; width?: number; height?: number }) {
  if (!points || points.length < 2) return (
    <div className="flex items-center justify-center text-xs text-muted" style={{ height }}>Not enough data yet</div>
  )
  const elos = points.map(p => p.elo)
  const min = Math.min(...elos)
  const max = Math.max(...elos)
  const range = max - min || 1
  const pad = 4
  const w = width - pad * 2
  const h = height - pad * 2

  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * w,
    y: pad + (1 - (p.elo - min) / range) * h,
  }))

  const polyPoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const last = coords[coords.length - 1]
  const trending = elos[elos.length - 1] >= elos[0]
  const color = trending ? '#22c55e' : '#ef4444'

  // gradient fill path
  const fillPath = `M${coords[0].x},${height} ` + coords.map(c => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') + ` L${last.x},${height} Z`

  const gradId = `grad-${Math.random().toString(36).slice(2)}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <polyline points={polyPoints} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3" fill={color} />
    </svg>
  )
}
