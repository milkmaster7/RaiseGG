import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { Game } from '@/types'

const VALID_GAMES: Game[] = ['cs2', 'dota2', 'deadlock']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
}

const ELO_COLS: Record<Game, string> = {
  cs2: 'cs2_elo',
  dota2: 'dota2_elo',
  deadlock: 'deadlock_elo',
}

const WIN_COL: Record<Game, string> = {
  cs2: 'cs2_wins',
  dota2: 'dota2_wins',
  deadlock: 'deadlock_wins',
}

const LOSS_COL: Record<Game, string> = {
  cs2: 'cs2_losses',
  dota2: 'dota2_losses',
  deadlock: 'deadlock_losses',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ game: string }> },
) {
  const { game: rawGame } = await params
  const game = rawGame.toLowerCase() as Game

  if (!VALID_GAMES.includes(game)) {
    return NextResponse.json(
      { api_version: '1.0', error: `Invalid game. Valid values: ${VALID_GAMES.join(', ')}` },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  try {
    const db = createServiceClient()
    const eloCol = ELO_COLS[game]
    const winCol = WIN_COL[game]
    const lossCol = LOSS_COL[game]

    const [
      { count: matchCount },
      { data: topPlayers },
      { data: recentMatches },
      { data: stakeRows },
      { count: activePlayers },
    ] = await Promise.all([
      // Total completed matches for this game
      db.from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('game', game),
      // Top 10 by game-specific ELO
      (db.from('players') as any)
        .select(`username, ${eloCol}, country, ${winCol}, ${lossCol}`)
        .eq('banned', false)
        .order(eloCol, { ascending: false })
        .limit(10),
      // Recent 10 completed matches for this game
      db.from('matches')
        .select('id, stake_amount, currency, created_at, resolved_at, player_a:players!player_a_id(username, country), player_b:players!player_b_id(username, country), winner:players!winner_id(username, country)')
        .eq('status', 'completed')
        .eq('game', game)
        .order('resolved_at', { ascending: false })
        .limit(10),
      // Stake amounts for prize calculation
      db.from('matches')
        .select('stake_amount')
        .eq('status', 'completed')
        .eq('game', game),
      // Players who have at least 1 win or loss in this game
      db.from('players')
        .select('*', { count: 'exact', head: true })
        .eq('banned', false)
        .or(`${winCol}.gt.0,${lossCol}.gt.0`),
    ])

    const totalPrizeMoney = (stakeRows ?? []).reduce(
      (sum: number, m: any) => sum + (Number(m.stake_amount) || 0) * 2, 0,
    )

    const top10 = (topPlayers ?? []).map((p: any) => ({
      username: p.username,
      elo: p[eloCol],
      country: p.country,
      win_rate: calcWinRate(p[winCol], p[lossCol]),
      wins: p[winCol] ?? 0,
      losses: p[lossCol] ?? 0,
    }))

    // Top 5 countries by wins in this game
    const countryWins = new Map<string, number>()
    for (const p of (topPlayers ?? []) as any[]) {
      const c = p.country ?? 'Unknown'
      countryWins.set(c, (countryWins.get(c) ?? 0) + (p[winCol] ?? 0))
    }
    const top5Countries = [...countryWins.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, wins]) => ({ country, total_wins: wins }))

    const recent10 = (recentMatches ?? []).map((m: any) => ({
      id: m.id,
      winner: m.winner?.username ?? null,
      loser: m.player_a?.username === m.winner?.username
        ? m.player_b?.username ?? null
        : m.player_a?.username ?? null,
      stake: `${m.stake_amount} ${m.currency?.toUpperCase() ?? 'USDC'}`,
      date: m.resolved_at ?? m.created_at,
    }))

    const data = {
      game,
      overview: {
        total_matches_played: matchCount ?? 0,
        total_prize_money_usd: Math.round(totalPrizeMoney * 100) / 100,
        active_players: activePlayers ?? 0,
      },
      top_10_players: top10,
      top_5_countries_by_wins: top5Countries,
      recent_matches: recent10,
    }

    return NextResponse.json(
      { api_version: '1.0', cached_at: new Date().toISOString(), data },
      { status: 200, headers: CORS_HEADERS },
    )
  } catch (err) {
    console.error(`[public/stats/${game}] Error:`, err)
    return NextResponse.json(
      { api_version: '1.0', error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}

function calcWinRate(wins: number, losses: number): string {
  const total = (wins ?? 0) + (losses ?? 0)
  if (total === 0) return '0%'
  return `${Math.round(((wins ?? 0) / total) * 1000) / 10}%`
}
