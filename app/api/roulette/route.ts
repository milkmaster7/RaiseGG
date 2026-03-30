import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import {
  joinRouletteQueue,
  leaveRouletteQueue,
  getQueueStatus,
  findRouletteMatch,
} from '@/lib/stake-roulette'

// GET /api/roulette — public queue status
export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get('game') ?? undefined
  const status = await getQueueStatus(game)
  return NextResponse.json({ queue: status })
}

// POST /api/roulette — join, leave, or trigger match
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  // ─── Cron-only: trigger matching ────────────────────────────────────────
  if (action === 'match') {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const games = ['cs2', 'dota2', 'deadlock']
    const results: Array<{ game: string; matched: boolean; matchId?: string; stake?: number }> = []

    for (const game of games) {
      const result = await findRouletteMatch(game)
      results.push({
        game,
        matched: !!result,
        matchId: result?.matchId,
        stake: result?.stake,
      })
    }

    return NextResponse.json({ success: true, results })
  }

  // ─── Auth-required actions ──────────────────────────────────────────────
  const userId = await readSession(req)
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (action === 'join') {
    const { game, minStake, maxStake } = body
    if (!game || minStake == null || maxStake == null) {
      return NextResponse.json(
        { error: 'Missing game, minStake, or maxStake' },
        { status: 400 }
      )
    }

    const result = await joinRouletteQueue(userId, game, Number(minStake), Number(maxStake))
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, message: 'Joined roulette queue' })
  }

  if (action === 'leave') {
    const result = await leaveRouletteQueue(userId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, message: 'Left roulette queue' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
