import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { Game } from '@/types'

const VALID_GAMES: Game[] = ['cs2', 'dota2', 'deadlock']

// GET /api/leaderboard?game=cs2&period=all|week&limit=100
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const game = (searchParams.get('game') ?? 'cs2') as Game
  const period = searchParams.get('period') ?? 'all'
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 200)

  if (!VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: 'Invalid game. Use cs2, dota2, or deadlock.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (period === 'week') {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: matches } = await supabase
      .from('matches')
      .select('winner_id')
      .eq('status', 'completed')
      .eq('game', game)
      .gte('resolved_at', since)

    if (!matches || matches.length === 0) {
      return NextResponse.json([])
    }

    const winCounts: Record<string, number> = {}
    for (const m of matches) {
      if (m.winner_id) winCounts[m.winner_id] = (winCounts[m.winner_id] ?? 0) + 1
    }

    const topIds = Object.entries(winCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id)

    if (topIds.length === 0) return NextResponse.json([])

    const { data: players } = await supabase
      .from('players')
      .select('id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses, current_streak, best_streak')
      .in('id', topIds)

    const sorted = (players ?? []).sort((a, b) => (winCounts[b.id] ?? 0) - (winCounts[a.id] ?? 0))
    return NextResponse.json(sorted)
  }

  // All-time
  const eloCol = `${game}_elo`
  const { data } = await supabase
    .from('players')
    .select('id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses, current_streak, best_streak')
    .eq('eligible', true)
    .eq('banned', false)
    .order(eloCol, { ascending: false })
    .limit(limit)

  return NextResponse.json(data ?? [])
}
