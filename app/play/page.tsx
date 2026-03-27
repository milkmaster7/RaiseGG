'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { lobbyListSchema, breadcrumbSchema } from '@/lib/schemas'
import { MatchCard } from '@/components/matches/MatchCard'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
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

export default function PlayPage() {
  const searchParams  = useSearchParams()
  const joinMatchId   = searchParams.get('join')
  const highlightRef  = useRef<HTMLDivElement>(null)

  const [matches, setMatches]         = useState<Match[]>([])
  const [loading, setLoading]         = useState(true)
  const [gameFilter, setGameFilter]   = useState<Game | 'all'>('all')
  const [stakeFilter, setStakeFilter] = useState('all')

  const lobbySchema = lobbyListSchema(matches.length)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Play',  url: 'https://raisegg.gg/play' },
  ])

  useEffect(() => {
    async function fetchLobbies() {
      setLoading(true)
      const params = new URLSearchParams({ status: 'open', limit: '50' })
      if (gameFilter !== 'all') params.set('game', gameFilter)
      const res = await fetch(`/api/matches?${params}`)
      const data = await res.json()
      setMatches(data ?? [])
      setLoading(false)
    }
    fetchLobbies()
  }, [gameFilter])

  // Scroll to and highlight the match linked via ?join=
  useEffect(() => {
    if (!loading && joinMatchId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading, joinMatchId])

  const filtered = matches.filter((m) => {
    if (stakeFilter === 'low')  return m.stake_amount >= 1  && m.stake_amount < 10
    if (stakeFilter === 'mid')  return m.stake_amount >= 10 && m.stake_amount < 50
    if (stakeFilter === 'high') return m.stake_amount >= 50
    return true
  })

  return (
    <>
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
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Match
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Game filter */}
          <div className="flex bg-space-800 rounded border border-border p-1 gap-1">
            {GAMES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGameFilter(g.value as Game | 'all')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  gameFilter === g.value
                    ? 'bg-accent-purple text-white'
                    : 'text-muted hover:text-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Stake filter */}
          <div className="flex bg-space-800 rounded border border-border p-1 gap-1">
            {STAKE_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStakeFilter(s.value)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  stakeFilter === s.value
                    ? 'bg-accent-purple text-white'
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
            <p className="text-muted text-sm mb-6">Be the first — create a match and wait for an opponent.</p>
            <Button variant="primary">Create Match</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((match) => {
              const isTarget = match.id === joinMatchId
              return (
                <div
                  key={match.id}
                  ref={isTarget ? highlightRef : undefined}
                  className={isTarget ? 'ring-2 ring-accent-purple rounded' : undefined}
                >
                  <MatchCard match={match} showJoin />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
