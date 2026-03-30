import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { checkVacBans } from '@/lib/vac-check'
import { recordCronRun } from '@/lib/monitor'

const BATCH_SIZE = 50 // Steam API allows up to 100 IDs per call, keep conservative

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch players who haven't been checked in the last 24 hours (or never checked)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: players, error: fetchError } = await supabase
    .from('players')
    .select('id, steam_id')
    .eq('banned', false)
    .or(`last_vac_check.is.null,last_vac_check.lt.${twentyFourHoursAgo}`)
    .limit(BATCH_SIZE)

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch players', detail: fetchError.message }, { status: 500 })
  }

  if (!players || players.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, banned: 0 })
  }

  let bannedCount = 0

  for (const player of players) {
    try {
      const result = await checkVacBans(player.steam_id)

      const updateData: Record<string, unknown> = {
        last_vac_check: new Date().toISOString(),
      }

      if (result.vacBanned || result.gameBans > 0) {
        updateData.banned = true
        updateData.ban_reason = result.vacBanned
          ? `VAC ban detected (${result.numberOfVACBans} ban${result.numberOfVACBans !== 1 ? 's' : ''}, ${result.daysSinceLastBan}d ago)`
          : `Game ban detected (${result.gameBans} ban${result.gameBans !== 1 ? 's' : ''})`
        updateData.vac_banned = true
        updateData.eligible = false
        bannedCount++
      }

      await supabase.from('players').update(updateData).eq('id', player.id)
    } catch (_) {
      // Skip this player on API error, will be retried next run
    }
  }

  await recordCronRun('vac-check', 'ok', { message: `Checked ${players.length}, banned ${bannedCount}` })

  return NextResponse.json({
    ok: true,
    checked: players.length,
    banned: bannedCount,
    time: new Date().toISOString(),
  })
}
