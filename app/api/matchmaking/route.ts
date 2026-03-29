import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// POST /api/matchmaking — join the matchmaking queue
// Body: { game: 'cs2' | 'dota2' | 'deadlock', mode: 'stake' | 'free', stakeAmount?: number, currency?: 'usdc' | 'usdt' }
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { game, mode, stakeAmount, currency } = await req.json()
  if (!game || !mode) {
    return NextResponse.json({ error: 'Missing game or mode' }, { status: 400 })
  }

  const db = createServiceClient()

  // Check player isn't already in queue
  const { data: existing } = await db
    .from('matchmaking_queue')
    .select('id')
    .eq('player_id', playerId)
    .eq('status', 'searching')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already in queue' }, { status: 409 })
  }

  // Get player ELO for the game
  const { data: player } = await db
    .from('players')
    .select(`id, ${game}_elo`)
    .eq('id', playerId)
    .single()

  const elo = (player as any)?.[`${game}_elo`] ?? 1000

  // Insert into queue
  const { data: entry, error } = await db
    .from('matchmaking_queue')
    .insert({
      player_id: playerId,
      game,
      mode,
      stake_amount: mode === 'free' ? 0 : (stakeAmount ?? 5),
      currency: mode === 'free' ? null : (currency ?? 'usdc'),
      elo,
      status: 'searching',
      region: 'EU', // TODO: detect from player profile
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Try to find a match immediately
  const match = await tryMatchPlayer(db, entry)

  return NextResponse.json({ ok: true, queueEntry: entry, match })
}

// DELETE /api/matchmaking — leave the queue
export async function DELETE(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  await db
    .from('matchmaking_queue')
    .update({ status: 'cancelled' })
    .eq('player_id', playerId)
    .eq('status', 'searching')

  return NextResponse.json({ ok: true })
}

// GET /api/matchmaking — check queue status
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data } = await db
    .from('matchmaking_queue')
    .select('*')
    .eq('player_id', playerId)
    .eq('status', 'searching')
    .maybeSingle()

  // Also get queue stats
  const { count } = await db
    .from('matchmaking_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'searching')

  return NextResponse.json({ inQueue: !!data, entry: data, queueSize: count ?? 0 })
}

async function tryMatchPlayer(db: any, entry: any) {
  // Find another player in the same game, mode, and similar ELO (±300)
  const { data: candidates } = await db
    .from('matchmaking_queue')
    .select('*')
    .eq('game', entry.game)
    .eq('mode', entry.mode)
    .eq('status', 'searching')
    .neq('player_id', entry.player_id)
    .gte('elo', entry.elo - 300)
    .lte('elo', entry.elo + 300)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!candidates?.length) return null

  const opponent = candidates[0]

  // Mark both as matched
  await db.from('matchmaking_queue').update({ status: 'matched' }).in('id', [entry.id, opponent.id])

  // Create the match
  const { data: match } = await db
    .from('matches')
    .insert({
      game: entry.game,
      format: '1v1',
      player_a_id: entry.player_id,
      player_b_id: opponent.player_id,
      stake_amount: entry.mode === 'free' ? 0 : entry.stake_amount,
      currency: entry.currency,
      status: entry.mode === 'free' ? 'live' : 'locked',
      region: entry.region,
    })
    .select()
    .single()

  return match
}
