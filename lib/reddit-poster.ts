/**
 * lib/reddit-poster.ts — Reddit API integration for RaiseGG marketing
 *
 * Posts content, comments, and searches Reddit via OAuth2.
 * Uses fetch only (no npm package needed).
 *
 * Auth strategy:
 *   1. REDDIT_ACCESS_TOKEN — direct bearer token (fastest, expires ~24h)
 *   2. REDDIT_SESSION_COOKIE — session cookie to refresh tokens (lasts ~6 months)
 *   3. REDDIT_CLIENT_ID + password grant — fallback if script app exists
 *
 * Rate limiting: max 1 post per 10 minutes (Reddit's rate limit).
 */

const REDDIT_API_BASE = 'https://oauth.reddit.com'
const USER_AGENT = 'web:com.raisegg.app:v1.0.0 (by /u/RaiseGG)'

// Minimum gap between posts (ms) — 10 minutes
const MIN_POST_INTERVAL_MS = 10 * 60 * 1000

// In-memory tracking of last post time (persists per serverless invocation)
let lastPostTime = 0

// Cached token
let cachedToken: { token: string; expiresAt: number } | null = null

// ─── Config check ──────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(
    process.env.REDDIT_ACCESS_TOKEN ||
    process.env.REDDIT_SESSION_COOKIE ||
    (process.env.REDDIT_USERNAME && process.env.REDDIT_PASSWORD && process.env.REDDIT_CLIENT_ID)
  )
}

// ─── OAuth2 Token ──────────────────────────────────────────────────────────

/**
 * Get OAuth2 bearer token.
 * Tries: direct token → session cookie refresh → password grant.
 */
export async function getRedditToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  // Strategy 1: Direct access token from env
  if (process.env.REDDIT_ACCESS_TOKEN) {
    // Decode JWT to check expiry
    try {
      const parts = process.env.REDDIT_ACCESS_TOKEN.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      const expiresAt = payload.exp * 1000
      if (Date.now() < expiresAt - 60_000) {
        cachedToken = { token: process.env.REDDIT_ACCESS_TOKEN, expiresAt }
        return cachedToken.token
      }
    } catch {
      // If JWT decode fails, try using it anyway
      cachedToken = { token: process.env.REDDIT_ACCESS_TOKEN, expiresAt: Date.now() + 3600_000 }
      return cachedToken.token
    }
  }

  // Strategy 2: Refresh via session cookie
  if (process.env.REDDIT_SESSION_COOKIE) {
    try {
      const res = await fetch('https://www.reddit.com/', {
        headers: {
          'Cookie': `reddit_session=${process.env.REDDIT_SESSION_COOKIE}`,
          'User-Agent': USER_AGENT,
        },
        redirect: 'manual',
      })
      // Look for token_v2 in set-cookie
      const setCookies = res.headers.getSetCookie?.() || []
      for (const sc of setCookies) {
        const match = sc.match(/token_v2=([^;]+)/)
        if (match) {
          const token = match[1]
          // Verify it works
          const testRes = await fetch(`${REDDIT_API_BASE}/api/v1/me`, {
            headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': USER_AGENT },
          })
          if (testRes.ok) {
            cachedToken = { token, expiresAt: Date.now() + 23 * 3600_000 }
            return cachedToken.token
          }
        }
      }
    } catch {
      // Session cookie refresh failed, fall through
    }
  }

  // Strategy 3: Password grant (requires script app)
  if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_USERNAME && process.env.REDDIT_PASSWORD) {
    const clientId = process.env.REDDIT_CLIENT_ID
    const clientSecret = process.env.REDDIT_CLIENT_SECRET || ''
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: process.env.REDDIT_USERNAME,
        password: process.env.REDDIT_PASSWORD,
      }).toString(),
    })

    if (res.ok) {
      const data = await res.json() as { access_token: string; expires_in: number }
      if (data.access_token) {
        cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
        return cachedToken.token
      }
    }
  }

  throw new Error('Reddit auth failed: no valid token, session cookie, or credentials available')
}

// ─── API helper ────────────────────────────────────────────────────────────

