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
import { supabase } from '@/lib/supabase'
import type { Match, Game } from '@/types'

const GAMES: { value: Game | 'all'; label: string }[] = [
  { value: 'all',      label: 'All Games' },
  { value: 'cs2',      label: 'CS2' },
  { value: 'dota2',    label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
]

const STAKE_FILTERS = [
  { value: 'all',   label: 'Any Stake' },
  { value: 'low',   label: '$1 – $10' },
  { value: 'mid',   label: '$10 – $50' },
  { value: 'high',  label: '$50+' },
]

export function PlayPageInner() {
  const searchParams  = useSearchParams()
  const joinMatchId   = searchParams.get('join')
  const gameParam     = searchParams.get('game') as Game | null
  const highlightRef  = useRef<HTMLDivElement>(null)

  const [matches, setMatches]         = useState<Match[]>([])
  const [loading, setLoading]         = useState(true)
  const [gameFilter, setGameFilter]   = useState<Game | 'all'>(
    gameParam && ['cs2', 'dota2', 'deadlock'].includes(gameParam) ? gameParam : 'all'
  )
  const [stakeFilter, setStakeFilter] = useState('all')
  const [showCreate, setShowCreate]     = useState(false)
  const [joinMatch, setJoinMatch]       = useState<Match | null>(null)
  const [playerId, setPlayerId]         = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d?.player?.id && setPlayerId(d.player.id))
  }, [])

  const lobbySchema = lobbyListSchema(matches.length)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Play',  url: 'https://raisegg.gg/play' },
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
    fetchLobbies()

    const channel = supabase
      .channel('play-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchLobbies()
      })
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

  const filtered = matches.filter((m) => {
    if (stakeFilter === 'low')  return m.stake_amount >= 1  && m.stake_amount < 10
    if (stakeFilter === 'mid')  return m.stake_amount >= 10 && m.stake_amount < 50
    if (stakeFilter === 'high') return m.stake_amount >= 50
    return true
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-orbitron text-3xl font-black mb-1">
              <span className="text-gradient">Open</span> Lobbies
            </h1>
            <p className="text-muted text-sm">{filtered.length} lobbies available</p>
          </div>
          <Button variant="primary" className="flex items-center gap-2" onClick={() => playerId ? setShowCreate(true) : (window.location.href = '/api/auth/steam')}>
            <Plus className="w-4 h-4" /> Create Match
          </Button>
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
    </>
  )
}
