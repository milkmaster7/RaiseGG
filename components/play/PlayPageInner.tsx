'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { lobbyListSchema, breadcrumbSchema } from '@/lib/schemas'
import { MatchCard } from '@/components/matches/MatchCard'
import { CreateMatchModal } from '@/components/matches/CreateMatchModal'
import { JoinMatchModal } from '@/components/matches/JoinMatchModal'
import { Button } from '@/components/ui/Button'
import { ActiveCounter } from '@/components/ui/ActiveCounter'
import { Plus } from 'lucide-react'
import { FindMatchButton } from '@/components/matchmaking/FindMatchButton'
import { ChallengeLink } from '@/components/matches/ChallengeLink'
import { supabase } from '@/lib/supabase'
import type { Match, Game } from '@/types'
import { ActivitySidebar } from './ActivitySidebar'

const GAMES: { value: Game | 'all'; label: string }[] = [
  { value: 'all',      label: 'All Games' },
  { value: 'cs2',      label: 'CS2' },
  { value: 'dota2',    label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
]

const STAKE_FILTERS = [
  { value: 'all',   label: 'Any Stake' },
  { value: 'micro', label: '$1 – $5' },
  { value: 'low',   label: '$5 – $20' },
  { value: 'mid',   label: '$20 – $50' },
  { value: 'high',  label: '$50+' },
]

const REGION_FILTERS = [
  { value: 'all',       label: 'All Regions' },
  { value: 'Istanbul',  label: 'Istanbul' },
  { value: 'Bucharest', label: 'Bucharest' },
  { value: 'Tbilisi',   label: 'Tbilisi' },
]

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest' },
  { value: 'highest', label: 'Highest Stake' },
  { value: 'lowest',  label: 'Lowest Stake' },
]

interface PlayPageInnerProps {
  initialMatches?: Match[]
}

