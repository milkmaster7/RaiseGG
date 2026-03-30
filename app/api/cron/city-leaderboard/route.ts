import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'
import { generateCityLeaderboard } from '@/lib/social-graphics'

// Country code → flag emoji
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '\u{1F3F3}'
  const upper = code.toUpperCase()
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

/**
 * GET /api/cron/city-leaderboard
 *
 * Weekly cron: generates a city leaderboard image and posts it to the
 * @raise_GG Telegram channel.
 */
export async function GET(req: NextRequest) {
  const start = Date.now()

  try {
    // Auth check — cron secret
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Fetch all players with cities
    const { data: players, error } = await supabase
      .from('players')
      .select('city, country, cs2_wins, dota2_wins, deadlock_wins')
      .not('city', 'is', null)

    if (error) throw new Error(`Supabase error: ${error.message}`)

    if (!players || players.length === 0) {
      await recordCronRun('city-leaderboard', 'ok', {
        message: 'No city data to post',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ ok: true, skipped: true, reason: 'No city data' })
    }

    // Aggregate wins per city
    const cityMap = new Map<string, { city: string; country: string; wins: number }>()

    for (const p of players) {
      const key = (p.city as string).toLowerCase().trim()
      if (!key) continue
      const wins = (p.cs2_wins ?? 0) + (p.dota2_wins ?? 0) + (p.deadlock_wins ?? 0)
      if (!cityMap.has(key)) {
        cityMap.set(key, { city: p.city as string, country: (p.country as string) ?? '', wins: 0 })
      }
      cityMap.get(key)!.wins += wins
    }

    const sorted = Array.from(cityMap.values())
      .sort((a, b) => b.wins - a.wins)

    if (sorted.length === 0) {
      await recordCronRun('city-leaderboard', 'ok', {
        message: 'No cities with data',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ ok: true, skipped: true, reason: 'No cities with data' })
    }

    // Generate image using the social-graphics helper
    const top10 = sorted.slice(0, 10)
    const imageBuffer = generateCityLeaderboard({
      cities: top10.map((c) => ({
        name: c.city,
        flag: countryFlag(c.country),
        wins: c.wins,
      })),
      game: 'CS2',
    })

    // Build Telegram caption with top 5
    const top5 = sorted.slice(0, 5)
    const captionLines = [
      '\u{1F3C6} <b>Weekly City Leaderboard</b>',
      '',
      ...top5.map((c, i) => {
        const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `#${i + 1}`
        return `${medal} ${countryFlag(c.country)} <b>${c.city}</b> \u2014 ${c.wins} wins`
      }),
      '',
      '\u{1F4AA} Think your city can dominate?',
      '\u{1F3AE} Play at raisegg.com',
    ]
    const caption = captionLines.join('\n')

    // Post to Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const channelId = process.env.TELEGRAM_CHANNEL_ID ?? '@raise_GG'

    if (!botToken) {
      await recordCronRun('city-leaderboard', 'error', {
        message: 'TELEGRAM_BOT_TOKEN not set',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 })
    }

    // Send as multipart form data
    const formData = new FormData()
    formData.append('chat_id', channelId)
    formData.append('caption', caption)
    formData.append('parse_mode', 'HTML')
    formData.append('photo', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'city-leaderboard.png')

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(15000),
      }
    )

    const tgJson = await tgRes.json()

    if (!tgRes.ok) {
      await recordCronRun('city-leaderboard', 'error', {
        message: `Telegram error: ${tgJson.description ?? tgRes.status}`,
        durationMs: Date.now() - start,
      })
      return NextResponse.json(
        { ok: false, error: `Telegram: ${tgJson.description ?? tgRes.status}` },
        { status: 500 }
      )
    }

    await recordCronRun('city-leaderboard', 'ok', {
      message: `Posted top ${top10.length} cities to Telegram`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      citiesPosted: top10.length,
      telegramMessageId: tgJson.result?.message_id,
      durationMs: Date.now() - start,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await recordCronRun('city-leaderboard', 'error', {
      message: msg,
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
