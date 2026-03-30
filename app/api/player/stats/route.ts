import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Player stats
  const { data: player } = await supabase
    .from('players')
    .select('username, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses, current_streak, best_streak, usdc_balance, usdt_balance')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ELO history for sparkline (all games, last 20 each)
  const eloHistory: Record<string, { elo: number; recorded_at: string }[]> = {}
  for (const game of ['cs2', 'dota2', 'deadlock']) {
    const { data } = await supabase
      .from('elo_history')
      .select('elo, recorded_at')
      .eq('player_id', playerId)
      .eq('game', game)
      .order('recorded_at', { ascending: true })
      .limit(20)
    eloHistory[game] = data ?? []
  }

  // Completed matches for earnings + biggest win
  const { data: matches } = await supabase
    .from('matches')
    .select('game, stake_amount, winner_id, resolved_at')
    .eq('status', 'completed')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .order('resolved_at', { ascending: false })
    .limit(200)

  let totalEarnings = 0
  let biggestWin = 0
  const perGame: Record<string, { earnings: number }> = {
    cs2: { earnings: 0 },
    dota2: { earnings: 0 },
    deadlock: { earnings: 0 },
  }

  for (const m of matches ?? []) {
    const won = m.winner_id === playerId
    const payout = won ? Number(m.stake_amount) * 2 * 0.9 : 0
    const cost = Number(m.stake_amount)
    const net = won ? payout - cost : -cost

    totalEarnings += net
    if (m.game && perGame[m.game]) {
      perGame[m.game].earnings += net
    }
    if (payout > biggestWin) biggestWin = payout
  }

  return NextResponse.json({
    player,
    eloHistory,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    biggestWin: Math.round(biggestWin * 100) / 100,
    perGame,
  })
}
