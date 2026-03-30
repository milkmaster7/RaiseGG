import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

const WEEKLY_PRIZES = [
  { place: 1, amount: 10 },  // $10 USDC
  { place: 2, amount: 7 },
  { place: 3, amount: 5 },
  { place: 4, amount: 3 },
  { place: 5, amount: 2 },
  { place: 6, amount: 1.5 },
  { place: 7, amount: 1 },
  { place: 8, amount: 1 },
  { place: 9, amount: 0.5 },
  { place: 10, amount: 0.5 },
]

const GAMES = ['cs2', 'dota2', 'deadlock'] as const

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const supabase = createServiceClient()
  let totalPaid = 0
  let totalRecipients = 0

  try {
    // Get matches from the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    for (const game of GAMES) {
      // Count wins per player in the last week
      const { data: weeklyWins } = await supabase
        .from('matches')
        .select('winner_id')
        .eq('status', 'completed')
        .eq('game', game)
        .not('winner_id', 'is', null)
        .gte('resolved_at', weekAgo)

      if (!weeklyWins || weeklyWins.length === 0) continue

      // Aggregate wins per player
      const winCounts: Record<string, number> = {}
      for (const m of weeklyWins) {
        if (m.winner_id) winCounts[m.winner_id] = (winCounts[m.winner_id] ?? 0) + 1
      }

      // Sort by win count descending
      const ranked = Object.entries(winCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)

      // Distribute prizes
      for (let i = 0; i < ranked.length && i < WEEKLY_PRIZES.length; i++) {
        const [playerId, wins] = ranked[i]
        const prize = WEEKLY_PRIZES[i]

        await supabase.rpc('increment_balance', {
          player_id: playerId,
          field: 'usdc_balance',
          amount: prize.amount,
        })

        await supabase.from('transactions').insert({
          player_id: playerId,
          type: 'weekly_prize',
          amount: prize.amount,
          note: `Weekly leaderboard #${i + 1} — ${game.toUpperCase()} (${wins} wins)`,
        })

        totalPaid += prize.amount
        totalRecipients++
      }
    }

    await recordCronRun('weekly-prizes', 'ok', { message: `Paid $${totalPaid} to ${totalRecipients} players`, durationMs: Date.now() - start })
    return NextResponse.json({ success: true, totalPaid, totalRecipients })
  } catch (err) {
    await recordCronRun('weekly-prizes', 'error', { message: String(err), durationMs: Date.now() - start })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
