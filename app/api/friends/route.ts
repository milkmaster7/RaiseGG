import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/friends — list friends + pending requests
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Friends where status = accepted
  const { data: friendships } = await db
    .from('friendships')
    .select('id, player_a_id, player_b_id, status, created_at')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .order('created_at', { ascending: false })

  const accepted = (friendships ?? []).filter(f => f.status === 'accepted')
  const incoming = (friendships ?? []).filter(f => f.status === 'pending' && f.player_b_id === playerId)
  const outgoing = (friendships ?? []).filter(f => f.status === 'pending' && f.player_a_id === playerId)

  // Resolve friend player IDs
  const friendIds = accepted.map(f => f.player_a_id === playerId ? f.player_b_id : f.player_a_id)
  const incomingIds = incoming.map(f => f.player_a_id)
  const outgoingIds = outgoing.map(f => f.player_b_id)
  const allIds = [...new Set([...friendIds, ...incomingIds, ...outgoingIds])]

  let players: Record<string, any> = {}
  if (allIds.length > 0) {
    const { data } = await db.from('players').select('id, username, avatar_url, country').in('id', allIds)
    for (const p of data ?? []) players[p.id] = p
  }

  return NextResponse.json({
    friends: accepted.map(f => {
      const fid = f.player_a_id === playerId ? f.player_b_id : f.player_a_id
      return { friendshipId: f.id, ...players[fid] }
    }),
    incoming: incoming.map(f => ({ friendshipId: f.id, ...players[f.player_a_id] })),
    outgoing: outgoing.map(f => ({ friendshipId: f.id, ...players[f.player_b_id] })),
  })
}

// POST /api/friends — send friend request
// Body: { targetPlayerId: string }
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetPlayerId } = await req.json()
  if (!targetPlayerId || targetPlayerId === playerId) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }

  const db = createServiceClient()

  // Check if friendship already exists
  const { data: existing } = await db
    .from('friendships')
    .select('id, status')
    .or(`and(player_a_id.eq.${playerId},player_b_id.eq.${targetPlayerId}),and(player_a_id.eq.${targetPlayerId},player_b_id.eq.${playerId})`)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Request already exists', status: existing.status }, { status: 409 })
  }

  const { data, error } = await db
    .from('friendships')
    .insert({ player_a_id: playerId, player_b_id: targetPlayerId, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, friendship: data })
}

// PATCH /api/friends — accept/reject friend request
// Body: { friendshipId: string, action: 'accept' | 'reject' }
export async function PATCH(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { friendshipId, action } = await req.json()
  if (!friendshipId || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = createServiceClient()

  // Only the recipient (player_b) can accept/reject
  const { data: friendship } = await db
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .eq('player_b_id', playerId)
    .eq('status', 'pending')
    .single()

  if (!friendship) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  if (action === 'accept') {
    await db.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
  } else {
    await db.from('friendships').delete().eq('id', friendshipId)
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/friends — remove friend
// Body: { friendshipId: string }
export async function DELETE(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { friendshipId } = await req.json()
  const db = createServiceClient()

  await db
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)

  return NextResponse.json({ ok: true })
}
