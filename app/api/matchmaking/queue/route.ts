import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { getRakeMultiplier, getEloMultiplier, getActiveEvents } from '@/lib/events'

// POST /api/matchmaking/queue — join auto-queue
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { game, stakeAmount, currency, verified } = await req.json()
  if (!game || !stakeAmount || !currency) {
    return NextResponse.json({ error: 'Missing game, stakeAmount, or currency' }, { status: 400 })
  }
  const verifiedOnly = verified === true

  if (!['cs2', 'dota2', 'deadlock'].includes(game)) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 })
  }
  if (!['usdc', 'usdt'].includes(currency)) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
  }
  if (stakeAmount < 1 || stakeAmount > 1000) {
    return NextResponse.json({ error: 'Stake must be between $1 and $1,000' }, { status: 400 })
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

  // Get player ELO + balance
  const eloField = `${game}_elo`
  const balanceField = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'
  const { data: player } = await db
    .from('players')
    .select(`id, username, avatar_url, ${eloField}, ${balanceField}, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses`)
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const elo = (player as any)[eloField] ?? 1000
  const balance = (player as any)[balanceField] ?? 0

  if (balance < stakeAmount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Insert into queue
  const { data: entry, error } = await db
    .from('matchmaking_queue')
    .insert({
      player_id: playerId,
      game,
      mode: 'stake',
      stake_amount: stakeAmount,
      currency,
      elo,
      status: 'searching',
      region: 'EU',
      verified_only: verifiedOnly,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Try to find a match immediately — same game, stake within ±20%, closest ELO
  const stakeMin = stakeAmount * 0.8
  const stakeMax = stakeAmount * 1.2

  let candidateQuery = db
    .from('matchmaking_queue')
    .select('*, player:players!player_id(id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses, faceit_username, leetify_url)')
    .eq('game', game)
    .eq('mode', 'stake')
    .eq('status', 'searching')
    .neq('player_id', playerId)
    .gte('stake_amount', stakeMin)
    .lte('stake_amount', stakeMax)
    .order('elo', { ascending: true })
    .limit(20)

  const { data: allCandidates } = await candidateQuery

  // Filter for verified players if requested
  let candidates = allCandidates
  if (verifiedOnly && candidates) {
    candidates = candidates.filter((c: any) => {
      const p = c.player
      return p?.faceit_username || p?.leetify_url
    })
  }

  if (candidates?.length) {
    // Find closest ELO
    const sorted = candidates.sort((a: any, b: any) => Math.abs(a.elo - elo) - Math.abs(b.elo - elo))
    const opponent = sorted[0]

    // Mark both as matched
    await db.from('matchmaking_queue').update({ status: 'matched' }).in('id', [entry.id, opponent.id])

    // Use the higher stake amount for the match
    const matchStake = Math.max(stakeAmount, opponent.stake_amount)

    // Create the match
    const { data: match } = await db
      .from('matches')
      .insert({
        game,
        format: '1v1',
        player_a_id: playerId,
        player_b_id: opponent.player_id,
        stake_amount: matchStake,
        currency,
        status: 'locked',
        region: 'EU',
      })
      .select()
      .single()

    const opponentPlayer = opponent.player as any
    const opponentElo = opponentPlayer?.[eloField] ?? opponent.elo
    const wins = (opponentPlayer?.[`${game}_wins`] ?? 0)
    const losses = (opponentPlayer?.[`${game}_losses`] ?? 0)
    const total = wins + losses
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

    return NextResponse.json({
      status: 'matched',
      matchId: match?.id,
      opponent: {
        id: opponent.player_id,
        username: opponentPlayer?.username ?? 'Unknown',
        avatar_url: opponentPlayer?.avatar_url,
        elo: opponentElo,
        winRate,
      },
    })
  }

  // No match found — return queue info
  const { count: queueSize } = await db
    .from('matchmaking_queue')
    .select('*', { count: 'exact', head: true })
    .eq('game', game)
    .eq('status', 'searching')

  // Estimate wait based on recent match frequency
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count: recentMatches } = await db
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('game', game)
    .gte('created_at', fiveMinAgo)

  const matchesPerMinute = (recentMatches ?? 0) / 5
  const estimatedWait = matchesPerMinute > 0
    ? Math.round(60 / matchesPerMinute)
    : 120 // default 2 min estimate

  return NextResponse.json({
    status: 'searching',
    position: queueSize ?? 1,
    estimatedWait,
    queueSize: queueSize ?? 1,
    elo,
  })
}

// GET /api/matchmaking/queue — check current queue status
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Check if player is in queue
  const { data: entry } = await db
    .from('matchmaking_queue')
    .select('*')
    .eq('player_id', playerId)
    .eq('status', 'searching')
    .maybeSingle()

  if (!entry) {
    // Check if recently matched
    const { data: matched } = await db
      .from('matchmaking_queue')
      .select('*')
      .eq('player_id', playerId)
      .eq('status', 'matched')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (matched) {
      // Find the match
      const { data: match } = await db
        .from('matches')
        .select('*, player_a:players!player_a_id(id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses), player_b:players!player_b_id(id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses)')
        .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
        .in('status', ['locked', 'live'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (match) {
        const isA = match.player_a_id === playerId
        const opponentPlayer = isA ? match.player_b : match.player_a
        const eloField = `${match.game}_elo`
        const opElo = (opponentPlayer as any)?.[eloField] ?? 1000
        const wins = (opponentPlayer as any)?.[`${match.game}_wins`] ?? 0
        const losses = (opponentPlayer as any)?.[`${match.game}_losses`] ?? 0
        const total = wins + losses

        return NextResponse.json({
          status: 'matched',
          matchId: match.id,
          opponent: {
            id: (opponentPlayer as any)?.id,
            username: (opponentPlayer as any)?.username ?? 'Unknown',
            avatar_url: (opponentPlayer as any)?.avatar_url,
            elo: opElo,
            winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
          },
        })
      }
    }

    return NextResponse.json({ status: 'idle' })
  }

  // In queue — get stats
  const { count: queueSize } = await db
    .from('matchmaking_queue')
    .select('*', { count: 'exact', head: true })
    .eq('game', entry.game)
    .eq('status', 'searching')

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count: recentMatches } = await db
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('game', entry.game)
    .gte('created_at', fiveMinAgo)

  const matchesPerMinute = (recentMatches ?? 0) / 5
  const estimatedWait = matchesPerMinute > 0
    ? Math.round(60 / matchesPerMinute)
    : 120

  // Get active events
  const events = getActiveEvents()

  return NextResponse.json({
    status: 'searching',
    entry,
    queueSize: queueSize ?? 1,
    estimatedWait,
    elo: entry.elo,
    activeEvents: events.map(e => e.name),
  })
}

// DELETE /api/matchmaking/queue — leave the queue
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
