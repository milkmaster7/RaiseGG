/**
 * lib/twitch-outreach.ts — Twitch Helix API integration for streamer discovery
 *
 * Finds micro-influencer CS2/Dota2 streamers for RaiseGG partnership outreach.
 * Uses raw HTTP fetch (no npm package).
 * Env vars: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StreamerInfo {
  userId: string
  username: string
  displayName: string
  viewerCount: number
  language: string
  profileUrl: string
  description: string
  gameName: string
  title: string
  thumbnailUrl: string
}

export interface StreamerWithSocials extends StreamerInfo {
  socials: {
    twitter?: string
    discord?: string
    telegram?: string
    youtube?: string
    instagram?: string
    website?: string
  }
  outreachMessage?: string
}

// ─── Game ID mapping ────────────────────────────────────────────────────────

const GAME_IDS: Record<string, string> = {
  cs2: '32399',
  'counter-strike': '32399',
  dota2: '29595',
  'dota 2': '29595',
}

// ─── Token cache ────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

// ─── Core functions ─────────────────────────────────────────────────────────

/** Check if Twitch credentials are configured */
export function isConfigured(): boolean {
  return !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)
}

/** Get OAuth app access token via client credentials flow */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required')
  }

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  })

  if (!res.ok) {
    throw new Error(`Twitch OAuth failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return cachedToken.token
}

/** Make an authenticated request to the Twitch Helix API */
async function helixFetch(path: string, params?: Record<string, string>): Promise<any> {
  const token = await getAccessToken()
  const clientId = process.env.TWITCH_CLIENT_ID!

  const url = new URL(`https://api.twitch.tv/helix/${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': clientId,
    },
  })

  if (!res.ok) {
    throw new Error(`Twitch API error: ${res.status} ${await res.text()}`)
  }

  return res.json()
}

/**
 * Search for live streamers of a specific game filtered by language and viewer range.
 *
 * @param game - Game key: 'cs2' or 'dota2'
 * @param language - ISO language code: 'tr', 'ro', 'ru', 'sr', 'pl', 'en', etc.
 * @param minViewers - Minimum concurrent viewers (e.g. 20)
 * @param maxViewers - Maximum concurrent viewers (e.g. 200)
 */
export async function searchStreamers(
  game: string,
  language: string,
  minViewers: number = 20,
  maxViewers: number = 200
): Promise<StreamerInfo[]> {
  const gameId = GAME_IDS[game.toLowerCase()] ?? game

  const streamers: StreamerInfo[] = []
  let cursor: string | undefined

  // Paginate through results (max 3 pages = 300 streams)
  for (let page = 0; page < 3; page++) {
    const params: Record<string, string> = {
      game_id: gameId,
      language,
      first: '100',
      type: 'live',
    }
    if (cursor) params.after = cursor

    const data = await helixFetch('streams', params)

    for (const stream of data.data ?? []) {
      const viewers = stream.viewer_count ?? 0
      if (viewers >= minViewers && viewers <= maxViewers) {
        streamers.push({
          userId: stream.user_id,
          username: stream.user_login,
          displayName: stream.user_name,
          viewerCount: viewers,
          language: stream.language,
          profileUrl: `https://twitch.tv/${stream.user_login}`,
          description: stream.title ?? '',
          gameName: stream.game_name ?? game,
          title: stream.title ?? '',
          thumbnailUrl: stream.thumbnail_url ?? '',
        })
      }
    }

    cursor = data.pagination?.cursor
    if (!cursor) break
  }

  // Sort by viewer count descending (best prospects first)
  streamers.sort((a, b) => b.viewerCount - a.viewerCount)

  return streamers
}

/**
 * Get a streamer's channel info including linked socials.
 * Pulls from the users endpoint and channel info.
 */
export async function getStreamerSocials(
  userId: string
): Promise<StreamerWithSocials['socials']> {
  const socials: StreamerWithSocials['socials'] = {}

  try {
    // Get user info (includes description which may contain links)
    const userData = await helixFetch('users', { id: userId })
    const user = userData.data?.[0]

    if (user?.description) {
      const desc = user.description as string
      // Extract social links from bio
      const twitterMatch = desc.match(/(?:twitter\.com|x\.com)\/(\w+)/i)
      if (twitterMatch) socials.twitter = `https://x.com/${twitterMatch[1]}`

      const discordMatch = desc.match(/(?:discord\.gg|discord\.com\/invite)\/(\S+)/i)
      if (discordMatch) socials.discord = `https://discord.gg/${discordMatch[1]}`

      const telegramMatch = desc.match(/(?:t\.me|telegram\.me)\/(\S+)/i)
      if (telegramMatch) socials.telegram = `https://t.me/${telegramMatch[1]}`

      const youtubeMatch = desc.match(/(?:youtube\.com|youtu\.be)\/([\w@-]+)/i)
      if (youtubeMatch) socials.youtube = `https://youtube.com/${youtubeMatch[1]}`

      const instaMatch = desc.match(/(?:instagram\.com)\/(\w+)/i)
      if (instaMatch) socials.instagram = `https://instagram.com/${instaMatch[1]}`
    }

    // Get channel info (may have social links in panels — but panels require
    // extension API which needs different auth, so we use description-based extraction)
  } catch (err) {
    // Non-critical — return whatever we found
    console.warn(`Failed to get socials for user ${userId}:`, err)
  }

  return socials
}

/**
 * Build a full outreach list: discover streamers across multiple games/languages
 * and enrich with social info.
 */
export async function buildOutreachList(
  games: string[] = ['cs2', 'dota2'],
  languages: string[] = ['tr', 'ro', 'ru', 'sr', 'pl'],
  viewerRange: { min: number; max: number } = { min: 20, max: 300 }
): Promise<StreamerWithSocials[]> {
  const allStreamers: StreamerWithSocials[] = []
  const seen = new Set<string>() // dedupe by userId

  for (const game of games) {
    for (const lang of languages) {
      try {
        const streamers = await searchStreamers(game, lang, viewerRange.min, viewerRange.max)

        for (const s of streamers) {
          if (seen.has(s.userId)) continue
          seen.add(s.userId)

          // Rate-limit social lookups to avoid hitting Twitch limits
          const socials = await getStreamerSocials(s.userId)

          allStreamers.push({ ...s, socials })

          // Small delay between social lookups
          await new Promise(r => setTimeout(r, 200))
        }
      } catch (err) {
        console.warn(`Failed to search ${game}/${lang}:`, err)
      }
    }
  }

  return allStreamers
}
