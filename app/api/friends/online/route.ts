import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 30

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json([])

  const db = createServiceClient()

  // Get friend relationships
  const { data: friendships } = await db
    .from('friends')
    .select('friend_id')
    .eq('player_id', playerId)
    .eq('status', 'accepted')

  if (!friendships || friendships.length === 0) return NextResponse.json([])

  const friendIds = friendships.map(f => f.friend_id)

  // Get friend details — only those recently active (last 15 min)
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: onlineFriends } = await db
    .from('players')
    .select('id, username, avatar_url, last_active_at')
    .in('id', friendIds)
    .gte('last_active_at', cutoff)
    .limit(20)

  if (!onlineFriends) return NextResponse.json([])

  // Check if any are currently in a match
  const { data: liveMatches } = await db
    .from('matches')
    .select('player_a_id, player_b_id')
    .eq('status', 'live')
    .or(
      friendIds.map(id => `player_a_id.eq.${id},player_b_id.eq.${id}`).join(',')
    )

  const inMatchIds = new Set<string>()
  for (const m of liveMatches ?? []) {
    if (m.player_a_id && friendIds.includes(m.player_a_id)) inMatchIds.add(m.player_a_id)
    if (m.player_b_id && friendIds.includes(m.player_b_id)) inMatchIds.add(m.player_b_id)
  }

  const friends = onlineFriends.map(f => ({
    id: f.id,
    username: f.username,
    avatar_url: f.avatar_url,
    status: inMatchIds.has(f.id) ? 'in_match' : 'online' as const,
  }))

  return NextResponse.json(friends)
}
