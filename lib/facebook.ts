/**
 * lib/facebook.ts — Facebook Page API integration for RaiseGG
 *
 * Posts tournament announcements, match highlights, and engagement content
 * to the RaiseGG Facebook Page via the Graph API v19.0.
 *
 * Env vars:
 *   FACEBOOK_PAGE_ID    — Facebook Page numeric ID
 *   FACEBOOK_PAGE_TOKEN — Page Access Token with pages_manage_posts permission
 */

const FB_GRAPH_BASE = 'https://graph.facebook.com/v19.0'

// Rate limit: max 1 post per 2 hours
let lastPostTime = 0
const MIN_POST_INTERVAL_MS = 2 * 60 * 60 * 1000

// ─── Config check ──────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_TOKEN)
}

function getPageId(): string {
  const id = process.env.FACEBOOK_PAGE_ID
  if (!id) throw new Error('FACEBOOK_PAGE_ID not set')
  return id
}

function getToken(): string {
  const token = process.env.FACEBOOK_PAGE_TOKEN
  if (!token) throw new Error('FACEBOOK_PAGE_TOKEN not set')
  return token
}

// ─── Graph API helper ──────────────────────────────────────────────────────

interface FBResponse {
  id?: string
  error?: {
    message: string
    type: string
    code: number
  }
}

async function fbPost(
  endpoint: string,
  params: Record<string, string>
): Promise<{ ok: boolean; id?: string; error?: string }> {
  // Rate limit check
  const now = Date.now()
  if (now - lastPostTime < MIN_POST_INTERVAL_MS) {
    return { ok: false, error: `Rate limited — last post was ${Math.round((now - lastPostTime) / 60000)}m ago (min 120m)` }
  }

  try {
    const url = `${FB_GRAPH_BASE}/${getPageId()}/${endpoint}`
    const body = new URLSearchParams({
      access_token: getToken(),
      ...params,
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    })

    const json: FBResponse = await res.json()

    if (json.error) {
      return { ok: false, error: `FB ${json.error.code}: ${json.error.message}` }
    }

    lastPostTime = now
    return { ok: true, id: json.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Post to Page feed ─────────────────────────────────────────────────────

/** Post a text/link message to the Facebook Page */
export async function postToPage(opts: {
  message: string
  link?: string
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const params: Record<string, string> = {
    message: opts.message,
  }
  if (opts.link) {
    params.link = opts.link
  }
  return fbPost('feed', params)
}

// ─── Post photo to Page ────────────────────────────────────────────────────

/** Post an image with caption to the Facebook Page */
export async function postImageToPage(opts: {
  imageUrl: string
  caption: string
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  return fbPost('photos', {
    url: opts.imageUrl,
    message: opts.caption,
  })
}

// ─── Page Insights ─────────────────────────────────────────────────────────

interface InsightValue {
  value: number
  end_time: string
}

interface InsightMetric {
  name: string
  values: InsightValue[]
}

interface InsightsResponse {
  data?: InsightMetric[]
  error?: {
    message: string
    code: number
  }
}

/** Get page engagement insights for the last 7 days */
export async function getPageInsights(): Promise<{
  ok: boolean
  insights?: Record<string, number>
  error?: string
}> {
  try {
    const metrics = [
      'page_impressions',
      'page_engaged_users',
      'page_post_engagements',
      'page_fan_adds',
    ].join(',')

    const url = `${FB_GRAPH_BASE}/${getPageId()}/insights?metric=${metrics}&period=day&access_token=${getToken()}`

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    const json: InsightsResponse = await res.json()

    if (json.error) {
      return { ok: false, error: `FB ${json.error.code}: ${json.error.message}` }
    }

    const insights: Record<string, number> = {}
    for (const metric of json.data ?? []) {
      // Sum last 7 values
      const sum = metric.values.reduce((acc, v) => acc + (v.value || 0), 0)
      insights[metric.name] = sum
    }

    return { ok: true, insights }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