export function PlayPageInner({ initialMatches }: PlayPageInnerProps) {
  const searchParams  = useSearchParams()
  const joinMatchId   = searchParams.get('join')
  const gameParam     = searchParams.get('game') as Game | null
  const highlightRef  = useRef<HTMLDivElement>(null)

  const [matches, setMatches]         = useState<Match[]>(initialMatches ?? [])
  const [loading, setLoading]         = useState(!initialMatches || initialMatches.length === 0)
  const didInitRef = useRef(!!initialMatches && initialMatches.length > 0)
  const [gameFilter, setGameFilter]   = useState<Game | 'all'>(
    gameParam && ['cs2', 'dota2', 'deadlock'].includes(gameParam) ? gameParam : 'all'
  )
  const [stakeFilter, setStakeFilter]   = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [eloFilter, setEloFilter]       = useState(false)
  const [sortBy, setSortBy]             = useState('newest')
  const [playerElo, setPlayerElo]       = useState<number | null>(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [joinMatch, setJoinMatch]       = useState<Match | null>(null)
  const [playerId, setPlayerId]         = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.player?.id) {
        setPlayerId(d.player.id)
        // Use the highest ELO across games for range filtering
        const elos = [d.player.cs2_elo, d.player.dota2_elo, d.player.deadlock_elo].filter(Boolean).map(Number)
        if (elos.length > 0) setPlayerElo(Math.max(...elos))
      }
    })
  }, [])

  const lobbySchema = lobbyListSchema(matches.length)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Play',  url: 'https://raisegg.com/play' },
  ])

  const fetchLobbies = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status: 'open', limit: '50' })
    if (gameFilter !== 'all') params.set('game', gameFilter)
    const res = await fetch(`/api/matches?${params}`)
    const data = await res.json()
    setMatches(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [gameFilter])

  useEffect(() => {
    // Skip initial fetch if server-rendered data was provided
    if (didInitRef.current) {
      didInitRef.current = false
    } else {
      fetchLobbies()
    }

    const channel = supabase
      .channel('play-lobby')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          const newMatch = payload.new as Match
          // Prepend new open matches to the lobby list
          if (newMatch.status === 'open') {
            setMatches(prev => [newMatch, ...prev.filter(m => m.id !== newMatch.id)])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          const updated = payload.new as Match
          if (updated.status !== 'open') {
            // Remove matches that are no longer open (locked, in_progress, completed, etc.)
            setMatches(prev => prev.filter(m => m.id !== updated.id))
          } else {
            // Update the match in place if still open
            setMatches(prev => prev.map(m => m.id === updated.id ? updated : m))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'matches' },
        (payload) => {
          const deleted = payload.old as Partial<Match>
          if (deleted.id) {
            setMatches(prev => prev.filter(m => m.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLobbies])

  useEffect(() => {
    if (!loading && joinMatchId) {
      const target = matches.find((m) => m.id === joinMatchId && m.status === 'open')
      if (target && playerId && playerId !== target.player_a_id) {
        setJoinMatch(target)
      }
      if (highlightRef.current) {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [loading, joinMatchId, matches, playerId])

  const filtered = matches
    .filter((m) => {
      // Stake filter
      if (stakeFilter === 'micro') return m.stake_amount >= 1  && m.stake_amount < 5
      if (stakeFilter === 'low')   return m.stake_amount >= 5  && m.stake_amount < 20
      if (stakeFilter === 'mid')   return m.stake_amount >= 20 && m.stake_amount < 50
      if (stakeFilter === 'high')  return m.stake_amount >= 50
      return true
    })
    .filter((m) => {
      // Region filter
      if (regionFilter === 'all') return true
      return (m as any).region?.toLowerCase().includes(regionFilter.toLowerCase())
    })
    .filter((m) => {
      // ELO range filter — within +/- 300 of player ELO
      if (!eloFilter || !playerElo) return true
      const eloKey = `${m.game}_elo` as string
      const matchElo = (m as any).player_a?.[eloKey] as number | undefined
      if (!matchElo) return true
      return Math.abs(matchElo - playerElo) <= 300
    })
    .sort((a, b) => {
      if (sortBy === 'highest') return b.stake_amount - a.stake_amount
      if (sortBy === 'lowest')  return a.stake_amount - b.stake_amount
      // newest — sort by created_at descending
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    })

  return (
    <>
      {showCreate && playerId && (
        <CreateMatchModal playerId={playerId} onClose={() => setShowCreate(false)} />
      )}
      {joinMatch && playerId && (
        <JoinMatchModal match={joinMatch} playerId={playerId} onClose={() => setJoinMatch(null)} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lobbySchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-orbitron text-3xl font-black mb-1">
                  <span className="text-gradient">Open</span> Lobbies
                </h1>
                <p className="text-muted text-sm">{filtered.length} lobbies available</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <FindMatchButton />
                <ChallengeLink />
                <Button variant="primary" className="flex items-center gap-2" onClick={() => playerId ? setShowCreate(true) : (window.location.href = '/api/auth/steam')}>
                  <Plus className="w-4 h-4" /> Create Match
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="flex bg-space-800 rounded border border-border p-1 gap-1">
                {GAMES.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGameFilter(g.value as Game | 'all')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      gameFilter === g.value
                        ? 'bg-accent-cyan text-space-900'
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="flex bg-space-800 rounded border border-border p-1 gap-1">
                {STAKE_FILTERS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStakeFilter(s.value)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      stakeFilter === s.value
                        ? 'bg-accent-cyan text-space-900'
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex bg-space-800 rounded border border-border p-1 gap-1">
                {REGION_FILTERS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRegionFilter(r.value)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      regionFilter === r.value
                        ? 'bg-accent-cyan text-space-900'
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="flex bg-space-800 rounded border border-border p-1 gap-1">
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSortBy(s.value)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      sortBy === s.value
                        ? 'bg-accent-cyan text-space-900'
                        : 'text-muted hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {playerElo && (
                <button
                  onClick={() => setEloFilter(!eloFilter)}
                  className={`px-3 py-1.5 rounded border text-xs font-semibold transition-all ${
                    eloFilter
                      ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
                      : 'bg-space-800 border-border text-muted hover:text-white'
                  }`}
                >
                  My ELO Range
                </button>
              )}
            </div>

            {/* Lobby list */}
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="card h-16 animate-pulse bg-space-700" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="card text-center py-20">
                <p className="text-muted text-lg mb-2">No open lobbies right now.</p>
                <p className="text-muted text-sm mb-4">Be the first — create a match and wait for an opponent.</p>
                <div className="text-sm text-muted mb-6">
                  <ActiveCounter />
                </div>
                <Button variant="primary" onClick={() => playerId ? setShowCreate(true) : (window.location.href = '/api/auth/steam')}>Create Match</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((match) => {
                  const isTarget = match.id === joinMatchId
                  return (
                    <div
                      key={match.id}
                      ref={isTarget ? highlightRef : undefined}
                      className={isTarget ? 'ring-2 ring-accent-cyan rounded' : undefined}
                    >
                      <MatchCard match={match} showJoin onJoin={setJoinMatch} currentPlayerId={playerId} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Activity sidebar — hidden on mobile */}
          <ActivitySidebar />
        </div>
      </div>
    </>
  )
}
