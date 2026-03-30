import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

const MIN_WAGER = 1
const MAX_WAGER = 20
const RAKE_PERCENT = 5

// GET — get side wager pool & odds for a match
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('match_id')
  if (!matchId) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

  const db = createServiceClient()

  const { data: wagers, error } = await db
    .from('side_wagers')
    .select('id, player_id, backing, amount, status, created_at')
    .eq('match_id', matchId)
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const poolA = (wagers ?? []).filter(w => w.backing === 'player_a').reduce((s, w) => s + Number(w.amount), 0)
  const poolB = (wagers ?? []).filter(w => w.backing === 'player_b').reduce((s, w) => s + Number(w.amount), 0)
  const totalPool = poolA + poolB
  const countA = (wagers ?? []).filter(w => w.backing === 'player_a').length
  const countB = (wagers ?? []).filter(w => w.backing === 'player_b').length

  // Calculate display odds
  let oddsA = '1:1'
  let oddsB = '1:1'
  if (poolA > 0 && poolB > 0) {
    const ratioA = poolB / poolA
    const ratioB = poolA / poolB
    oddsA = `${ratioA < 1 ? '1' : ratioA.toFixed(1)}:${ratioA < 1 ? (1 / ratioA).toFixed(1) : '1'}`
    oddsB = `${ratioB < 1 ? '1' : ratioB.toFixed(1)}:${ratioB < 1 ? (1 / ratioB).toFixed(1) : '1'}`
  } else if (poolA > 0 && poolB === 0) {
    oddsA = 'All in'
    oddsB = 'No bets yet'
  } else if (poolB > 0 && poolA === 0) {
    oddsA = 'No bets yet'
    oddsB = 'All in'
  }

  return NextResponse.json({
    matchId,
    totalPool,
    poolA,
    poolB,
    countA,
    countB,
    oddsA,
    oddsB,
    rake: RAKE_PERCENT,
    wagerCount: (wagers ?? []).length,
  })
}

// POST — place a side wager
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { match_id, backing, amount } = body

  if (!match_id || !backing || !amount) {
    return NextResponse.json({ error: 'match_id, backing, and amount are required' }, { status: 400 })
  }

  if (!['player_a', 'player_b'].includes(backing)) {
    return NextResponse.json({ error: 'backing must be player_a or player_b' }, { status: 400 })
  }

  const wagerAmount = Number(amount)
  if (isNaN(wagerAmount) || wagerAmount < MIN_WAGER || wagerAmount > MAX_WAGER) {
    return NextResponse.json({ error: `Amount must be between $${MIN_WAGER} and $${MAX_WAGER}` }, { status: 400 })
  }

  const db = createServiceClient()

  // Verify match exists and is in a wagerable state (open or locked, not yet started)
  const { data: match, error: matchErr } = await db
    .from('matches')
    .select('id, status, player_a_id, player_b_id')
    .eq('id', match_id)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (!['open', 'locked'].includes(match.status)) {
    return NextResponse.json({ error: 'Wagers are locked — match has already started or completed' }, { status: 400 })
  }

  // Cannot wager on a match you are playing in
  if (playerId === match.player_a_id || playerId === match.player_b_id) {
    return NextResponse.json({ error: 'You cannot place a side wager on your own match' }, { status: 400 })
  }

  // Check player has enough balance
  const { data: player } = await db
    .from('players')
    .select('usdc_balance')
    .eq('id', playerId)
    .single()

  if (!player || Number(player.usdc_balance ?? 0) < wagerAmount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Check for existing wager (UNIQUE constraint will also catch this)
  const { data: existing } = await db
    .from('side_wagers')
    .select('id')
    .eq('match_id', match_id)
    .eq('player_id', playerId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'You already have a wager on this match' }, { status: 400 })
  }

  // Deduct balance
  await db
    .from('players')
    .update({ usdc_balance: Number(player.usdc_balance) - wagerAmount })
    .eq('id', playerId)

  // Insert wager
  const { data: wager, error: insertErr } = await db
    .from('side_wagers')
    .insert({
      match_id,
      player_id: playerId,
      backing,
      amount: wagerAmount,
    })
    .select()
    .single()

  if (insertErr) {
    // Refund on failure
    await db
      .from('players')
      .update({ usdc_balance: Number(player.usdc_balance) })
      .eq('id', playerId)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Log transaction
  await db.from('transactions').insert({
    player_id: playerId,
    type: 'side_wager',
    amount: -wagerAmount,
    note: `Side wager on match ${match_id} — backing ${backing}`,
  })

  return NextResponse.json(wager, { status: 201 })
}
