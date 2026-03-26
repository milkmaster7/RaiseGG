'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MatchCard } from './MatchCard'
import type { Match } from '@/types'

export function LiveMatchFeed() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    async function fetchMatches() {
      const { data } = await supabase
        .from('matches')
        .select('*, player_a:players!player_a_id(*), player_b:players!player_b_id(*)')
        .in('status', ['open', 'locked', 'live'])
        .order('created_at', { ascending: false })
        .limit(10)

      setMatches((data as Match[]) ?? [])
      setLoading(false)
    }

    fetchMatches()

    // Real-time subscription via Supabase
    const channel = supabase
      .channel('live-matches')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
      }, () => {
        fetchMatches()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-16 animate-pulse bg-space-700" />
        ))}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-muted">No active matches right now.</p>
        <a href="/play" className="btn-primary mt-4 inline-block text-sm px-6 py-2">
          Create a Match
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} showJoin />
      ))}
    </div>
  )
}
