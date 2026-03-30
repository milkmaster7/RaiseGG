/**
 * Cron: Weekly streamer discovery
 *
 * Searches Twitch for CS2 + Dota 2 micro-influencers in target languages
 * and posts a summary to the RaiseGG Telegram channel.
 *
 * Schedule: Weekly (configured separately in vercel.json or external scheduler)
 */

import { NextResponse } from 'next/server'
import { isConfigured, buildOutreachList, type StreamerWithSocials } from '@/lib/twitch-outreach'
import { getOutreachMessage } from '@/lib/outreach-templates'
import { recordCronRun } from '@/lib/monitor'
import { postToChannel } from '@/lib/telegram'

export const maxDuration = 120

// ─── Config ─────────────────────────────────────────────────────────────────

const TARGET_GAMES = ['cs2', 'dota2']
const TARGET_LANGUAGES = ['tr', 'ro', 'ru', 'sr', 'pl']
const VIEWER_RANGE = { min: 20, max: 300 }

// ─── Handler ────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('streamer-discovery', 'error', {
      message: 'Twitch API not configured',
    })
    return NextResponse.json({ error: 'Twitch API not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    // Discover streamers across all target games and languages
    const streamers = await buildOutreachList(TARGET_GAMES, TARGET_LANGUAGES, VIEWER_RANGE)

    // Attach outreach messages
    const withMessages: StreamerWithSocials[] = streamers.map(s => ({
      ...s,
      outreachMessage: getOutreachMessage(s.language, s.displayName),
    }))

    // Build stats by game and language
    const byGame: Record<string, number> = {}
    const byLang: Record<string, number> = {}
    for (const s of withMessages) {
      byGame[s.gameName] = (byGame[s.gameName] ?? 0) + 1
      byLang[s.language] = (byLang[s.language] ?? 0) + 1
    }

    const gameBreakdown = Object.entries(byGame)
      .map(([g, c]) => `${g}: ${c}`)
      .join(', ')

    const langBreakdown = Object.entries(byLang)
      .map(([l, c]) => `${l}: ${c}`)
      .join(', ')

    // Post summary to Telegram channel
    const topStreamers = withMessages
      .slice(0, 5)
      .map(s => `  - ${s.displayName} (${s.gameName}, ${s.viewerCount} viewers, ${s.language})`)
      .join('\n')

    const telegramMsg = [
      `<b>Weekly Streamer Discovery Report</b>`,
      ``,
      `Found <b>${withMessages.length}</b> new streamers this week for outreach.`,
      ``,
      `<b>By game:</b> ${gameBreakdown || 'none'}`,
      `<b>By language:</b> ${langBreakdown || 'none'}`,
      ``,
      withMessages.length > 0 ? `<b>Top prospects:</b>\n${topStreamers}` : '',
      ``,
      `Viewer range: ${VIEWER_RANGE.min}-${VIEWER_RANGE.max}`,
    ].filter(Boolean).join('\n')

    await postToChannel(telegramMsg)

    const durationMs = Date.now() - start

    await recordCronRun('streamer-discovery', 'ok', {
      message: `Found ${withMessages.length} streamers (${gameBreakdown}). Languages: ${langBreakdown}`,
      durationMs,
    })

    return NextResponse.json({
      ok: true,
      count: withMessages.length,
      byGame,
      byLang,
      durationMs,
      streamers: withMessages,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    await recordCronRun('streamer-discovery', 'error', {
      message,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
