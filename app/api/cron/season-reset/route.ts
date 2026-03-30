import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'
import { seasonReset } from '@/lib/elo'
import { SEASON_CONFIG, isSeasonActive } from '@/lib/battle-pass'

const SEASON_END_PRIZES = [
  { place: 1, amount: 50 },
  { place: 2, amount: 30 },
  { place: 3, amount: 20 },
  { place: 4, amount: 15 },
  { place: 5, amount: 10 },
  { place: 6, amount: 7 },
  { place: 7, amount: 5 },
  { place: 8, amount: 3 },
  { place: 9, amount: 2 },
  { place: 10, amount: 1 },
]

const GAMES = ['cs2', 'dota2', 'deadlock'] as const

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const supabase = createServiceClient()

  try {
    // Check if season just ended (within the last 24 hours)
    const seasonEnd = new Date(SEASON_CONFIG.endDate)
    const now = new Date()
    const hoursSinceEnd = (now.getTime() - seasonEnd.getTime()) / (1000 * 60 * 60)

    // Only run if season ended within the last 24 hours
    if (hoursSinceEnd < 0 || hoursSinceEnd > 24) {
      await recordCronRun('season-reset', 'ok', { message: 'No season transition needed' })
      return NextResponse.json({ message: 'No season transition needed' })
    }

    // Check if we already ran this reset
    const { data: lastRun } = await supabase
      .from('cron_runs')
      .select('ran_at')
      .eq('name', 'season-reset')
      .single()

    if (lastRun?.ran_at) {
      const lastRunDate = new Date(lastRun.ran_at)
      if (lastRunDate > seasonEnd) {
        return NextResponse.json({ message: 'Season reset already completed' })
      }
    }

    let totalPrizesPaid = 0

    // Award top players per game
    for (const game of GAMES) {
      const eloField = `${game}_elo`
      const { data: topPlayers } = await supabase
        .from('players')
        .select('id, username, cs2_elo, dota2_elo, deadlock_elo')
        .order(eloField, { ascending: false })
        .limit(10)

      if (topPlayers) {
        for (let i = 0; i < topPlayers.length && i < SEASON_END_PRIZES.length; i++) {
          const player = topPlayers[i]
          const prize = SEASON_END_PRIZES[i]

          await supabase.rpc('increment_balance', {
            player_id: player.id,
            field: 'usdc_balance',
            amount: prize.amount,
          })

          await supabase.from('transactions').insert({
            player_id: player.id,
            type: 'season_prize',
            amount: prize.amount,
            note: `Season ${SEASON_CONFIG.season} — #${i + 1} ${game.toUpperCase()} (${ (player as any)[eloField]} ELO)`,
          })

          totalPrizesPaid += prize.amount
        }
      }
    }

    // Soft reset ALL player ELOs (move 50% toward 1000)
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, cs2_elo, dota2_elo, deadlock_elo')

    if (allPlayers) {
      for (const p of allPlayers) {
        await supabase.from('players').update({
          cs2_elo: seasonReset(p.cs2_elo ?? 1000),
          dota2_elo: seasonReset(p.dota2_elo ?? 1000),
          deadlock_elo: seasonReset(p.deadlock_elo ?? 1000),
          current_streak: 0,
        }).eq('id', p.id)
      }
    }

    // Reset battle pass progress for the new season
    // (Keep old records for history, just don't delete)

    await recordCronRun('season-reset', 'ok', { message: `Season ${SEASON_CONFIG.season} ended. ${allPlayers?.length ?? 0} players reset. $${totalPrizesPaid} prizes paid.`, durationMs: Date.now() - start })
    return NextResponse.json({
      success: true,
      playersReset: allPlayers?.length ?? 0,
      totalPrizesPaid,
    })
  } catch (err) {
    await recordCronRun('season-reset', 'error', { message: String(err), durationMs: Date.now() - start })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
