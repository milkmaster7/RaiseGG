import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { readSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, message } = await req.json()
  if (!matchId || !message?.trim()) {
    return NextResponse.json({ error: 'matchId and message required' }, { status: 400 })
  }
  if (message.trim().length > 200) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify player is in the match
  const { data: match } = await supabase
    .from('matches')
    .select('player_a_id, player_b_id, status')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.player_a_id !== playerId && match.player_b_id !== playerId) {
    return NextResponse.json({ error: 'Not in this match' }, { status: 403 })
  }
  if (!['locked', 'live', 'completed'].includes(match.status)) {
    return NextResponse.json({ error: 'Chat not available for this match status' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('match_chats')
    .insert({ match_id: matchId, player_id: playerId, message: message.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
