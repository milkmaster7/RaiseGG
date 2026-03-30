'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Download, Film, Trophy, Clock, Map, Users, Crosshair, Target,
  Skull, AlertTriangle, Flag, Bookmark, Share2, X, ChevronDown, ChevronUp,
} from 'lucide-react'

type Player = {
  id: string
  username: string
  avatarUrl: string | null
  elo: number | null
}

type DemoDetail = {
  id: string
  matchId: string
  game: string
  map: string | null
  demoUrl: string | null
  fileSize: number | null
  duration: number | null
  createdAt: string
  match: {
    id: string
    status: string
    stakeAmount: number
    scoreA: number | null
    scoreB: number | null
    winnerId: string | null
    resolvedAt: string | null
    playerA: Player | null
    playerB: Player | null
  } | null
}

type RoundData = {
  round: number
  winner: 'T' | 'CT'
  scoreA: number
  scoreB: number
  duration: number
  wonByA: boolean
}

type Highlight = {
  id: string
  round: number
  description: string
  createdAt: number
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

const REPORT_REASONS = [
  { value: 'suspicious_play', label: 'Suspicious Play' },
  { value: 'possible_aimbot', label: 'Possible Aimbot' },
  { value: 'wallhack_suspect', label: 'Wallhack Suspect' },
  { value: 'other', label: 'Other' },
] as const

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

/** Generate mock round data from match score */
function generateRoundData(scoreA: number, scoreB: number): RoundData[] {
  const totalRounds = scoreA + scoreB
  const rounds: RoundData[] = []
  let runA = 0
  let runB = 0

  // Distribute wins semi-randomly but matching final score
  const aWins = new Set<number>()
  const indices = Array.from({ length: totalRounds }, (_, i) => i)

  // Deterministic shuffle based on scores
  let seed = scoreA * 17 + scoreB * 31
  for (let i = indices.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const j = seed % (i + 1)
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  for (let i = 0; i < scoreA; i++) {
    aWins.add(indices[i])
  }

  for (let i = 0; i < totalRounds; i++) {
    const wonByA = aWins.has(i)
    if (wonByA) runA++
    else runB++

    // CS2-style: first 12 rounds one side, then swap
    const isFirstHalf = i < 12
    const winner: 'T' | 'CT' = wonByA
      ? (isFirstHalf ? 'T' : 'CT')
      : (isFirstHalf ? 'CT' : 'T')

    // Mock duration: 60-175 seconds per round
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const duration = 60 + (seed % 116)

    rounds.push({
      round: i + 1,
      winner,
      scoreA: runA,
      scoreB: runB,
      duration,
      wonByA,
    })
  }
  return rounds
}

// Placeholder stats
const PLACEHOLDER_STATS = [
  { label: 'Kills', playerA: '--', playerB: '--', icon: Crosshair },
  { label: 'Deaths', playerA: '--', playerB: '--', icon: Skull },
  { label: 'Headshot %', playerA: '--', playerB: '--', icon: Target },
  { label: 'ADR', playerA: '--', playerB: '--', icon: Target },
]

export function DemoDetailInner({ demoId }: { demoId: string }) {
  const [demo, setDemo] = useState<DemoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Round timeline
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [hoveredRound, setHoveredRound] = useState<number | null>(null)
  const [expandedRound, setExpandedRound] = useState<number | null>(null)

  // Report form
  const [reportRound, setReportRound] = useState<number | null>(null)
  const [reportReason, setReportReason] = useState<string>('suspicious_play')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  // Highlights
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [newHighlightRound, setNewHighlightRound] = useState('')
  const [newHighlightDesc, setNewHighlightDesc] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/demos/${demoId}`)
      .then(r => {
        if (!r.ok) throw new Error('Demo not found')
        return r.json()
      })
      .then(setDemo)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [demoId])

  // Load highlights from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`raisegg_highlights_${demoId}`)
      if (stored) setHighlights(JSON.parse(stored))
    } catch {}
  }, [demoId])

  const saveHighlights = useCallback((updated: Highlight[]) => {
    setHighlights(updated)
    try {
      localStorage.setItem(`raisegg_highlights_${demoId}`, JSON.stringify(updated))
    } catch {}
  }, [demoId])

  const addHighlight = () => {
    const round = parseInt(newHighlightRound)
    if (!round || round < 1 || !newHighlightDesc.trim()) return
    const hl: Highlight = {
      id: crypto.randomUUID(),
      round,
      description: newHighlightDesc.trim(),
      createdAt: Date.now(),
    }
    saveHighlights([...highlights, hl])
    setNewHighlightRound('')
    setNewHighlightDesc('')
  }

  const removeHighlight = (id: string) => {
    saveHighlights(highlights.filter(h => h.id !== id))
  }

  const shareHighlight = async (hl: Highlight) => {
    const url = `${window.location.origin}/demos/${demoId}?round=${hl.round}&t=${hl.createdAt}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(hl.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }

  const submitReport = async () => {
    if (!reportRound) return
    setReportSubmitting(true)
    setReportError(null)
    setReportSuccess(null)

    try {
      const res = await fetch(`/api/demos/${demoId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: reportRound,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit report')
      }

      setReportSuccess(`Round ${reportRound} reported successfully.`)
      setReportDetails('')
      setTimeout(() => {
        setReportRound(null)
        setReportSuccess(null)
      }, 2000)
    } catch (e: any) {
      setReportError(e.message)
    } finally {
      setReportSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card animate-pulse h-32" />
        <div className="card animate-pulse h-48" />
        <div className="card animate-pulse h-64" />
      </div>
    )
  }

  if (error || !demo) {
    return (
      <div className="card text-center py-12">
        <Film className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-white font-semibold mb-2">Demo Not Found</p>
        <p className="text-muted text-sm mb-4">{error ?? 'This demo may have expired or been deleted.'}</p>
        <Link href="/demos" className="btn-secondary px-6 py-2 text-sm">Browse Demos</Link>
      </div>
    )
  }

  const match = demo.match
  const playerA = match?.playerA
  const playerB = match?.playerB
  const isAWinner = match?.winnerId === playerA?.id
  const isBWinner = match?.winnerId === playerB?.id

  const hasScore = match?.scoreA != null && match?.scoreB != null
  const rounds = hasScore ? generateRoundData(match!.scoreA!, match!.scoreB!) : []
  const totalRounds = rounds.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-orbitron text-3xl font-black text-gradient mb-2">Match Demo</h1>
        <p className="text-muted text-sm">
          {GAME_LABELS[demo.game] ?? demo.game} match recorded on{' '}
          {new Date(demo.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Match Metadata */}
      <div className="card">
        <h2 className="font-orbitron text-lg font-bold text-white mb-4">Match Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-accent-cyan flex-shrink-0" />
            <div>
              <div className="text-xs text-muted">Map</div>
              <div className="text-white text-sm font-semibold">{demo.map ?? 'Unknown'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-cyan flex-shrink-0" />
            <div>
              <div className="text-xs text-muted">Duration</div>
              <div className="text-white text-sm font-semibold">{formatDuration(demo.duration)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-muted">Score</div>
              <div className="text-white text-sm font-semibold">
                {hasScore ? `${match!.scoreA} - ${match!.scoreB}` : '--'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-accent-cyan flex-shrink-0" />
            <div>
              <div className="text-xs text-muted">File Size</div>
              <div className="text-white text-sm font-semibold">{formatSize(demo.fileSize)}</div>
            </div>
          </div>
        </div>
        {match?.stakeAmount != null && match.stakeAmount > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-muted text-xs">Stake: </span>
            <span className="text-accent-cyan font-semibold">${match.stakeAmount} USDC</span>
          </div>
        )}
      </div>

      {/* Players */}
      {(playerA || playerB) && (
        <div className="card">
          <h2 className="font-orbitron text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-cyan" /> Players
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {playerA && (
              <div className={`rounded-lg p-4 border ${isAWinner ? 'bg-green-500/5 border-green-500/30' : 'bg-space-800 border-border'}`}>
                <div className="flex items-center gap-3 mb-2">
                  {playerA.avatarUrl ? (
                    <img src={playerA.avatarUrl} alt={playerA.username} className="w-10 h-10 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-space-700 flex items-center justify-center text-muted text-sm font-bold">
                      {playerA.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <Link href={`/profile/${playerA.username}`} className="text-white font-semibold text-sm hover:text-accent-cyan transition-colors">
                      {playerA.username}
                    </Link>
                    {playerA.elo != null && (
                      <div className="text-muted text-xs">ELO: {playerA.elo}</div>
                    )}
                  </div>
                  {isAWinner && <Trophy className="w-4 h-4 text-green-400 ml-auto" />}
                </div>
                {match?.scoreA != null && (
                  <div className="text-center mt-2">
                    <span className={`font-orbitron text-2xl font-black ${isAWinner ? 'text-green-400' : 'text-red-400'}`}>
                      {match.scoreA}
                    </span>
                    <span className="text-muted text-xs ml-1">rounds</span>
                  </div>
                )}
              </div>
            )}
            {playerB && (
              <div className={`rounded-lg p-4 border ${isBWinner ? 'bg-green-500/5 border-green-500/30' : 'bg-space-800 border-border'}`}>
                <div className="flex items-center gap-3 mb-2">
                  {playerB.avatarUrl ? (
                    <img src={playerB.avatarUrl} alt={playerB.username} className="w-10 h-10 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-space-700 flex items-center justify-center text-muted text-sm font-bold">
                      {playerB.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <Link href={`/profile/${playerB.username}`} className="text-white font-semibold text-sm hover:text-accent-cyan transition-colors">
                      {playerB.username}
                    </Link>
                    {playerB.elo != null && (
                      <div className="text-muted text-xs">ELO: {playerB.elo}</div>
                    )}
                  </div>
                  {isBWinner && <Trophy className="w-4 h-4 text-green-400 ml-auto" />}
                </div>
                {match?.scoreB != null && (
                  <div className="text-center mt-2">
                    <span className={`font-orbitron text-2xl font-black ${isBWinner ? 'text-green-400' : 'text-red-400'}`}>
                      {match.scoreB}
                    </span>
                    <span className="text-muted text-xs ml-1">rounds</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player Stats Comparison (placeholder) */}
      <div className="card">
        <h2 className="font-orbitron text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-accent-cyan" /> Player Stats
        </h2>
        <p className="text-muted text-xs mb-4">
          Demo parsing coming soon. Stats will be extracted from .dem files automatically.
        </p>
        <div className="space-y-2">
          {PLACEHOLDER_STATS.map(({ label, playerA: a, playerB: b, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="w-20 text-right text-white text-sm font-mono">{a}</div>
              <div className="flex-1 flex items-center justify-center gap-2">
                <Icon className="w-3.5 h-3.5 text-muted" />
                <span className="text-muted text-xs font-semibold">{label}</span>
              </div>
              <div className="w-20 text-left text-white text-sm font-mono">{b}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== ROUND TIMELINE ===== */}
      {totalRounds > 0 && (
        <div className="card">
          <h2 className="font-orbitron text-lg font-bold text-white mb-4">Round Timeline</h2>

          {/* Visual timeline bar */}
          <div ref={timelineRef} className="relative mb-2">
            <div className="flex gap-0.5 h-10">
              {rounds.map((r) => {
                const isSelected = selectedRound === r.round
                const isHovered = hoveredRound === r.round
                const bgColor = r.wonByA
                  ? 'bg-green-500'
                  : 'bg-red-500'

                return (
                  <div
                    key={r.round}
                    className="relative flex-1"
                    onMouseEnter={() => setHoveredRound(r.round)}
                    onMouseLeave={() => setHoveredRound(null)}
                  >
                    <button
                      onClick={() => setSelectedRound(isSelected ? null : r.round)}
                      className={`w-full h-full rounded-sm transition-all ${bgColor} ${
                        isSelected
                          ? 'opacity-100 ring-2 ring-accent-cyan scale-y-110'
                          : isHovered
                          ? 'opacity-80'
                          : 'opacity-50 hover:opacity-70'
                      }`}
                      aria-label={`Round ${r.round}: ${r.scoreA}-${r.scoreB}`}
                    />

                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                        <div className="bg-space-800 border border-border rounded px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg">
                          <div className="text-white font-semibold">Round {r.round}</div>
                          <div className="text-muted">
                            {r.scoreA} - {r.scoreB} ({r.winner})
                          </div>
                          <div className="text-muted">{formatDuration(r.duration)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Half-time marker */}
            {totalRounds > 12 && (
              <div
                className="absolute top-0 h-full w-px bg-accent-cyan/40"
                style={{ left: `${(12 / totalRounds) * 100}%` }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-accent-cyan font-semibold">
                  Half
                </span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-500 opacity-60" />
              <span>{playerA?.username ?? 'Player A'} won</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500 opacity-60" />
              <span>{playerB?.username ?? 'Player B'} won</span>
            </div>
          </div>

          {/* Selected round actions */}
          {selectedRound && (
            <div className="bg-space-800 rounded-lg border border-border p-3 mb-4 flex items-center justify-between">
              <div>
                <span className="text-white font-semibold text-sm">Round {selectedRound}</span>
                <span className="text-muted text-xs ml-2">
                  {rounds[selectedRound - 1]?.scoreA}-{rounds[selectedRound - 1]?.scoreB}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReportRound(selectedRound)
                    setReportError(null)
                    setReportSuccess(null)
                  }}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" /> Report
                </button>
                <button
                  onClick={() => {
                    setNewHighlightRound(String(selectedRound))
                    document.getElementById('highlight-desc')?.focus()
                  }}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" /> Mark Highlight
                </button>
              </div>
            </div>
          )}

          {/* ===== ROUND-BY-ROUND STATS TABLE ===== */}
          <h3 className="text-white font-semibold text-sm mb-3">Round-by-Round</h3>

          {/* Table header */}
          <div className="grid grid-cols-[60px_70px_80px_80px_40px] sm:grid-cols-[80px_80px_100px_100px_50px] gap-2 text-xs text-muted font-semibold border-b border-border pb-2 mb-1">
            <div>Round</div>
            <div>Winner</div>
            <div>Score</div>
            <div>Duration</div>
            <div />
          </div>

          {/* Table rows */}
          <div className="max-h-[400px] overflow-y-auto space-y-0">
            {rounds.map((r) => (
              <div key={r.round}>
                <button
                  onClick={() => setExpandedRound(expandedRound === r.round ? null : r.round)}
                  className={`w-full grid grid-cols-[60px_70px_80px_80px_40px] sm:grid-cols-[80px_80px_100px_100px_50px] gap-2 py-2 text-xs items-center border-b border-border/50 hover:bg-space-800/50 transition-colors ${
                    selectedRound === r.round ? 'bg-accent-cyan/5' : ''
                  }`}
                >
                  <div className="text-white font-mono">{r.round}</div>
                  <div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      r.winner === 'T'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {r.winner}
                    </span>
                  </div>
                  <div className="text-white font-mono">{r.scoreA} - {r.scoreB}</div>
                  <div className="text-muted">{formatDuration(r.duration)}</div>
                  <div className="text-muted">
                    {expandedRound === r.round ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                {/* Expanded row */}
                {expandedRound === r.round && (
                  <div className="bg-space-800/30 border-b border-border/50 px-4 py-3 text-xs text-muted">
                    <p>Per-player stats will be available once demo parsing is implemented.</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          setReportRound(r.round)
                          setReportError(null)
                          setReportSuccess(null)
                        }}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      >
                        <Flag className="w-3 h-3" /> Report Round
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== CLIP TIMESTAMPS / HIGHLIGHTS ===== */}
      {totalRounds > 0 && (
        <div className="card">
          <h2 className="font-orbitron text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-accent-cyan" /> Highlight Markers
          </h2>
          <p className="text-muted text-xs mb-4">
            Mark rounds with highlights. Saved locally in your browser.
          </p>

          {/* Add highlight form */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="number"
              min="1"
              max={totalRounds}
              placeholder="Round #"
              value={newHighlightRound}
              onChange={(e) => setNewHighlightRound(e.target.value)}
              className="w-24 bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent-cyan focus:outline-none"
            />
            <input
              id="highlight-desc"
              type="text"
              placeholder="Description (e.g. insane ace, clutch 1v3)"
              value={newHighlightDesc}
              onChange={(e) => setNewHighlightDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHighlight()}
              className="flex-1 bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent-cyan focus:outline-none"
            />
            <button
              onClick={addHighlight}
              disabled={!newHighlightRound || !newHighlightDesc.trim()}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Highlight list */}
          {highlights.length > 0 ? (
            <div className="space-y-2">
              {highlights
                .sort((a, b) => a.round - b.round)
                .map((hl) => (
                  <div
                    key={hl.id}
                    className="flex items-center justify-between bg-space-800 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-accent-cyan font-mono text-sm font-bold shrink-0">
                        R{hl.round}
                      </span>
                      <span className="text-white text-sm truncate">{hl.description}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => shareHighlight(hl)}
                        className="text-muted hover:text-accent-cyan transition-colors p-1"
                        title="Copy share link"
                      >
                        {copiedId === hl.id ? (
                          <span className="text-green-400 text-xs font-semibold">Copied</span>
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => removeHighlight(hl.id)}
                        className="text-muted hover:text-red-400 transition-colors p-1"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-muted text-xs text-center py-4">
              No highlights marked yet. Select a round or use the form above.
            </p>
          )}
        </div>
      )}

      {/* ===== REPORT ROUND MODAL ===== */}
      {reportRound !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full relative animate-slide-up">
            <button
              onClick={() => setReportRound(null)}
              className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-orbitron text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-400" /> Report Round {reportRound}
            </h3>
            <p className="text-muted text-xs mb-4">
              Flag suspicious behavior in this round for review.
            </p>

            {reportSuccess ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm text-center">
                {reportSuccess}
              </div>
            ) : (
              <>
                <label className="block text-sm text-muted mb-1.5">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none mb-3 appearance-none"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <label className="block text-sm text-muted mb-1.5">Details (optional)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe what you observed..."
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent-cyan focus:outline-none resize-none mb-3"
                />

                {reportError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-red-400 text-xs mb-3">
                    {reportError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setReportRound(null)}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={reportSubmitting}
                    className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {reportSubmitting ? (
                      <span className="animate-pulse">Submitting...</span>
                    ) : (
                      <>
                        <Flag className="w-4 h-4" /> Submit Report
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {demo.demoUrl && (
          <a
            href={`/api/demos/${demo.id}?download=true`}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Demo ({formatSize(demo.fileSize)})
          </a>
        )}
        {match && (
          <Link
            href={`/support?type=dispute&match=${match.id}`}
            className="btn-secondary flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Raise Dispute
          </Link>
        )}
      </div>
    </div>
  )
}
