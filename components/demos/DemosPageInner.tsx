'use client'

import { useState, useEffect } from 'react'
import { Download, Film, Trophy, XCircle, Filter } from 'lucide-react'

type Demo = {
  id: string
  matchId: string
  game: string
  demoUrl: string | null
  fileSize: number | null
  duration: number | null
  createdAt: string
  won: boolean
  stake: number
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

function formatSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DemosPageInner() {
  const [demos, setDemos] = useState<Demo[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState<string>('')

  useEffect(() => {
    const params = gameFilter ? `?game=${gameFilter}` : ''
    fetch(`/api/demos${params}`)
      .then(r => r.ok ? r.json() : { demos: [] })
      .then(d => { setDemos(d.demos ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [gameFilter])

  if (loading) return <div className="card animate-pulse h-48" />

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-muted" />
        {['', 'cs2', 'dota2', 'deadlock'].map(g => (
          <button
            key={g}
            onClick={() => setGameFilter(g)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              gameFilter === g ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30' : 'bg-space-800 text-muted border border-border hover:text-white'
            }`}
          >
            {g ? GAME_LABELS[g] : 'All'}
          </button>
        ))}
      </div>

      {/* Demo List */}
      {demos.length === 0 ? (
        <div className="card text-center py-12">
          <Film className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted mb-2">No demos available yet.</p>
          <p className="text-muted text-xs">Play CS2 matches on RaiseGG servers to get automatic demo recordings.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {demos.map(demo => (
            <div key={demo.id} className="card flex items-center gap-4">
              <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                demo.won ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {demo.won ? <Trophy className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-semibold">
                  {GAME_LABELS[demo.game]} Match
                  {demo.stake > 0 && <span className="text-accent-cyan ml-2">${demo.stake}</span>}
                </div>
                <div className="text-xs text-muted">
                  {new Date(demo.createdAt).toLocaleDateString()} · {formatDuration(demo.duration)} · {formatSize(demo.fileSize)}
                </div>
              </div>
              {demo.demoUrl && (
                <a
                  href={demo.demoUrl}
                  download
                  className="p-2 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20 transition-colors flex-shrink-0"
                  title="Download Demo"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card mt-6">
        <h2 className="font-orbitron text-sm font-bold text-white mb-2">About Demos</h2>
        <ul className="space-y-1 text-muted text-xs">
          <li>• CS2 matches on RaiseGG servers are automatically recorded</li>
          <li>• Demos are stored for 90 days, then deleted</li>
          <li>• Use demos to review your plays, study opponents, or resolve disputes</li>
          <li>• Dota 2 and Deadlock demos are available via their respective replay systems</li>
        </ul>
      </div>
    </div>
  )
}
