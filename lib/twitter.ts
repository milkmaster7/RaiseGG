/**
 * lib/twitter.ts — Twitter/X posting for RaiseGG
 *
 * Posts blog articles, match results, tournaments, and announcements to @RaiseGG.
 * Uses OAuth 1.0a (User Context) via TWITTER_API_KEY, TWITTER_API_SECRET,
 * TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET env vars.
 *
 * Twitter API v2 — POST /2/tweets
 */

// ─── Auth helpers ──────────────────────────────────────────────────────────

function getCredentials() {
  return {
    apiKey: process.env.TWITTER_API_KEY ?? '',
    apiSecret: process.env.TWITTER_API_SECRET ?? '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN ?? '',
    accessSecret: process.env.TWITTER_ACCESS_SECRET ?? '',
  }
}

function hasCredentials(): boolean {
  const c = getCredentials()
  return !!(c.apiKey && c.apiSecret && c.accessToken && c.accessSecret)
}

/**
 * Generate OAuth 1.0a signature for Twitter API v2.
 * Uses HMAC-SHA1 per RFC 5849.
 */
async function generateOAuthHeader(
  method: string,
  url: string,
  body?: string
): Promise<string> {
  const { apiKey, apiSecret, accessToken, accessSecret } = getCredentials()

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomUUID().replace(/-/g, '')

  const params: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  // Build signature base string
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeRFC3986(k)}=${encodeRFC3986(v)}`)
    .join('&')

  const baseString = [
    method.toUpperCase(),
    encodeRFC3986(url),
    encodeRFC3986(sortedParams),
  ].join('&')

  const signingKey = `${encodeRFC3986(apiSecret)}&${encodeRFC3986(accessSecret)}`

  // HMAC-SHA1
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString))
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))

  params.oauth_signature = signature

  // Only include oauth_* params in the Authorization header
  const header = Object.entries(params)
    .filter(([k]) => k.startsWith('oauth_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeRFC3986(k)}="${encodeRFC3986(v)}"`)
    .join(', ')

  return `OAuth ${header}`
}

function encodeRFC3986(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

// ─── Core tweet ────────────────────────────────────────────────────────────

/** Post a tweet. Returns tweet ID on success, null on failure. */
export async function tweet(text: string): Promise<string | null> {
  const result = await tweetWithDetails(text)
  return result.id
}

/** Post a tweet with full error details — retries on 503/429 */
export async function tweetWithDetails(text: string): Promise<{ id: string | null; error?: string; status?: number }> {
  if (!hasCredentials()) return { id: null, error: 'Missing credentials' }

  // Twitter limit: 280 chars
  const trimmed = text.length > 280 ? text.slice(0, 277) + '...' : text
  const url = 'https://api.twitter.com/2/tweets'
  const body = JSON.stringify({ text: trimmed })

  // Retry up to 3 times on 503/429/5xx
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt))

      const authHeader = await generateOAuthHeader('POST', url, body)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(15000),
      })

      if (res.ok) {
        const data = await res.json()
        return { id: data?.data?.id ?? null }
      }

      const errBody = await res.text().catch(() => '')

      // Don't retry on auth/client errors
      if (res.status < 500 && res.status !== 429) {
        console.error(`Twitter API ${res.status}: ${errBody}`)
        return { id: null, error: errBody, status: res.status }
      }

      console.error(`Twitter API ${res.status} (attempt ${attempt + 1}/3): ${errBody}`)
    } catch (err) {
      console.error(`Twitter error (attempt ${attempt + 1}/3):`, err)
      if (attempt === 2) return { id: null, error: String(err) }
    }
  }

  return { id: null, error: 'All retries failed (503)', status: 503 }
}

// ─── Formatted tweets ──────────────────────────────────────────────────────

/** Tweet a new blog article */
export async function tweetBlogArticle(article: {
  title: string
  slug: string
  excerpt: string
}): Promise<string | null> {
  const url = `https://raisegg.com/blog/${article.slug}`
  const text = `${article.title}\n\n${article.excerpt.slice(0, 160)}${article.excerpt.length > 160 ? '...' : ''}\n\n${url}`
  return tweet(text)
}

/** Tweet a match result */
export async function tweetMatchResult(match: {
  winner: string
  loser: string
  game: string
  score: string
  stake: string
  currency: string
}): Promise<string | null> {
  const gameTag = match.game === 'cs2' ? '#CS2' : match.game === 'dota2' ? '#Dota2' : '#Deadlock'
  const text = `${match.winner} defeats ${match.loser} (${match.score}) for ${match.stake} ${match.currency} ${gameTag}\n\nStake matches live now\nhttps://raisegg.com/play`
  return tweet(text)
}

/** Tweet a tournament announcement */
export async function tweetTournament(tournament: {
  name: string
  game: string
  prizePool: string
  currency: string
  maxPlayers: number
}): Promise<string | null> {
  const gameTag = tournament.game === 'cs2' ? '#CS2' : tournament.game === 'dota2' ? '#Dota2' : '#Deadlock'
  const text = `${tournament.name}\n\n${tournament.prizePool} ${tournament.currency} prize pool | ${tournament.maxPlayers} slots\n\nSign up now ${gameTag}\nhttps://raisegg.com/tournaments`
  return tweet(text)
}

/** Tweet platform announcement */
export async function tweetAnnouncement(
  title: string,
  body: string,
  link?: string
): Promise<string | null> {
  const url = link ?? 'https://raisegg.com'
  const text = `${title}\n\n${body.slice(0, 180)}${body.length > 180 ? '...' : ''}\n\n${url}`
  return tweet(text)
}

/** Tweet daily stats summary */
export async function tweetDailyStats(stats: {
  matchesPlayed: number
  totalStaked: string
  currency: string
  topPlayer: string
}): Promise<string | null> {
  const text = `RaiseGG Daily Recap\n\n${stats.matchesPlayed} matches played\n${stats.totalStaked} ${stats.currency} staked\nTop player: ${stats.topPlayer}\n\nJoin the action\nhttps://raisegg.com/play\n\n#esports #CS2 #Dota2`
  return tweet(text)
}
