import { NextRequest, NextResponse } from 'next/server'
import { createMatch } from '@/lib/matches'
import { createServiceClient } from '@/lib/supabase'
import { readSession } from '@/lib/session'

// GET /api/matches — open lobbies for play page
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const game   = searchParams.get('game')
  const status = searchParams.get('status') ?? 'open'
  const limit  = Number(searchParams.get('limit') ?? 20)

  const supabase = createServiceClient()
  let query = supabase
    .from('matches')
    .select('*, player_a:players!player_a_id(id,username,avatar_url,cs2_elo,dota2_elo,deadlock_elo,country)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (game) query = query.eq('game', game)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/matches — create new match
export async function POST(req: NextRequest) {
  const sessionPlayerId = await readSession(req)
  if (!sessionPlayerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { playerAId, game, format, stakeAmount, vaultPda, createTx } = body

  if (!playerAId || !game || !format || !stakeAmount || !vaultPda || !createTx) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (sessionPlayerId !== playerAId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { match, error } = await createMatch({ playerAId, game, format, stakeAmount, vaultPda, createTx })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(match, { status: 201 })
}
