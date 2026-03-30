'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

type Game = 'cs2' | 'dota2' | 'deadlock'

function calcEstWait(queueSize: number): number {
  return Math.max(15, 120 - (queueSize * 10))
}

export function FindMatchButton() {
  const [open, setOpen] = useState(false)
  const [inQueue, setInQueue] = useState(false)
  const [queueSize, setQueueSize] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [searching, setSearching] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [form, setForm] = useState({ game: 'cs2' as Game, mode: 'stake' as 'stake' | 'free', stakeAmount: 10, currency: 'usdc' as 'usdc' | 'usdt' })
  const matchSoundPlayed = useRef(false)

  // Poll queue status
  useEffect(() => {
    if (!inQueue) return
    matchSoundPlayed.current = false
    const interval = setInterval(async () => {
      const res = await fetch('/api/matchmaking')
      const data = await res.json()
      setQueueSize(data.queueSize ?? 0)
      if (data.position !== undefined) setQueuePosition(data.position)
      if (!data.inQueue) {
        // Match found — play notification sound
        if (!matchSoundPlayed.current) {
          matchSoundPlayed.current = true
          new Audio('/match-found.mp3').play().catch(() => {})
        }
        setInQueue(false)
        setOpen(false)
        window.location.reload()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [inQueue])

  // Timer
  useEffect(() => {
    if (!inQueue) { setElapsed(0); return }
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [inQueue])

  async function startSearch() {
    setSearching(true)
    try {
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.match) {
        // Instant match found
        window.location.href = `/play?join=${data.match.id}`
      } else {
        setInQueue(true)
      }
    } finally {
      setSearching(false)
    }
  }

  async function cancelSearch() {
    await fetch('/api/matchmaking', { method: 'DELETE' })
    setInQueue(false)
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (inQueue) {
    return (
      <div className="card border-accent-cyan/30 text-center py-6">
        <Loader2 className="w-8 h-8 text-accent-cyan mx-auto mb-3 animate-spin" />
        <div className="font-orbitron text-lg font-bold text-white mb-1">Finding Match...</div>
        <div className="text-sm text-muted mb-1">{form.game.toUpperCase()} · {form.mode === 'free' ? 'Free Play' : `$${form.stakeAmount}`}</div>
        <div className="font-orbitron text-accent-cyan text-sm mb-3">{formatTime(elapsed)}</div>
        <div className="text-xs text-muted mb-1">{queueSize} player{queueSize !== 1 ? 's' : ''} in queue</div>
        {queuePosition !== null && (
          <div className="text-xs text-accent-purple mb-1">Queue position: #{queuePosition}</div>
        )}
        <div className="text-xs text-muted/70 mb-4">Est. wait: ~{calcEstWait(queueSize)}s</div>
        <button onClick={cancelSearch} className="btn-secondary px-6 py-2 text-sm">
          <X className="w-4 h-4 mr-1 inline" /> Cancel
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary px-6 py-3 text-sm flex items-center gap-2">
        <Search className="w-4 h-4" /> Find Match
      </button>
    )
  }

  return (
    <div className="card max-w-sm">
      <h3 className="font-orbitron text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-accent-cyan" /> Quick Match
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-1 block">Game</label>
          <select
            value={form.game}
            onChange={e => setForm(prev => ({ ...prev, game: e.target.value as Game }))}
            className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50"
          >
            <option value="cs2">CS2</option>
            <option value="dota2">Dota 2</option>
            <option value="deadlock">Deadlock</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-1 block">Mode</label>
          <div className="flex gap-2">
            {(['stake', 'free'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setForm(prev => ({ ...prev, mode }))}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  form.mode === mode ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30' : 'bg-space-800 text-muted border border-border'
                }`}
              >
                {mode === 'stake' ? 'Stake' : 'Free Play'}
              </button>
            ))}
          </div>
        </div>
        {form.mode === 'stake' && (
          <>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-1 block">Stake Amount</label>
              <select
                value={form.stakeAmount}
                onChange={e => setForm(prev => ({ ...prev, stakeAmount: Number(e.target.value) }))}
                className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50"
              >
                {[2, 5, 10, 25, 50, 100].map(v => (
                  <option key={v} value={v}>${v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-1 block">Currency</label>
              <div className="flex gap-2">
                {(['usdc', 'usdt'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(prev => ({ ...prev, currency: c }))}
                    className={`flex-1 py-2 rounded text-xs font-semibold uppercase transition-colors ${
                      form.currency === c ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30' : 'bg-space-800 text-muted border border-border'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={startSearch} disabled={searching} className="btn-primary flex-1 py-2.5 text-sm">
            {searching ? 'Searching...' : 'Find Match'}
          </button>
          <button onClick={() => setOpen(false)} className="btn-secondary px-4 py-2.5 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  )
}
