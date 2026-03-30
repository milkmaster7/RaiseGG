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

/** Check if Twitch credentials are configured (Helix API or GQL fallback) */
export function isConfigured(): boolean {
  // Always true — GQL fallback works without credentials
  return true
}

/** Check if full Helix API is available */
function hasHelixCredentials(): boolean {
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

// ─── Twitch GQL (no auth needed) ──────────────────────────────────────────

const TWITCH_GQL_URL = 'https://gql.twitch.tv/gql'
const TWITCH_PUBLIC_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'

const GAME_NAMES: Record<string, string> = {
  cs2: 'Counter-Strike',
  'counter-strike': 'Counter-Strike',
  dota2: 'Dota 2',
  'dota 2': 'Dota 2',
  deadlock: 'Deadlock',
}

/** Search streams via Twitch GQL — works without any credentials */
async function gqlSearchStreams(gameName: string, limit = 30): Promise<StreamerInfo[]> {
  const query = `
    query {
      game(name: "${gameName}") {
        streams(first: ${limit}) {
          edges {
            node {
              id
              title
              viewersCount
              broadcaster {
                id
                login
                displayName
                description
                profileImageURL(width: 150)
              }
              game {
                name
              }
            }
          }
        }
      }
    }
  `

  try {
    const res = await fetch(TWITCH_GQL_URL, {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_PUBLIC_CLIENT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return []
    const data = await res.json()

    const edges = data?.data?.game?.streams?.edges ?? []
    return edges.map((e: any) => {
      const node = e.node
      const broadcaster = node.broadcaster
      return {
        userId: broadcaster?.id ?? '',
        username: broadcaster?.login ?? '',
        displayName: broadcaster?.displayName ?? '',
        viewerCount: node.viewersCount ?? 0,
        language: '', // GQL doesn't return language in this query
        profileUrl: `https://twitch.tv/${broadcaster?.login ?? ''}`,
        description: broadcaster?.description ?? '',
        gameName: node.game?.name ?? gameName,
        title: node.title ?? '',
        thumbnailUrl: broadcaster?.profileImageURL ?? '',
      }
    })
  } catch (err) {
    console.error('Twitch GQL error:', err)
    return []
  }
}

/**
 * Search for live streamers of a specific game filtered by viewer range.
 * Uses Helix API if credentials exist, falls back to GQL (no auth needed).
 */
export async function searchStreamers(
  game: string,
  language: string,
  minViewers: number = 20,
  maxViewers: number = 200
): Promise<StreamerInfo[]> {
  // Try Helix API first if credentials exist
  if (hasHelixCredentials()) {
    try {
      return await searchStreamersHelix(game, language, minViewers, maxViewers)
    } catch (err) {
      console.warn('Helix API failed, falling back to GQL:', err)
    }
  }

  // Fallback: GQL (no credentials needed)
  const resolvedName = GAME_NAMES[game.toLowerCase()] ?? game
  const allStreams = await gqlSearchStreams(resolvedName, 50)

  return allStreams
    .filter(s => s.viewerCount >= minViewers && s.viewerCount <= maxViewers)
    .sort((a, b) => b.viewerCount - a.viewerCount)
}

/** Helix API search (requires TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET) */
async function searchStreamersHelix(
  game: string,
  language: string,
  minViewers: number,
  maxViewers: number
): Promise<StreamerInfo[]> {
  const gameId = GAME_IDS[game.toLowerCase()] ?? game

  const streamers: StreamerInfo[] = []
  let cursor: string | undefined

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

  streamers.sort((a, b) => b.viewerCount - a.viewerCount)
  return streamers
}

/**
 * Get a streamer's channel info including linked socials.
 * Pulls from the users endpoint and channel info.
 */
export async function getStreamerSocials(
  userId: string,
  descriptionHint?: string
): Promise<StreamerWithSocials['socials']> {
  const socials: StreamerWithSocials['socials'] = {}

  try {
    let desc = descriptionHint ?? ''

    // Try Helix API for user info if available
    if (hasHelixCredentials() && !desc) {
      try {
        const userData = await helixFetch('users', { id: userId })
        const user = userData.data?.[0]
        desc = user?.description ?? ''
      } catch {}
    }

    if (desc) {
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
          const socials = await getStreamerSocials(s.userId, s.description)

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
