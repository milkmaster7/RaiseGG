import { NextResponse } from 'next/server'
import { findRouletteMatch } from '@/lib/stake-roulette'
import { recordCronRun } from '@/lib/monitor'

// GET /api/cron/roulette-match — runs every 2 minutes to match roulette players
// Add to vercel.json: { "crons": [{ "path": "/api/cron/roulette-match", "schedule": "*/2 * * * *" }] }
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const games = ['cs2', 'dota2', 'deadlock']
    const matched: Array<{ game: string; matchId: string; stake: number }> = []

    for (const game of games) {
      // Keep matching until no more compatible pairs exist
      let result = await findRouletteMatch(game)
      while (result) {
        matched.push({
          game: result.game,
          matchId: result.matchId,
          stake: result.stake,
        })
        result = await findRouletteMatch(game)
      }
    }

    await recordCronRun('roulette-match', 'ok', {
      message: `${matched.length} matches created`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ success: true, matched, count: matched.length })
  } catch (err) {
    await recordCronRun('roulette-match', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
