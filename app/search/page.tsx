'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/schemas'
import { TierBadge } from '@/components/ui/Badge'
import { Search } from 'lucide-react'

type PlayerResult = {
  username:     string
  avatar_url:   string | null
  cs2_elo:      number
  dota2_elo:    number
  deadlock_elo: number
  cs2_wins:     number
  cs2_losses:   number
  country:      string | null
}

export default function SearchPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: 'https://raisegg.com' },
    { name: 'Search', url: 'https://raisegg.com/search' },
  ])

  const [query, setQuery]     = useState('')
  const [players, setPlayers] = useState<PlayerResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setPlayers([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setPlayers(data.players ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-4xl font-black mb-8 text-gradient">Search</h1>

        {/* Search input */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="search"
            autoFocus
            placeholder="Search players by username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Results */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="card h-16 animate-pulse bg-space-700" />)}
          </div>
        )}

        {!loading && query.length >= 2 && players.length === 0 && (
          <div className="card text-center py-12 text-muted text-sm">
            No players found for "{query}"
          </div>
        )}

        {!loading && players.length > 0 && (
          <div className="space-y-2">
            {players.map((p) => {
              const total = p.cs2_wins + p.cs2_losses
              const wr = total > 0 ? Math.round((p.cs2_wins / total) * 100) : 0
              return (
                <Link key={p.username} href={`/profile/${p.username}`} className="card-hover flex items-center gap-4 block">
                  {p.avatar_url && (
                    <img src={p.avatar_url} alt={p.username} className="w-10 h-10 rounded-full border border-border flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-orbitron font-bold text-white">{p.username}</span>
                      {p.country && <span className="text-xs text-muted">{p.country}</span>}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {p.cs2_wins}W {p.cs2_losses}L · {wr}% win rate
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <TierBadge elo={p.cs2_elo} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {!query && (
          <div className="text-center py-12 text-muted text-sm">
            Type a username to find players.
          </div>
        )}
      </div>
    </>
  )
}