interface RedditApiResult<T = Record<string, unknown>> {
  ok: boolean
  data?: T
  error?: string
}

async function redditFetch<T = Record<string, unknown>>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST'
    body?: URLSearchParams
  } = {}
): Promise<RedditApiResult<T>> {
  try {
    const token = await getRedditToken()
    const url = `${REDDIT_API_BASE}${endpoint}`

    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: options.body?.toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Reddit API ${res.status}: ${text}` }
    }

    const data = await res.json() as T
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Rate limiting ─────────────────────────────────────────────────────────

function checkRateLimit(): { allowed: boolean; waitMs: number } {
  const now = Date.now()
  const elapsed = now - lastPostTime
  if (elapsed < MIN_POST_INTERVAL_MS) {
    return { allowed: false, waitMs: MIN_POST_INTERVAL_MS - elapsed }
  }
  return { allowed: true, waitMs: 0 }
}

function recordPost(): void {
  lastPostTime = Date.now()
}

// ─── Submit Post ───────────────────────────────────────────────────────────

interface SubmitResult {
  ok: boolean
  postUrl?: string
  postId?: string
  error?: string
  rateLimited?: boolean
  waitMs?: number
}

/**
 * Submit a post to a subreddit.
 * Enforces 10-minute rate limit between posts.
 */
export async function submitPost(
  subreddit: string,
  title: string,
  body: string,
  type: 'self' | 'link' = 'self'
): Promise<SubmitResult> {
  // Check rate limit
  const rl = checkRateLimit()
  if (!rl.allowed) {
    return {
      ok: false,
      rateLimited: true,
      waitMs: rl.waitMs,
      error: `Rate limited. Wait ${Math.ceil(rl.waitMs / 1000)}s before next post.`,
    }
  }

  const params = new URLSearchParams({
    sr: subreddit,
    kind: type,
    title,
    resubmit: 'true',
    api_type: 'json',
  })

  if (type === 'self') {
    params.set('text', body)
  } else {
    params.set('url', body)
  }

  let res = await redditFetch<{
    json: {
      errors: string[][]
      data?: { url: string; id: string; name: string }
    }
  }>('/api/submit', { method: 'POST', body: params })

  // If flair required, fetch available flairs and retry with first one
  if (res.data?.json?.errors?.some(e => e[0] === 'SUBMIT_VALIDATION_FLAIR_REQUIRED')) {
    const flairRes = await redditFetch<Array<{ id: string; text: string }>>(
      `/r/${subreddit}/api/link_flair_v2`
    )
    if (flairRes.ok && flairRes.data && flairRes.data.length > 0) {
      // Pick the most relevant flair or first available
      const gaming = flairRes.data.find(f => /gaming|game|discussion|general|other|misc/i.test(f.text))
      const flair = gaming || flairRes.data[0]
      params.set('flair_id', flair.id)
      params.set('flair_text', flair.text)
      res = await redditFetch('/api/submit', { method: 'POST', body: params })
    }
  }

  if (!res.ok) {
    return { ok: false, error: res.error }
  }

  const json = res.data?.json
  if (json?.errors && json.errors.length > 0) {
    return {
      ok: false,
      error: json.errors.map(e => e.join(': ')).join('; '),
    }
  }

  // Record successful post for rate limiting
  recordPost()

  return {
    ok: true,
    postUrl: json?.data?.url,
    postId: json?.data?.name,
  }
}

// ─── Submit Comment ────────────────────────────────────────────────────────

interface CommentResult {
  ok: boolean
  commentId?: string
  error?: string
}

/**
 * Comment on a post or reply to a comment.
 * @param thingId — fullname of the parent (e.g. "t3_abc123" for a post, "t1_xyz" for a comment)
 * @param body — markdown comment text
 */
export async function submitComment(
  thingId: string,
  body: string
): Promise<CommentResult> {
  const params = new URLSearchParams({
    thing_id: thingId,
    text: body,
    api_type: 'json',
  })

  const res = await redditFetch<{
    json: {
      errors: string[][]
      data?: { things: Array<{ data: { id: string; name: string } }> }
    }
  }>('/api/comment', { method: 'POST', body: params })

  if (!res.ok) {
    return { ok: false, error: res.error }
  }

  const json = res.data?.json
  if (json?.errors && json.errors.length > 0) {
    return {
      ok: false,
      error: json.errors.map(e => e.join(': ')).join('; '),
    }
  }

  const commentName = json?.data?.things?.[0]?.data?.name
  return { ok: true, commentId: commentName }
}

// ─── Search Posts ──────────────────────────────────────────────────────────

interface RedditPost {
  id: string
  name: string            // fullname e.g. "t3_abc123"
  title: string
  selftext: string
  url: string
  permalink: string
  subreddit: string
  author: string
  score: number
  num_comments: number
  created_utc: number
}

interface SearchResult {
  ok: boolean
  posts?: RedditPost[]
  error?: string
}

/**
 * Search a subreddit for posts matching a query.
 * Useful for finding posts to comment on organically.
 */
export async function searchPosts(
  subreddit: string,
  query: string,
  sort: 'relevance' | 'new' | 'hot' | 'top' = 'new',
  limit: number = 10
): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: 'true',
    sort,
    limit: String(limit),
    t: 'week',   // time filter: last week
  })

  const res = await redditFetch<{
    data: {
      children: Array<{ data: RedditPost }>
    }
  }>(`/r/${subreddit}/search?${params.toString()}`)

  if (!res.ok) {
    return { ok: false, error: res.error }
  }

  const posts = res.data?.data?.children?.map(c => c.data) ?? []
  return { ok: true, posts }
}

// ─── Get Hot Posts ─────────────────────────────────────────────────────────

interface HotPostsResult {
  ok: boolean
  posts?: RedditPost[]
  error?: string
}

/**
 * Get hot posts from a subreddit.
 * Useful for understanding current discussion topics.
 */
export async function getHotPosts(
  subreddit: string,
  limit: number = 10
): Promise<HotPostsResult> {
  const params = new URLSearchParams({
    limit: String(limit),
  })

  const res = await redditFetch<{
    data: {
      children: Array<{ data: RedditPost }>
    }
  }>(`/r/${subreddit}/hot?${params.toString()}`)

  if (!res.ok) {
    return { ok: false, error: res.error }
  }

  const posts = res.data?.data?.children?.map(c => c.data) ?? []
  return { ok: true, posts }
}

// ─── Submit Poll ──────────────────────────────────────────────────────────

interface PollResult {
  ok: boolean
  postUrl?: string
  postId?: string
  error?: string
}

/**
 * Submit a Reddit native poll to a subreddit.
 * @param subreddit — target sub
 * @param title — poll title
 * @param options — array of 2-6 poll option strings
 * @param body — optional body text
 * @param duration — poll duration in days (1-7, default 3)
 */
export async function submitPoll(
  subreddit: string,
  title: string,
  options: string[],
  body?: string,
  duration: number = 3
): Promise<PollResult> {
  const rl = checkRateLimit()
  if (!rl.allowed) {
    return { ok: false, error: `Rate limited. Wait ${Math.ceil(rl.waitMs / 1000)}s.` }
  }

  const params = new URLSearchParams({
    sr: subreddit,
    kind: 'poll',
    title,
    resubmit: 'true',
    api_type: 'json',
    duration: String(duration),
  })

  if (body) params.set('text', body)

  // Reddit polls use repeated "options" params
  for (const opt of options) {
    params.append('options', opt)
  }

  const res = await redditFetch<{
    json: {
      errors: string[][]
      data?: { url: string; id: string; name: string }
    }
  }>('/api/submit', { method: 'POST', body: params })

  if (!res.ok) return { ok: false, error: res.error }

  const json = res.data?.json
  if (json?.errors && json.errors.length > 0) {
    return { ok: false, error: json.errors.map(e => e.join(': ')).join('; ') }
  }

  recordPost()
  return { ok: true, postUrl: json?.data?.url, postId: json?.data?.name }
}

// ─── Exported types ────────────────────────────────────────────────────────

export type { RedditPost, SubmitResult, CommentResult, SearchResult, HotPostsResult, PollResult }
