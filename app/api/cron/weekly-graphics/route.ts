/**
 * GET /api/cron/weekly-graphics — Weekly cron that generates marketing graphics
 * and posts them to the @raise_GG Telegram channel.
 *
 * Generates:
 *   1. Weekly platform stats image
 *   2. City leaderboard image
 *
 * Posts both via Telegram Bot sendPhoto (multipart with buffer).
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'
import { generateWeeklyStats, generateCityLeaderboard } from '@/lib/social-graphics'

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? ''
const CHANNEL_ID = () => process.env.TELEGRAM_CHANNEL_ID ?? process.env.TELEGRAM_CHAT_ID ?? ''

// ─── Telegram photo upload (buffer, not URL) ───────────────────────────────

async function sendPhotoBuffer(
  buf: Buffer,
  caption: string,
  filename: string
): Promise<boolean> {
  const token = BOT_TOKEN()
  const chatId = CHANNEL_ID()
  if (!token || !chatId) return false

  try {
    // Build multipart/form-data manually
    const boundary = '----RaiseGGBoundary' + Date.now()
    const parts: Buffer[] = []

    // chat_id field
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`
    ))

    // caption field
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`
    ))

    // parse_mode field
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`
    ))

    // photo file
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`
    ))
    parts.push(buf)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

    const body = Buffer.concat(parts)

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
      signal: AbortSignal.timeout(15000),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const supabase = createServiceClient()
  const posted: string[] = []

  try {
    // ── Gather weekly data from DB ────────────────────────────────────────

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Total completed matches this week
    const { count: totalMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', weekAgo)

    // Total prize money (sum of stakes for completed matches)
    const { data: stakeRows } = await supabase
      .from('matches')
      .select('stake_amount')
      .eq('status', 'completed')
      .gte('completed_at', weekAgo)

    const totalPrize = (stakeRows ?? []).reduce(
      (sum, r) => sum + (parseFloat(r.stake_amount) || 0),
      0
    )

    // Top player by wins this week
    const { data: topPlayerRows } = await supabase
      .from('matches')
      .select('winner_id, profiles!matches_winner_id_fkey(username)')
      .eq('status', 'completed')
      .gte('completed_at', weekAgo)
      .not('winner_id', 'is', null)

    const winCounts: Record<string, { count: number; username: string }> = {}
    for (const row of topPlayerRows ?? []) {
      const id = row.winner_id as string
      const name =
        (row.profiles as { username?: string } | null)?.username ?? 'Unknown'
      if (!winCounts[id]) winCounts[id] = { count: 0, username: name }
      winCounts[id].count++
    }
    const topPlayerEntry = Object.values(winCounts).sort(
      (a, b) => b.count - a.count
    )[0]
    const topPlayer = topPlayerEntry?.username ?? 'N/A'

    // Top city by wins this week
    const { data: cityRows } = await supabase
      .from('matches')
      .select('winner_id, profiles!matches_winner_id_fkey(city)')
      .eq('status', 'completed')
      .gte('completed_at', weekAgo)
      .not('winner_id', 'is', null)

    const cityCounts: Record<string, number> = {}
    for (const row of cityRows ?? []) {
      const city =
        (row.profiles as { city?: string } | null)?.city ?? 'Unknown'
      if (city && city !== 'Unknown') {
        cityCounts[city] = (cityCounts[city] || 0) + 1
      }
    }
    const sortedCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
    const topCity = sortedCities[0]?.[0] ?? 'N/A'

    // ── Generate weekly stats graphic ─────────────────────────────────────

    const now = new Date()
    const weekLabel = `Week of ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    const statsBuf = generateWeeklyStats({
      totalMatches: totalMatches ?? 0,
      totalPrizeMoney: `$${totalPrize.toFixed(2)}`,
      topPlayer,
      topCity,
      weekLabel,
    })

    const statsPosted = await sendPhotoBuffer(
      statsBuf,
      `<b>Weekly Recap</b>\n\n${totalMatches ?? 0} matches played this week!\n\nTop player: <b>${topPlayer}</b>\nTop city: <b>${topCity}</b>\n\n<a href="https://raisegg.com">Play now at raisegg.com</a>`,
      'weekly-stats.png'
    )
    if (statsPosted) posted.push('weekly-stats')

    // ── Generate city leaderboard graphic ─────────────────────────────────

    // Build top 5 cities with flag placeholders
    const cityLeaderboardData = sortedCities.slice(0, 5).map(([name, wins]) => ({
      name,
      flag: getCityFlag(name),
      wins,
    }))

    if (cityLeaderboardData.length >= 2) {
      const leaderboardBuf = generateCityLeaderboard({
        cities: cityLeaderboardData,
        game: 'CS2',
      })

      const lbPosted = await sendPhotoBuffer(
        leaderboardBuf,
        `<b>City Leaderboard</b>\n\nWhich city dominates CS2 this week?\n\n${cityLeaderboardData.map((c, i) => `${i + 1}. ${c.flag} ${c.name} — ${c.wins}W`).join('\n')}\n\n<a href="https://raisegg.com">Represent your city!</a>`,
        'city-leaderboard.png'
      )
      if (lbPosted) posted.push('city-leaderboard')
    }

    // ── Record cron run ───────────────────────────────────────────────────

    await recordCronRun('weekly-graphics', 'ok', {
      message: `Posted ${posted.length} graphics: ${posted.join(', ') || 'none'}`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      posted,
      stats: {
        totalMatches: totalMatches ?? 0,
        totalPrize: `$${totalPrize.toFixed(2)}`,
        topPlayer,
        topCity,
      },
      durationMs: Date.now() - start,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await recordCronRun('weekly-graphics', 'error', {
      message: msg,
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Best-effort country flag for known cities */
function getCityFlag(city: string): string {
  const flags: Record<string, string> = {
    moscow: '🇷🇺',
    'saint petersburg': '🇷🇺',
    istanbul: '🇹🇷',
    ankara: '🇹🇷',
    berlin: '🇩🇪',
    munich: '🇩🇪',
    bangkok: '🇹🇭',
    warsaw: '🇵🇱',
    krakow: '🇵🇱',
    kyiv: '🇺🇦',
    paris: '🇫🇷',
    london: '🇬🇧',
    stockholm: '🇸🇪',
    copenhagen: '🇩🇰',
    helsinki: '🇫🇮',
    tokyo: '🇯🇵',
    seoul: '🇰🇷',
    singapore: '🇸🇬',
    dubai: '🇦🇪',
    'new york': '🇺🇸',
    'los angeles': '🇺🇸',
    'sao paulo': '🇧🇷',
    'buenos aires': '🇦🇷',
    'toronto': '🇨🇦',
    'sydney': '🇦🇺',
    'melbourne': '🇦🇺',
    'beijing': '🇨🇳',
    'shanghai': '🇨🇳',
    'manila': '🇵🇭',
    'jakarta': '🇮🇩',
    'mumbai': '🇮🇳',
  }
  return flags[city.toLowerCase()] ?? '🏙️'
}
