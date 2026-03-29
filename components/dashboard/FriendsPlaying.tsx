'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Friend {
  friendshipId: string
  id: string
  username: string
  avatar_url: string | null
  country: string | null
}

interface FriendWithStatus extends Friend {
  status: 'online' | 'in_match' | 'looking'
}

export default function FriendsPlaying() {
  const [friends, setFriends] = useState<FriendWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [invitingId, setInvitingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFriends() {
      try {
        // Get friend list from our API
        const res = await fetch('/api/friends')
        if (!res.ok) return
        const data = await res.json()
        const accepted: Friend[] = data.friends ?? []

        if (accepted.length === 0) {
          setFriends([])
          return
        }

        // Check which friends are online today or in matches
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const friendIds = accepted.map((f) => f.id)
        const todayStart = new Date()
        todayStart.setUTCHours(0, 0, 0, 0)

        // Get active matches for friends
        const { data: activeMatches } = await supabase
          .from('matches')
          .select('player_a_id, player_b_id, status')
          .in('status', ['open', 'locked', 'live'])
          .or(
            friendIds.map((id) => `player_a_id.eq.${id}`).join(',') +
              ',' +
              friendIds.map((id) => `player_b_id.eq.${id}`).join(',')
          )

        const inMatchIds = new Set<string>()
        const lookingIds = new Set<string>()
        for (const m of activeMatches ?? []) {
          if (m.status === 'live') {
            if (friendIds.includes(m.player_a_id)) inMatchIds.add(m.player_a_id)
            if (m.player_b_id && friendIds.includes(m.player_b_id)) inMatchIds.add(m.player_b_id)
          } else {
            // open or locked = looking
            if (friendIds.includes(m.player_a_id)) lookingIds.add(m.player_a_id)
            if (m.player_b_id && friendIds.includes(m.player_b_id)) lookingIds.add(m.player_b_id)
          }
        }

        // Get friends who logged in today
        const { data: onlinePlayers } = await supabase
          .from('players')
          .select('id')
          .in('id', friendIds)
          .gte('last_login_date', todayStart.toISOString())

        const onlineIds = new Set((onlinePlayers ?? []).map((p) => p.id))

        // Combine: only show friends who are online/in match/looking
        const result: FriendWithStatus[] = accepted
          .filter((f) => inMatchIds.has(f.id) || lookingIds.has(f.id) || onlineIds.has(f.id))
          .map((f) => ({
            ...f,
            status: inMatchIds.has(f.id)
              ? 'in_match' as const
              : lookingIds.has(f.id)
              ? 'looking' as const
              : 'online' as const,
          }))
          // Sort: in_match first, then looking, then online
          .sort((a, b) => {
            const order = { in_match: 0, looking: 1, online: 2 }
            return order[a.status] - order[b.status]
          })

        setFriends(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchFriends()
    // Poll every 30 seconds
    const interval = setInterval(fetchFriends, 30000)
    return () => clearInterval(interval)
  }, [])

  async function inviteToMatch(friendId: string) {
    setInvitingId(friendId)
    try {
      const res = await fetch('/api/match-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_player_id: friendId, game: 'cs2' }),
      })
      if (res.ok) {
        setInvitedIds(prev => new Set(prev).add(friendId))
      }
    } finally {
      setInvitingId(null)
    }
  }

  const statusConfig = {
    online: { icon: '\u{1F7E2}', label: 'Online', color: 'text-green-400' },
    in_match: { icon: '\u2694\uFE0F', label: 'In Match', color: 'text-red-400' },
    looking: { icon: '\u{1F3AE}', label: 'Looking for Match', color: 'text-blue-400' },
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 animate-pulse">
        <div className="h-6 w-36 bg-gray-700 rounded mb-3" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700" />
              <div className="h-4 w-24 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Friends Playing
      </h3>

      {friends.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-2">No friends online right now</p>
          <p className="text-xs text-gray-500">
            Invite friends to earn 5% of their winnings
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {friends.map((friend) => {
            const st = statusConfig[friend.status]
            const initial = (friend.username ?? '?')[0].toUpperCase()

            return (
              <div
                key={friend.id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-700/40 transition-colors"
              >
                {/* Avatar initial */}
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {friend.username}
                  </p>
                  <p className={`text-xs ${st.color}`}>
                    {st.icon} {st.label}
                  </p>
                </div>

                {/* Action buttons */}
                {friend.status !== 'in_match' && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    {invitedIds.has(friend.id) ? (
                      <span className="px-2.5 py-1 text-xs font-medium rounded bg-green-500/10 text-green-400 border border-green-500/30">
                        Invited!
                      </span>
                    ) : (
                      <button
                        onClick={() => inviteToMatch(friend.id)}
                        disabled={invitingId === friend.id}
                        className="px-2.5 py-1 text-xs font-medium rounded
                          bg-accent-purple/10 border border-accent-purple/30 text-accent-purple
                          hover:bg-accent-purple/20 transition-colors disabled:opacity-50"
                      >
                        {invitingId === friend.id ? '...' : 'Invite'}
                      </button>
                    )}
                    <a
                      href={`/match/create?opponent=${friend.id}`}
                      className="px-2.5 py-1 text-xs font-medium rounded
                        bg-gray-700 border border-gray-600 text-gray-300
                        hover:bg-gray-600 hover:text-white transition-colors"
                    >
                      Challenge
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
