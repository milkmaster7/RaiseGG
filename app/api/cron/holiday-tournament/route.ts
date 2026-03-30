/**
 * Cron: Holiday tournament scheduler
 * Runs daily — checks for holidays within 3 days and creates themed tournaments.
 * Posts announcements to the @raise_GG Telegram channel.
 *
 * Schedule: Once daily
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'
import {
  getUpcomingHolidays,
  generateHolidayTournament,
  getHolidayMessages,
} from '@/lib/holiday-tournaments'

export const maxDuration = 60

async function sendTelegramAnnouncement(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const channelId = process.env.TELEGRAM_CHANNEL_ID || '@raise_GG'
  if (!token) return false

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const supabase = createServiceClient()

  try {
    // Find holidays within the next 3 days
    const upcoming = getUpcomingHolidays(3)

    if (upcoming.length === 0) {
      await recordCronRun('holiday-tournament', 'ok', {
        message: 'No upcoming holidays',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ message: 'No upcoming holidays', scheduled: [] })
    }

    const scheduled: Array<{ id: string; name: string; holiday: string }> = []

    for (const holiday of upcoming) {
      const config = generateHolidayTournament(holiday)

      // Check if a tournament for this holiday already exists
      const { data: existing } = await supabase
        .from('tournaments')
        .select('id')
        .eq('name', config.name)
        .gte('starts_at', config.startsAt.split('T')[0] + 'T00:00:00Z')
        .lte('starts_at', config.startsAt.split('T')[0] + 'T23:59:59Z')
        .limit(1)

      if (existing && existing.length > 0) continue

      // Create the tournament
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .insert({
          name: config.name,
          game: config.game,
          format: 'single_elimination',
          bracket_size: config.bracketSize,
          entry_fee: config.entryFee,
          prize_pool: config.prizePool,
          max_players: config.bracketSize,
          starts_at: config.startsAt,
          status: 'registration',
          description: config.description,
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to create holiday tournament: ${error.message}`)
        continue
      }

      scheduled.push({
        id: tournament.id,
        name: config.name,
        holiday: holiday.name,
      })

      // Post announcements to Telegram (best-effort)
      const messages = getHolidayMessages(holiday)
      // Post the first available message (primary language)
      if (messages.length > 0) {
        await sendTelegramAnnouncement(messages[0].text).catch(() => {})
      }
    }

    const msg = scheduled.length > 0
      ? `Scheduled ${scheduled.length} holiday tournament(s): ${scheduled.map(s => s.name).join(', ')}`
      : 'All upcoming holiday tournaments already exist'

    await recordCronRun('holiday-tournament', 'ok', {
      message: msg,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ success: true, scheduled })
  } catch (err) {
    await recordCronRun('holiday-tournament', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
