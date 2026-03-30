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
 * GET /api/public/cities
 *
 * Returns all cities ranked by total wins, with top 3 players per city.
 * Query params:
 *   ?game=cs2|dota2|deadlock  (optional filter, defaults to all games)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const game = searchParams.get('game') // optional

    const supabase = createServiceClient()

    // Build player query — select columns needed for aggregation
    let query = supabase
      .from('players')
      .select('id, username, city, country, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, dota2_wins, deadlock_wins')
      .not('city', 'is', null)

    const { data: players, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ cities: [] }, { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } })
    }

    // Calculate wins based on game filter
    function getWins(p: NonNullable<typeof players>[0]): number {
      if (game === 'cs2') return p.cs2_wins ?? 0
      if (game === 'dota2') return p.dota2_wins ?? 0
      if (game === 'deadlock') return p.deadlock_wins ?? 0
      return (p.cs2_wins ?? 0) + (p.dota2_wins ?? 0) + (p.deadlock_wins ?? 0)
    }

    function getElo(p: NonNullable<typeof players>[0]): number {
      if (game === 'cs2') return p.cs2_elo ?? 1000
      if (game === 'dota2') return p.dota2_elo ?? 1000
      if (game === 'deadlock') return p.deadlock_elo ?? 1000
      return Math.max(p.cs2_elo ?? 0, p.dota2_elo ?? 0, p.deadlock_elo ?? 0) || 1000
    }

    // Group players by city
    const cityMap = new Map<string, {
      city: string
      country: string
      totalWins: number
      players: Array<{ username: string; elo: number; wins: number }>
    }>()

    for (const p of players) {
      const cityKey = (p.city as string).toLowerCase().trim()
      if (!cityKey) continue

      const wins = getWins(p)
      const elo = getElo(p)

      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, {
          city: p.city as string,
          country: (p.country as string) ?? '',
          totalWins: 0,
          players: [],
        })
      }

      const entry = cityMap.get(cityKey)!
      entry.totalWins += wins
      entry.players.push({
        username: p.username ?? 'Unknown',
        elo,
        wins,
      })
    }

    // Sort cities by total wins, build response
    const cities = Array.from(cityMap.values())
      .sort((a, b) => b.totalWins - a.totalWins)
      .map((c, i) => ({
        rank: i + 1,
        city: c.city,
        country: c.country,
        flag: countryFlag(c.country),
        totalWins: c.totalWins,
        playerCount: c.players.length,
        topPlayers: c.players
          .sort((a, b) => b.wins - a.wins || b.elo - a.elo)
          .slice(0, 3)
          .map((p) => ({ username: p.username, elo: p.elo, wins: p.wins })),
      }))

    return NextResponse.json(
      { cities, game: game ?? 'all' },
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
