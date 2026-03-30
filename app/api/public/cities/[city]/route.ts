import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Country code → flag emoji
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '\u{1F3F3}'
  const upper = code.toUpperCase()
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

/**
 * GET /api/public/cities/[city]
 *
 * Returns details for a single city:
 * - City rank, total wins, total matches
 * - Top 10 players in that city
 * - Recent matches from that city
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city: citySlug } = await params
    const cityName = decodeURIComponent(citySlug).trim()

    if (!cityName) {
      return NextResponse.json({ error: 'City parameter is required' }, { status: 400, headers: CORS })
    }

    const supabase = createServiceClient()

    // Fetch all players in this city (case-insensitive)
    const { data: players, error } = await supabase
      .from('players')
      .select('id, username, avatar_url, city, country, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses')
      .ilike('city', cityName)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ error: 'City not found' }, { status: 404, headers: CORS })
    }

    // Calculate totals
    const country = (players[0].country as string) ?? ''
    const flag = countryFlag(country)

    let totalWins = 0
    let totalMatches = 0

    const enriched = players.map((p) => {
      const wins = (p.cs2_wins ?? 0) + (p.dota2_wins ?? 0) + (p.deadlock_wins ?? 0)
      const losses = (p.cs2_losses ?? 0) + (p.dota2_losses ?? 0) + (p.deadlock_losses ?? 0)
      const matches = wins + losses
      const elo = Math.max(p.cs2_elo ?? 0, p.dota2_elo ?? 0, p.deadlock_elo ?? 0) || 1000

      totalWins += wins
      totalMatches += matches

      return {
        id: p.id,
        username: p.username ?? 'Unknown',
        avatar_url: p.avatar_url,
        elo,
        wins,
        losses,
        matches,
      }
    })

    // Sort by wins desc, take top 10
    const topPlayers = enriched
      .sort((a, b) => b.wins - a.wins || b.elo - a.elo)
      .slice(0, 10)

    // Get city rank — fetch all cities' total wins to determine rank
    const { data: allPlayers } = await supabase
      .from('players')
      .select('city, cs2_wins, dota2_wins, deadlock_wins')
      .not('city', 'is', null)

    let cityRank = 1
    if (allPlayers) {
      const cityWins = new Map<string, number>()
      for (const p of allPlayers) {
        const key = (p.city as string).toLowerCase().trim()
        if (!key) continue
        const w = (p.cs2_wins ?? 0) + (p.dota2_wins ?? 0) + (p.deadlock_wins ?? 0)
        cityWins.set(key, (cityWins.get(key) ?? 0) + w)
      }
      const sorted = Array.from(cityWins.entries()).sort((a, b) => b[1] - a[1])
      const idx = sorted.findIndex(([k]) => k === cityName.toLowerCase())
      if (idx >= 0) cityRank = idx + 1
    }

    // Fetch recent matches involving players from this city
    const playerIds = players.map((p) => p.id)
    const { data: recentMatches } = await supabase
      .from('matches')
      .select('id, game, status, winner_id, player_a_id, player_b_id, stake_amount, resolved_at, created_at')
      .eq('status', 'completed')
      .or(playerIds.map((id) => `player_a_id.eq.${id},player_b_id.eq.${id}`).join(','))
      .order('resolved_at', { ascending: false })
      .limit(20)

    return NextResponse.json(
      {
        city: players[0].city,
        country,
        flag,
        rank: cityRank,
        totalWins,
        totalMatches,
        playerCount: players.length,
        topPlayers,
        recentMatches: (recentMatches ?? []).map((m) => ({
          id: m.id,
          game: m.game,
          winner_id: m.winner_id,
          player_a_id: m.player_a_id,
          player_b_id: m.player_b_id,
          stake_amount: m.stake_amount,
          resolved_at: m.resolved_at,
        })),
      },
      {
        headers: {
          ...CORS,
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS }
    )
  }
}
