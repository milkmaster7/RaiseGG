import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// POST /api/practice — create a free practice match
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { game, format = '1v1' } = await req.json()
  if (!game || !['cs2', 'dota2', 'deadlock'].includes(game)) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const matchId = uuidv4()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

  const { data, error } = await supabase
    .from('matches')
    .insert({
      id: matchId,
      player_a_id: playerId,
      game,
      format,
      stake_amount: 0,
      currency: 'usdc',
      status: 'open',
      expires_at: expiresAt.toISOString(),
      region: 'EU',
      is_practice: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// GET /api/practice — list open practice lobbies
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('matches')
    .select('*, player_a:players!player_a_id(id,username,avatar_url,cs2_elo,dota2_elo,deadlock_elo,country)')
    .eq('status', 'open')
    .eq('is_practice', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
