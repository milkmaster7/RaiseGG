import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  try {
    const db = createServiceClient()

    const [
      { count: totalPlayers },
      { count: completedMatches },
      { data: topCS2 },
      { data: topDota2 },
      { data: topDeadlock },
      { data: recentMatches },
      { count: cs2Count },
      { count: dota2Count },
      { count: deadlockCount },
      { data: stakeSum },
    ] = await Promise.all([
      // Active players (not banned)
      db.from('players').select('*', { count: 'exact', head: true }).eq('banned', false),
      // Total completed matches
      db.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      // Top 10 by CS2 ELO
      db.from('players')
        .select('username, cs2_elo, country, cs2_wins, cs2_losses')
        .eq('banned', false)
        .order('cs2_elo', { ascending: false })
        .limit(10),
      // Top 10 by Dota2 ELO
      db.from('players')
        .select('username, dota2_elo, country, dota2_wins, dota2_losses')
        .eq('banned', false)
        .order('dota2_elo', { ascending: false })
        .limit(10),
      // Top 10 by Deadlock ELO
      db.from('players')
        .select('username, deadlock_elo, country, deadlock_wins, deadlock_losses')
        .eq('banned', false)
        .order('deadlock_elo', { ascending: false })
        .limit(10),
      // Recent 10 completed matches with player info
      db.from('matches')
        .select('id, game, stake_amount, currency, created_at, resolved_at, player_a:players!player_a_id(username, country), player_b:players!player_b_id(username, country), winner:players!winner_id(username, country)')
        .eq('status', 'completed')
        .order('resolved_at', { ascending: false })
        .limit(10),
      // Game breakdown counts
      db.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('game', 'cs2'),
      db.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('game', 'dota2'),
      db.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('game', 'deadlock'),
      // Total prize money (sum of stake_amount for completed matches — winner gets the pot)
      db.from('matches').select('stake_amount').eq('status', 'completed'),
    ])

    // Calculate total prize money from completed matches (each match pot = stake_amount * 2)
    const totalPrizeMoney = (stakeSum ?? []).reduce((sum: number, m: any) => sum + (Number(m.stake_amount) || 0) * 2, 0)

    // Build combined top 10 players across all games by highest ELO
    const allPlayers = [
      ...(topCS2 ?? []).map((p: any) => ({
        username: p.username,
        elo: p.cs2_elo,
        game: 'cs2' as const,
        country: p.country,
        win_rate: calcWinRate(p.cs2_wins, p.cs2_losses),
      })),
      ...(topDota2 ?? []).map((p: any) => ({
        username: p.username,
        elo: p.dota2_elo,
        game: 'dota2' as const,
        country: p.country,
        win_rate: calcWinRate(p.dota2_wins, p.dota2_losses),
      })),
      ...(topDeadlock ?? []).map((p: any) => ({
        username: p.username,
        elo: p.deadlock_elo,
        game: 'deadlock' as const,
        country: p.country,
        win_rate: calcWinRate(p.deadlock_wins, p.deadlock_losses),
      })),
    ]
    // Deduplicate by username (keep highest ELO entry) then sort and take top 10
    const seen = new Map<string, typeof allPlayers[0]>()
    for (const p of allPlayers) {
      const existing = seen.get(p.username)
      if (!existing || p.elo > existing.elo) seen.set(p.username, p)
    }
    const top10Players = [...seen.values()]
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 10)

    // Top 5 countries by total wins
    const countryWins = new Map<string, number>()
    for (const p of [...(topCS2 ?? []), ...(topDota2 ?? []), ...(topDeadlock ?? [])] as any[]) {
      const c = p.country ?? 'Unknown'
      const wins = (p.cs2_wins ?? 0) + (p.dota2_wins ?? 0) + (p.deadlock_wins ?? 0)
      countryWins.set(c, (countryWins.get(c) ?? 0) + wins)
    }
    const top5Countries = [...countryWins.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, wins]) => ({ country, total_wins: wins }))

    // Format recent matches
    const recent10 = (recentMatches ?? []).map((m: any) => ({
      id: m.id,
      winner: m.winner?.username ?? null,
      loser: m.player_a?.username === m.winner?.username
        ? m.player_b?.username ?? null
        : m.player_a?.username ?? null,
      game: m.game,
      stake: `${m.stake_amount} ${m.currency?.toUpperCase() ?? 'USDC'}`,
      date: m.resolved_at ?? m.created_at,
    }))

    const data = {
      overview: {
        total_matches_played: completedMatches ?? 0,
        total_prize_money_usd: Math.round(totalPrizeMoney * 100) / 100,
        active_players: totalPlayers ?? 0,
      },
      top_10_players: top10Players,
      top_5_countries_by_wins: top5Countries,
      recent_matches: recent10,
      games_breakdown: {
        cs2: cs2Count ?? 0,
        dota2: dota2Count ?? 0,
        deadlock: deadlockCount ?? 0,
      },
    }

    return NextResponse.json(
      { api_version: '1.0', cached_at: new Date().toISOString(), data },
      { status: 200, headers: CORS_HEADERS },
    )
  } catch (err) {
    console.error('[public/stats] Error:', err)
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
