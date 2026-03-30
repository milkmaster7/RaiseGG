import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/rivalry?player=<id>&opponent=<id>
// Returns head-to-head record between two players
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const playerId   = searchParams.get('player')
  const opponentId = searchParams.get('opponent')

  if (!playerId || !opponentId) {
    return NextResponse.json({ error: 'player and opponent params required' }, { status: 400 })
  }

  if (playerId === opponentId) {
    return NextResponse.json({ total_matches: 0, wins: 0, losses: 0 })
  }

  const supabase = createServiceClient()

  // Find all completed matches between these two players
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, winner_id, resolved_at')
    .eq('status', 'completed')
    .or(
      `and(player_a_id.eq.${playerId},player_b_id.eq.${opponentId}),and(player_a_id.eq.${opponentId},player_b_id.eq.${playerId})`
    )
    .order('resolved_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total = matches?.length ?? 0
  const wins = matches?.filter((m) => m.winner_id === playerId).length ?? 0
  const losses = total - wins
  const lastPlayed = matches?.[0]?.resolved_at ?? null

  // Get opponent info
  const { data: opponent } = await supabase
    .from('players')
    .select('id, username, avatar_url')
    .eq('id', opponentId)
    .single()

  return NextResponse.json({
    opponent_id: opponentId,
    opponent_username: opponent?.username ?? 'Unknown',
    opponent_avatar: opponent?.avatar_url ?? null,
    total_matches: total,
    wins,
    losses,
    last_played: lastPlayed,
  })
}
