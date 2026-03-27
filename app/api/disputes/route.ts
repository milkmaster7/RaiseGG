import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, reason, evidence } = await req.json()
  if (!matchId || !reason) return NextResponse.json({ error: 'matchId and reason are required' }, { status: 400 })
  if (reason.length < 20) return NextResponse.json({ error: 'Please provide more detail (min 20 chars)' }, { status: 400 })

  const supabase = createServiceClient()

  // Verify player was part of the match
  const { data: match } = await supabase
    .from('matches')
    .select('id, player_a_id, player_b_id, status')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  if (match.player_a_id !== playerId && match.player_b_id !== playerId) {
    return NextResponse.json({ error: 'You were not part of this match' }, { status: 403 })
  }

  if (!['locked', 'completed'].includes(match.status)) {
    return NextResponse.json({ error: 'Disputes can only be raised on locked or completed matches' }, { status: 400 })
  }

  // Prevent duplicate disputes by the same player on the same match
  const { data: existing } = await supabase
    .from('disputes')
    .select('id')
    .eq('match_id', matchId)
    .eq('raised_by_id', playerId)
    .single()

  if (existing) return NextResponse.json({ error: 'You have already raised a dispute for this match' }, { status: 409 })

  const { data: dispute, error } = await supabase
    .from('disputes')
    .insert({
      match_id:     matchId,
      raised_by_id: playerId,
      reason,
      evidence:     evidence ?? null,
      status:       'open',
    })
    .select()
    .single()

  if (error) {
    console.error('Create dispute error:', error)
    return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 })
  }

  // Flag the match as disputed
  await supabase.from('matches').update({ status: 'disputed' }).eq('id', matchId)

  return NextResponse.json({ dispute }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: disputes } = await supabase
    .from('disputes')
    .select('*, match:matches(id, game, stake_amount, status)')
    .eq('raised_by_id', playerId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ disputes: disputes ?? [] })
}
