import { NextRequest, NextResponse } from 'next/server'
import { getLadderStandings, getPlayerLadderRank, msUntilReset } from '@/lib/ladders'
import { readSession } from '@/lib/session'
import type { Game } from '@/types'

const VALID_GAMES: Game[] = ['cs2', 'dota2', 'deadlock']

// GET /api/ladders?game=cs2
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const game = (searchParams.get('game') ?? 'cs2') as Game

  if (!VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: 'Invalid game. Use cs2, dota2, or deadlock.' }, { status: 400 })
  }

  const playerId = await readSession(req)

  const [standings, playerRank] = await Promise.all([
    getLadderStandings(game, 50),
    playerId ? getPlayerLadderRank(playerId, game) : null,
  ])

  return NextResponse.json({
    game,
    standings,
    player_rank: playerRank,
    resets_in_ms: msUntilReset(),
  })
}
