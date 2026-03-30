/**
 * API: Streamer discovery and outreach
 *
 * GET  — Returns cached list of discovered streamers
 * POST — Discover new streamers or generate outreach list
 *
 * Protected by CRON_SECRET via Bearer token.
 */

import { NextResponse } from 'next/server'
import { isConfigured, searchStreamers, buildOutreachList, type StreamerWithSocials } from '@/lib/twitch-outreach'
import { getOutreachMessage, getAvailableLanguages } from '@/lib/outreach-templates'

export const maxDuration = 120

// ─── In-memory cache (24h TTL) ──────────────────────────────────────────────

let cachedStreamers: StreamerWithSocials[] = []
let cacheTimestamp = 0
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function isCacheValid(): boolean {
  return cachedStreamers.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL_MS
}

// ─── Auth helper ────────────────────────────────────────────────────────────

function checkAuth(req: Request): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

// ─── GET: Return cached streamers ───────────────────────────────────────────

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Twitch API not configured. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    cached: isCacheValid(),
    cacheAge: cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / 1000) : null,
    count: cachedStreamers.length,
    streamers: cachedStreamers,
    availableLanguages: getAvailableLanguages(),
  })
}

// ─── POST: Discover or build outreach list ──────────────────────────────────

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Twitch API not configured. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.' },
      { status: 400 }
    )
  }

  let body: {
    action: 'discover' | 'outreach_list'
    games?: string[]
    languages?: string[]
    minViewers?: number
    maxViewers?: number
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body

  try {
    if (action === 'discover') {
      // Search for streamers matching criteria
      const game = body.games?.[0] ?? 'cs2'
      const language = body.languages?.[0] ?? 'tr'
      const minViewers = body.minViewers ?? 20
      const maxViewers = body.maxViewers ?? 300

      const streamers = await searchStreamers(game, language, minViewers, maxViewers)

      return NextResponse.json({
        ok: true,
        action: 'discover',
        game,
        language,
        viewerRange: { min: minViewers, max: maxViewers },
        count: streamers.length,
        streamers,
      })
    }

    if (action === 'outreach_list') {
      // Build full outreach list with socials and pre-written messages
      const games = body.games ?? ['cs2', 'dota2']
      const languages = body.languages ?? ['tr', 'ro', 'ru', 'sr', 'pl']
      const minViewers = body.minViewers ?? 20
      const maxViewers = body.maxViewers ?? 300

      const streamers = await buildOutreachList(games, languages, {
        min: minViewers,
        max: maxViewers,
      })

      // Attach personalized outreach messages
      const withMessages = streamers.map(s => ({
        ...s,
        outreachMessage: getOutreachMessage(s.language, s.displayName),
      }))

      // Update cache
      cachedStreamers = withMessages
      cacheTimestamp = Date.now()

      return NextResponse.json({
        ok: true,
        action: 'outreach_list',
        games,
        languages,
        viewerRange: { min: minViewers, max: maxViewers },
        count: withMessages.length,
        streamers: withMessages,
      })
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Use 'discover' or 'outreach_list'.` },
      { status: 400 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: `Streamer discovery failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
