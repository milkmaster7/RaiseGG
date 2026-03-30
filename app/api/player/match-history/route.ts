import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '0', 10)
  const limit = 10
  const offset = page * limit

  const supabase = createServiceClient()

  // Get player ID from username
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('username', username)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const playerId = player.id

  const { data: matches, count } = await supabase
    .from('matches')
    .select(`
      id, game, stake_amount, currency, status, winner_id, resolved_at, created_at,
      player_a_id, player_b_id,
      player_a:players!player_a_id(username, avatar_url),
      player_b:players!player_b_id(username, avatar_url)
    `, { count: 'exact' })
    .eq('status', 'completed')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .order('resolved_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Get ELO deltas from elo_history for these matches
  const enriched = (matches ?? []).map((m: any) => {
    const isPlayerA = m.player_a_id === playerId
    const opponent = isPlayerA ? m.player_b : m.player_a
    const won = m.winner_id === playerId

    return {
      id: m.id,
      game: m.game,
      stake_amount: m.stake_amount,
      currency: m.currency,
      won,
      opponent: opponent ? { username: opponent.username, avatar_url: opponent.avatar_url } : null,
      resolved_at: m.resolved_at ?? m.created_at,
    }
  })

  return NextResponse.json({
    matches: enriched,
    total: count ?? 0,
    hasMore: offset + limit < (count ?? 0),
  })
}
