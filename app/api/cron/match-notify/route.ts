import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

// Runs every 5 minutes — checks for new open matches and notifies nearby-ELO players
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const supabase = createServiceClient()

  try {
    // Get matches created in the last 5 minutes that are still open
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: newMatches } = await supabase
      .from('matches')
      .select('id, game, stake_amount, player_a_id, player_a:players!player_a_id(cs2_elo, dota2_elo, deadlock_elo, username)')
      .eq('status', 'open')
      .eq('is_practice', false)
      .is('challenged_player_id', null)
      .gte('created_at', fiveMinAgo)

    if (!newMatches || newMatches.length === 0) {
      await recordCronRun('match-notify', 'ok', { message: 'No new matches' })
      return NextResponse.json({ notified: 0 })
    }

    let totalNotified = 0

    for (const match of newMatches) {
      const playerA = match.player_a as any
      const eloKey = `${match.game}_elo`
      const creatorElo = playerA?.[eloKey] ?? 1000

      // Find players within 400 ELO who have push subscriptions
      const minElo = creatorElo - 400
      const maxElo = creatorElo + 400

      const { data: nearbyPlayers } = await supabase
        .from('players')
        .select('id')
        .neq('id', match.player_a_id)
        .gte(eloKey, minElo)
        .lte(eloKey, maxElo)
        .eq('eligible', true)
        .limit(50)

      if (!nearbyPlayers || nearbyPlayers.length === 0) continue

      // Check which of these players have push subscriptions
      const playerIds = nearbyPlayers.map(p => p.id)
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('player_id')
        .in('player_id', playerIds)

      if (!subs || subs.length === 0) continue

      // Send notifications via internal API (non-blocking)
      const uniquePlayerIds = [...new Set(subs.map(s => s.player_id))]
      for (const pid of uniquePlayerIds) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://raisegg.com'}/api/notifications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({
              type: 'match_found',
              playerId: pid,
              details: {
                game: match.game,
                stake: match.stake_amount,
                creator: playerA?.username,
              },
            }),
            signal: AbortSignal.timeout(3000),
          })
          totalNotified++
        } catch {
          // Non-critical
        }
      }
    }

    await recordCronRun('match-notify', 'ok', { message: `Notified ${totalNotified} players`, durationMs: Date.now() - start })
    return NextResponse.json({ notified: totalNotified })
  } catch (err) {
    await recordCronRun('match-notify', 'error', { message: String(err), durationMs: Date.now() - start })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
