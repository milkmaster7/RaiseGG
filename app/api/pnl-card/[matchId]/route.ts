import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/pnl-card/[matchId]?player=<playerId>
// Redirects to the PnL card image with all params filled from the match data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const playerId = req.nextUrl.searchParams.get('player')
  if (!playerId) return NextResponse.json({ error: 'player param required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: match } = await supabase
    .from('matches')
    .select('*, player_a:players!player_a_id(id, username, referral_code), player_b:players!player_b_id(id, username, referral_code)')
    .eq('id', matchId)
    .eq('status', 'completed')
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const isPlayerA = match.player_a?.id === playerId
  const isPlayerB = match.player_b?.id === playerId
  if (!isPlayerA && !isPlayerB) return NextResponse.json({ error: 'Player not in this match' }, { status: 403 })

  const player = isPlayerA ? match.player_a : match.player_b
  const opponent = isPlayerA ? match.player_b : match.player_a
  const won = match.winner_id === playerId

  const rake = match.stake_amount * 2 * 0.1
  const payout = (match.stake_amount * 2 * 0.9).toFixed(2)
  const stake = match.stake_amount.toFixed(2)

  // Build the PnL card URL params
  const cardParams = new URLSearchParams({
    username: player.username,
    game: match.game,
    result: won ? 'win' : 'loss',
    payout,
    stake,
  })

  if (opponent?.username) cardParams.set('opponent', opponent.username)
  if (player?.referral_code) cardParams.set('ref', player.referral_code)

  // Game-specific detail
  if (match.game === 'dota2') {
    // Winner gets their hero, loser gets their hero
    const hero = won ? match.game_detail : match.game_detail_loser
    if (hero) cardParams.set('hero', hero)
  } else if (match.game === 'cs2') {
    if (match.game_detail) cardParams.set('map', match.game_detail)
  }
  // deadlock: no detail yet (no API)

  // Redirect to the image generator
  const baseUrl = req.nextUrl.origin
  return NextResponse.redirect(`${baseUrl}/api/pnl-card?${cardParams.toString()}`)
}
