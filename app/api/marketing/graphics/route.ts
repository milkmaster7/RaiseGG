/**
 * GET /api/marketing/graphics — Generate social media graphics on demand
 *
 * Query params:
 *   type = tournament | leaderboard | match | weekly
 *   ...type-specific params (see below)
 *
 * Protected by CRON_SECRET. Returns image/png with 1h cache.
 */

import { NextResponse } from 'next/server'
import {
  generateTournamentGraphic,
  generateCityLeaderboard,
  generateMatchResult,
  generateWeeklyStats,
} from '@/lib/social-graphics'

export async function GET(req: Request) {
  // Auth
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  let buf: Buffer

  try {
    switch (type) {
      case 'tournament': {
        buf = generateTournamentGraphic({
          name: searchParams.get('name') ?? 'RaiseGG Tournament',
          city: searchParams.get('city') ?? 'Global',
          game: searchParams.get('game') ?? 'CS2',
          prize: searchParams.get('prize') ?? '$100',
          time: searchParams.get('time') ?? 'TBA',
          playerCount: parseInt(searchParams.get('players') ?? '16', 10),
        })
        break
      }

      case 'leaderboard': {
        // Expect cities as JSON: [{"name":"Moscow","flag":"🇷🇺","wins":42},...]
        const citiesRaw = searchParams.get('cities')
        const cities = citiesRaw
          ? JSON.parse(citiesRaw)
          : [
              { name: 'Moscow', flag: '🇷🇺', wins: 42 },
              { name: 'Istanbul', flag: '🇹🇷', wins: 38 },
              { name: 'Berlin', flag: '🇩🇪', wins: 31 },
              { name: 'Bangkok', flag: '🇹🇭', wins: 27 },
              { name: 'Warsaw', flag: '🇵🇱', wins: 24 },
            ]
        buf = generateCityLeaderboard({
          cities,
          game: searchParams.get('game') ?? 'CS2',
        })
        break
      }

      case 'match': {
        buf = generateMatchResult({
          playerA: searchParams.get('playerA') ?? 'Player 1',
          playerB: searchParams.get('playerB') ?? 'Player 2',
          winner: (searchParams.get('winner') as 'A' | 'B') ?? 'A',
          map: searchParams.get('map') ?? 'Dust2',
          score: searchParams.get('score') ?? '16-12',
          stakeAmount: searchParams.get('stake') ?? '$5 USDC',
        })
        break
      }

      case 'weekly': {
        buf = generateWeeklyStats({
          totalMatches: parseInt(searchParams.get('matches') ?? '0', 10),
          totalPrizeMoney: searchParams.get('prize') ?? '$0',
          topPlayer: searchParams.get('topPlayer') ?? 'N/A',
          topCity: searchParams.get('topCity') ?? 'N/A',
          weekLabel: searchParams.get('weekLabel') ?? undefined,
        })
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: tournament, leaderboard, match, weekly' },
          { status: 400 }
        )
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
