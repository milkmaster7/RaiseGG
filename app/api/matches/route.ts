import { NextRequest, NextResponse } from 'next/server'
import { createMatch } from '@/lib/matches'
import { createServiceClient } from '@/lib/supabase'
import { readSession } from '@/lib/session'
import { minStakeForElo, maxStakeForElo } from '@/lib/elo'

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
  const { matchId, playerAId, game, format, matchType = '1v1', teamName, stakeAmount, currency = 'usdc', vaultPda, createTx, region, invitePassword, challengedPlayerId } = body

  if (!matchId || !playerAId || !game || !format || !stakeAmount || !vaultPda || !createTx) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['usdc', 'usdt'].includes(currency)) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
  }
  if (!['1v1', '2v2', '5v5'].includes(matchType)) {
    return NextResponse.json({ error: 'Invalid match type' }, { status: 400 })
  }

  if (game === 'deadlock') {
    return NextResponse.json({ error: 'Deadlock matches are coming soon. Stay tuned!' }, { status: 400 })
  }

  if (sessionPlayerId !== playerAId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate player eligibility and stake tier
  const supabaseCheck = createServiceClient()
  const { data: player } = await supabaseCheck
    .from('players')
    .select('eligible, banned, age_verified, cs2_elo, dota2_elo, deadlock_elo')
    .eq('id', playerAId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  if (player.banned) return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
  if (!player.eligible) return NextResponse.json({ error: 'Your account does not meet eligibility requirements (account age, VAC status, or hours played).' }, { status: 403 })

  // Age verification — must confirm 18+ before staking
  if (!player.age_verified) {
    return NextResponse.json({
      error: 'You must confirm you are 18 or older before staking. Go to Settings to verify.',
      code: 'AGE_VERIFICATION_REQUIRED'
    }, { status: 403 })
  }

  const eloKey = `${game}_elo` as keyof typeof player
  const playerElo = (player[eloKey] as number) ?? 1000
  const minStake = minStakeForElo(playerElo)
  if (stakeAmount < minStake) {
    return NextResponse.json({ error: `Minimum stake for your rank is $${minStake}` }, { status: 400 })
  }

  const maxStake = maxStakeForElo(playerElo)
  if (stakeAmount > maxStake) {
    return NextResponse.json({ error: `Maximum stake for your rank is $${maxStake}. Rank up to increase your limit.` }, { status: 400 })
  }

  const { match, error } = await createMatch({ matchId, playerAId, game, format, matchType, teamName, stakeAmount, currency, vaultPda, createTx, region, invitePassword, challengedPlayerId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(match, { status: 201 })
}
