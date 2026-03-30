import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Player info
  const { data: player } = await supabase
    .from('players')
    .select('username, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses, current_streak, best_streak, login_streak, usdc_balance')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  // Get matches from the last 7 days
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString()

  const { data: weekMatches } = await supabase
    .from('matches')
    .select('game, stake_amount, winner_id, resolved_at, player_a_id, player_b_id')
    .eq('status', 'completed')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .gte('resolved_at', weekAgoStr)
    .order('resolved_at', { ascending: false })
    .limit(200)

  const matches = weekMatches ?? []

  let wins = 0
  let losses = 0
  let totalEarned = 0
  let biggestWinAmount = 0

  for (const m of matches) {
    const won = m.winner_id === playerId
    if (won) {
      wins++
      const payout = Number(m.stake_amount) * 2 * 0.9
      totalEarned += payout - Number(m.stake_amount)
      if (payout > biggestWinAmount) biggestWinAmount = payout
    } else {
      losses++
      totalEarned -= Number(m.stake_amount)
    }
  }

  const matchesPlayed = wins + losses
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0

  // ELO change this week: compare current ELO to oldest elo_history entry within the week
  let eloChange = 0
  for (const game of ['cs2', 'dota2', 'deadlock'] as const) {
    const currentElo = player[`${game}_elo`] ?? 1000
    const { data: oldEntry } = await supabase
      .from('elo_history')
      .select('elo')
      .eq('player_id', playerId)
      .eq('game', game)
      .lte('recorded_at', weekAgoStr)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (oldEntry) {
      eloChange += currentElo - oldEntry.elo
    }
  }

  // Rank: count players with higher peak ELO
  const peakElo = Math.max(player.cs2_elo ?? 1000, player.dota2_elo ?? 1000, player.deadlock_elo ?? 1000)
  const { count: higherCount } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .or(`cs2_elo.gt.${peakElo},dota2_elo.gt.${peakElo},deadlock_elo.gt.${peakElo}`)

  const rank = (higherCount ?? 0) + 1

  return NextResponse.json({
    username: player.username ?? 'Anonymous',
    matchesPlayed,
    wins,
    losses,
    winRate,
    eloChange,
    biggestWin: Math.round(biggestWinAmount * 100) / 100,
    currentStreak: player.current_streak ?? 0,
    loginStreak: player.login_streak ?? 0,
    totalEarned: Math.round(totalEarned * 100) / 100,
    rank,
    peakElo,
    weekStart: weekAgoStr,
    weekEnd: new Date().toISOString(),
  })
}
