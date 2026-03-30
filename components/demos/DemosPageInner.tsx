'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Download, Film, Trophy, XCircle, Filter, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react'

type Demo = {
  id: string
  matchId: string
  game: string
  map: string | null
  demoUrl?: string | null
  fileSize: number | null
  duration: number | null
  createdAt: string
  won?: boolean
  stake: number
  // Browse mode fields
  playerA?: { id: string; username: string; avatarUrl: string | null } | null
  playerB?: { id: string; username: string; avatarUrl: string | null } | null
  scoreA?: number | null
  scoreB?: number | null
  winnerId?: string | null
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

function formatSize(bytes: number | null) {
  if (!bytes) return '--'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DemosPageInner() {
  const [demos, setDemos] = useState<Demo[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState<string>('')
  const [playerSearch, setPlayerSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 30

  const fetchDemos = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ browse: 'true', page: String(page) })
    if (gameFilter) params.set('game', gameFilter)
    if (playerSearch) params.set('player', playerSearch)

    fetch(`/api/demos?${params}`)
      .then(r => r.ok ? r.json() : { demos: [], total: 0 })
      .then(d => {
        setDemos(d.demos ?? [])
        setTotal(d.total ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [gameFilter, playerSearch, page])

  useEffect(() => { fetchDemos() }, [fetchDemos])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setPlayerSearch(searchInput)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by player name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-space-800 border border-border text-white text-sm placeholder:text-muted focus:border-accent-cyan/50 focus:outline-none transition-colors"
          />
        </div>
        <button type="submit" className="btn-secondary px-4 py-2 text-sm">
          Search
        </button>
      </form>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-muted" />
        {['', 'cs2', 'dota2', 'deadlock'].map(g => (
          <button
            key={g}
            onClick={() => { setGameFilter(g); setPage(1) }}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              gameFilter === g ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30' : 'bg-space-800 text-muted border border-border hover:text-white'
            }`}
          >
            {g ? GAME_LABELS[g] : 'All'}
          </button>
        ))}
      </div>

      {/* Demo List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="card animate-pulse h-16" />)}
        </div>
      ) : demos.length === 0 ? (
        <div className="card text-center py-12">
          <Film className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted mb-2">No demos found.</p>
          <p className="text-muted text-xs">Play CS2 matches on RaiseGG servers to get automatic demo recordings.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {demos.map(demo => (
            <Link
              key={demo.id}
              href={`/demos/${demo.id}`}
              className="card flex items-center gap-4 hover:border-accent-cyan/50 transition-colors group"
            >
              {/* Result indicator */}
              <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                demo.won !== undefined
                  ? demo.won ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                  : 'bg-accent-cyan/10 border border-accent-cyan/30'
              }`}>
                {demo.won !== undefined ? (
                  demo.won ? <Trophy className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Film className="w-5 h-5 text-accent-cyan" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-semibold flex items-center gap-2">
                  {GAME_LABELS[demo.game]} Match
                  {demo.map && <span className="text-muted text-xs font-normal">{demo.map}</span>}
                  {demo.stake > 0 && <span className="text-accent-cyan text-xs">${demo.stake}</span>}
                </div>
                <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
                  <span>{new Date(demo.createdAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{formatDuration(demo.duration)}</span>
                  <span>·</span>
                  <span>{formatSize(demo.fileSize)}</span>
                  {demo.playerA && demo.playerB && (
                    <>
                      <span>·</span>
                      <span>
                        {demo.playerA.username} vs {demo.playerB.username}
                      </span>
                    </>
                  )}
                  {demo.scoreA != null && demo.scoreB != null && (
                    <>
                      <span>·</span>
                      <span className="text-white font-semibold">{demo.scoreA}-{demo.scoreB}</span>
                    </>
                  )}
                </div>
              </div>

              {/* View */}
              <div className="p-2 rounded bg-space-700 text-muted group-hover:bg-accent-cyan/10 group-hover:text-accent-cyan transition-colors flex-shrink-0">
                <Eye className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded bg-space-800 border border-border text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-muted text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded bg-space-800 border border-border text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info */}
      <div className="card mt-6">
        <h2 className="font-orbitron text-sm font-bold text-white mb-2">About Demos</h2>
        <ul className="space-y-1 text-muted text-xs">
          <li>CS2 matches on RaiseGG servers are automatically recorded via GOTV</li>
          <li>Demos are stored for 90 days, then deleted</li>
          <li>Click any demo to view match details, player stats, and download the .dem file</li>
          <li>Use demos to review your plays, study opponents, or resolve disputes</li>
          <li>Dota 2 and Deadlock replays are available via their respective replay systems</li>
        </ul>
      </div>
    </div>
  )
}
