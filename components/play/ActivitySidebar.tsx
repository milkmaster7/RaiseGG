'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Radio, Trophy, Users, Clock, Swords } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface WinEntry {
  id: string
  message: string
  game: string
  amount: number
  username: string
}

interface FriendOnline {
  id: string
  username: string
  avatar_url: string | null
  status: 'online' | 'in_match'
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function ActivitySidebar() {
  const [liveCount, setLiveCount] = useState(0)
  const [recentWins, setRecentWins] = useState<WinEntry[]>([])
  const [nextTournament, setNextTournament] = useState<{
    name: string
    id: string
    starts_at: string
  } | null>(null)
  const [countdown, setCountdown] = useState('')
  const [friends, setFriends] = useState<FriendOnline[]>([])
  const [loading, setLoading] = useState(true)
  const realtimeActive = useRef(false)

  const fetchData = useCallback(async () => {
    try {
      const [liveRes, tickerRes] = await Promise.all([
        fetch('/api/matches/live').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/win-ticker').then(r => r.ok ? r.json() : null).catch(() => null),
      ])

      if (liveRes) {
        const matches = Array.isArray(liveRes) ? liveRes : liveRes.matches
        setLiveCount(Array.isArray(matches) ? matches.length : 0)
      }

      if (Array.isArray(tickerRes)) {
        setRecentWins(tickerRes.slice(0, 5))
      }

      // Friends — attempt to fetch, gracefully handle if endpoint doesn't exist
      try {
        const friendsRes = await fetch('/api/friends/online')
        if (friendsRes.ok) {
          const friendsData = await friendsRes.json()
          setFriends(Array.isArray(friendsData) ? friendsData : friendsData.friends ?? [])
        }
      } catch {
        // no friends endpoint yet
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + reduced fallback polling (60s instead of 30s)
  useEffect(() => {
    fetchData()
    // Use 60s polling as fallback in case realtime connection drops
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Supabase Realtime subscription for match changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel('activity_matches')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
          },
          () => {
            // New match created — refetch live count and wins
            realtimeActive.current = true
            fetchData()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
          },
          () => {
            // Match updated (completed, etc.) — refetch data
            realtimeActive.current = true
            fetchData()
          }
        )
        .subscribe()
    } catch (_) {
      // Realtime not available — polling fallback already running
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchData])

  // Countdown timer for next tournament
  useEffect(() => {
    if (!nextTournament) return
    function updateCountdown() {
      if (!nextTournament) return
      const diff = new Date(nextTournament.starts_at).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('Starting now')
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [nextTournament])

  const GAME_LABELS: Record<string, string> = {
    cs2: 'CS2',
    dota2: 'Dota 2',
    deadlock: 'Deadlock',
  }

  return (
    <aside className="hidden md:block w-72 flex-shrink-0 space-y-4">
      {/* Live Now */}
      <div className="rounded bg-space-950 border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-red-400 animate-pulse" />
          <h3 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">
            Live Now
          </h3>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">
            {liveCount === 0 ? 'No active matches' : `${liveCount} active ${liveCount === 1 ? 'match' : 'matches'}`}
          </span>
          <Link
            href="/spectate"
            className="text-xs text-accent-cyan hover:underline font-semibold"
          >
            Spectate
          </Link>
        </div>
        {liveCount > 0 && (
          <div className="mt-2 h-1 rounded-full bg-space-800 overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full animate-pulse"
              style={{ width: `${Math.min(liveCount * 10, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Recent Wins */}
      <div className="rounded bg-space-950 border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">
            Recent Wins
          </h3>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-space-800 rounded animate-pulse" />
            ))}
          </div>
        ) : recentWins.length === 0 ? (
          <p className="text-xs text-muted">No recent wins to show.</p>
        ) : (
          <div className="space-y-2">
            {recentWins.map(win => (
              <div key={win.id} className="flex items-start gap-2">
                <Swords className="w-3 h-3 text-accent-cyan mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-white leading-tight truncate">
                    <Link
                      href={`/profile/${win.username}`}
                      className="font-semibold hover:text-accent-cyan transition-colors"
                    >
                      {win.username}
                    </Link>
                    {' '}won{' '}
                    <span className="text-green-400 font-semibold">${win.amount}</span>
                  </p>
                  <p className="text-[10px] text-muted">
                    {GAME_LABELS[win.game] ?? win.game}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Tournament */}
      {nextTournament && (
        <div className="rounded bg-space-950 border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-accent-purple" />
            <h3 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">
              Upcoming
            </h3>
          </div>
          <p className="text-sm text-white font-semibold mb-1 truncate">
            {nextTournament.name}
          </p>
          <p className="text-xs text-accent-cyan font-mono mb-2">{countdown}</p>
          <Link
            href={`/tournament/${nextTournament.id}`}
            className="text-xs text-accent-cyan hover:underline font-semibold"
          >
            View Details &rarr;
          </Link>
        </div>
      )}

      {/* Friends Online */}
      <div className="rounded bg-space-950 border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-green-400" />
          <h3 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">
            Friends Online
          </h3>
        </div>
        {friends.length === 0 ? (
          <p className="text-xs text-muted">
            Add friends to see them here.
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map(friend => (
              <Link
                key={friend.id}
                href={`/profile/${friend.username}`}
                className="flex items-center gap-2 group"
              >
                <div className="relative">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.username}
                      className="w-6 h-6 rounded-full border border-border"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-space-700 border border-border flex items-center justify-center text-[10px] text-muted">
                      ?
                    </div>
                  )}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-space-950 ${
                      friend.status === 'in_match' ? 'bg-yellow-400' : 'bg-green-400'
                    }`}
                  />
                </div>
                <span className="text-xs text-white group-hover:text-accent-cyan transition-colors truncate">
                  {friend.username}
                </span>
                {friend.status === 'in_match' && (
                  <span className="text-[10px] text-yellow-400 flex-shrink-0">In Match</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
