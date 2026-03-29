import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/match-invite — get pending invites for current player
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: invites } = await db
    .from('match_invites')
    .select('id, from_player_id, to_player_id, game, stake_amount, status, created_at')
    .eq('to_player_id', playerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)

  // Resolve sender names
  const senderIds = [...new Set((invites ?? []).map(i => i.from_player_id))]
  let senderMap: Record<string, string> = {}
  if (senderIds.length > 0) {
    const { data: senders } = await db
      .from('players')
      .select('id, username')
      .in('id', senderIds)
    for (const s of senders ?? []) {
      senderMap[s.id] = s.username ?? 'Unknown'
    }
  }

  const enriched = (invites ?? []).map(i => ({
    ...i,
    from_username: senderMap[i.from_player_id] ?? 'Unknown',
  }))

  return NextResponse.json({ invites: enriched })
}

// POST /api/match-invite — create a match invitation
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { to_player_id, game, stake_amount } = body

  if (!to_player_id) {
    return NextResponse.json({ error: 'to_player_id is required' }, { status: 400 })
  }

  if (to_player_id === playerId) {
    return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
  }

  const db = createServiceClient()

  // Check no duplicate pending invite
  const { data: existing } = await db
    .from('match_invites')
    .select('id')
    .eq('from_player_id', playerId)
    .eq('to_player_id', to_player_id)
    .eq('status', 'pending')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Invite already pending' }, { status: 409 })
  }

  const { data: invite, error } = await db
    .from('match_invites')
    .insert({
      from_player_id: playerId,
      to_player_id,
      game: game ?? 'cs2',
      stake_amount: stake_amount ?? 0,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  // Create notification for the invited player
  await db.from('notifications').insert({
    player_id: to_player_id,
    type: 'match_invite',
    title: 'Match Invitation',
    message: `You have been invited to a match`,
    data: { invite_id: invite.id, from_player_id: playerId },
  }).then(() => {}) // fire and forget

  return NextResponse.json({ invite })
}
