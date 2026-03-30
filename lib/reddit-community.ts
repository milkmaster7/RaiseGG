/**
 * lib/reddit-community.ts — Reddit subreddit creation & management for RaiseGG
 *
 * Creates r/RaiseGG, sets up flairs, AutoModerator, sidebar, and posts content.
 * Uses the existing auth system from lib/reddit-poster.ts.
 */

import { getRedditToken } from './reddit-poster'

const REDDIT_API_BASE = 'https://oauth.reddit.com'
const USER_AGENT = 'Android:com.raisegg.app:v1.0.0 (by /u/RaiseGG)'

// ─── API helper ────────────────────────────────────────────────────────────

interface RedditApiResult<T = Record<string, unknown>> {
  ok: boolean
  data?: T
  error?: string
}

async function communityFetch<T = Record<string, unknown>>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
    body?: URLSearchParams | string
    contentType?: string
  } = {}
): Promise<RedditApiResult<T>> {
  try {
    const token = await getRedditToken()
    const url = endpoint.startsWith('http') ? endpoint : `${REDDIT_API_BASE}${endpoint}`

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    }

    if (options.contentType) {
      headers['Content-Type'] = options.contentType
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    const bodyStr = options.body instanceof URLSearchParams
      ? options.body.toString()
      : options.body

    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: bodyStr,
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

// ─── Subreddit info ────────────────────────────────────────────────────────

// Primary sub — will auto-create when account has enough karma
// Reddit auto-bans brand subs from new accounts, so we fall back to user profile
const SUBREDDIT_NAME = 'RaiseGG'
const FALLBACK_SUB = 'u_According-West-1344R' // user profile sub

const SIDEBAR_DESCRIPTION = `# Welcome to r/RaiseGG

**RaiseGG** is a competitive stake gaming platform for CS2, Dota 2, and Deadlock. Play 1v1, 2v2, or 5v5 matches for USDC/USDT with blockchain escrow on Solana.

---

## How It Works

1. Find a match or create one
2. Both players deposit USDC into smart contract escrow
3. Play on dedicated servers with anti-cheat
4. Winner receives the pot automatically

## Games Supported

- **CS2** — 1v1, 2v2, 5v5
- **Dota 2** — 1v1 Mid
- **Deadlock** — 1v1

## Free Daily Tournaments

No deposit needed. $5 USDC prize to the winner. 8-player single elimination.

## Links

- [Play Now](https://raisegg.com/play)
- [Tournaments](https://raisegg.com/tournaments)
- [Leaderboard](https://raisegg.com/leaderboard)
- [Discord](https://discord.gg/raisegg)
- [Telegram](https://t.me/raisegg)
- [Twitter / X](https://x.com/raise_gg)

## Rules

1. **Be respectful** — No harassment, slurs, or personal attacks
2. **No cheating discussion** — Don't promote or discuss cheats, exploits, or hacks
3. **No scam links** — Only official RaiseGG links allowed
4. **Use post flairs** — Tag your posts with the correct flair
5. **No spam** — Don't post the same thing repeatedly
6. **English or local language** — Posts in English, Turkish, Romanian, Serbian, Georgian, or Russian are welcome
7. **No account trading** — Don't buy/sell/trade accounts
8. **Report bugs properly** — Use the Bug Report flair and include details
9. **Keep it gaming-related** — Stay on topic (CS2, Dota 2, Deadlock, competitive gaming, crypto in gaming)
10. **Have fun** — This is a gaming community first

## Flair Guide

- **CS2** — CS2 discussion, clips, strats
- **Dota 2** — Dota discussion, hero picks, meta
- **Deadlock** — Deadlock discussion and content
- **Match Result** — Share your match results and highlights
- **Tournament** — Tournament announcements and recaps
- **Discussion** — General platform and gaming discussion
- **Meme** — Gaming memes (keep it relevant)
- **Bug Report** — Report platform bugs
- **Feature Request** — Suggest new features
- **City Rivalry** — City vs city competitive posts

---

*RaiseGG — Stake. Play. Win.*`

const PUBLIC_DESCRIPTION = 'RaiseGG — 1v1 stake matches in CS2, Dota 2 & Deadlock. Blockchain escrow on Solana. Free daily tournaments. Play for USDC/USDT with anti-cheat on dedicated servers.'

// ─── Create subreddit ──────────────────────────────────────────────────────

interface CreateSubredditResult {
  ok: boolean
  error?: string
}

/**
 * Create the r/RaiseGG subreddit via Reddit's site_admin API.
 */
export async function createSubreddit(
  name: string = SUBREDDIT_NAME,
  title: string = 'RaiseGG — 1v1 Stake Matches in CS2, Dota 2 & Deadlock',
  description: string = SIDEBAR_DESCRIPTION
): Promise<CreateSubredditResult> {
  const params = new URLSearchParams({
    name,
    title,
    public_description: PUBLIC_DESCRIPTION,
    description,
    type: 'public',
    link_type: 'any',
    allow_images: 'true',
    allow_videos: 'true',
    allow_polls: 'true',
    allow_post_crossposts: 'true',
    show_media: 'true',
    show_media_preview: 'true',
    suggested_comment_sort: 'new',
    lang: 'en',
    over_18: 'false',
    allow_discovery: 'true',
    api_type: 'json',
  })

  const res = await communityFetch('/api/site_admin', {
    method: 'POST',
    body: params,
  })

  if (!res.ok) {
    return { ok: false, error: res.error }
  }

  // Check for errors in response
  const data = res.data as Record<string, unknown>
  const json = data?.json as { errors?: string[][] } | undefined
  if (json?.errors && json.errors.length > 0) {
    return {
      ok: false,
      error: json.errors.map(e => e.join(': ')).join('; '),
    }
  }

  return { ok: true }
}

// ─── Update subreddit settings ─────────────────────────────────────────────

interface UpdateSettingsResult {
  ok: boolean
  error?: string
}

/**
 * Update subreddit settings (sidebar, description, rules, etc.).
 */
export async function updateSubredditSettings(
  subreddit: string = SUBREDDIT_NAME,
  settings: Record<string, string> = {}
): Promise<UpdateSettingsResult> {
  const defaults: Record<string, string> = {
    sr: subreddit,
    type: 'public',
    link_type: 'any',
    title: 'RaiseGG — 1v1 Stake Matches in CS2, Dota 2 & Deadlock',
    public_description: PUBLIC_DESCRIPTION,
    description: SIDEBAR_DESCRIPTION,
    allow_images: 'true',
    allow_videos: 'true',
    allow_polls: 'true',
    show_media: 'true',
    api_type: 'json',
  }

  const merged = { ...defaults, ...settings }
  const params = new URLSearchParams(merged)

  const res = await communityFetch(`/r/${subreddit}/api/site_admin`, {
    method: 'POST',
    body: params,
  })

  if (!res.ok) {
    return { ok: false, error: res.error }
  }

  return { ok: true }
}

// ─── Create post flairs ───────────────────────────────────────────────────

const DEFAULT_FLAIRS = [
  { text: 'CS2', cssClass: 'cs2', backgroundColor: '#ff6b00', textColor: 'light' },
  { text: 'Dota 2', cssClass: 'dota2', backgroundColor: '#e74c3c', textColor: 'light' },
  { text: 'Deadlock', cssClass: 'deadlock', backgroundColor: '#9b59b6', textColor: 'light' },
  { text: 'Match Result', cssClass: 'match-result', backgroundColor: '#2ecc71', textColor: 'light' },
  { text: 'Tournament', cssClass: 'tournament', backgroundColor: '#f1c40f', textColor: 'dark' },
  { text: 'Discussion', cssClass: 'discussion', backgroundColor: '#3498db', textColor: 'light' },
  { text: 'Meme', cssClass: 'meme', backgroundColor: '#e91e63', textColor: 'light' },
  { text: 'Bug Report', cssClass: 'bug-report', backgroundColor: '#e74c3c', textColor: 'light' },
  { text: 'Feature Request', cssClass: 'feature-request', backgroundColor: '#00bcd4', textColor: 'light' },
  { text: 'City Rivalry', cssClass: 'city-rivalry', backgroundColor: '#ff9800', textColor: 'light' },
  { text: 'Announcement', cssClass: 'announcement', backgroundColor: '#00e6ff', textColor: 'dark' },
  { text: 'Guide', cssClass: 'guide', backgroundColor: '#4caf50', textColor: 'light' },
]

interface CreateFlairResult {
  ok: boolean
  created: number
  errors: string[]
}

/**
 * Create post flairs for the subreddit.
 */
export async function createPostFlairs(
  subreddit: string = SUBREDDIT_NAME,
  flairs: typeof DEFAULT_FLAIRS = DEFAULT_FLAIRS
): Promise<CreateFlairResult> {
  const results: CreateFlairResult = { ok: true, created: 0, errors: [] }

  for (const flair of flairs) {
    const params = new URLSearchParams({
      api_type: 'json',
      css_class: flair.cssClass,
      flair_type: 'LINK_FLAIR',
      text: flair.text,
      text_editable: 'false',
      background_color: flair.backgroundColor,
      text_color: flair.textColor,
    })

    const res = await communityFetch(`/r/${subreddit}/api/flairtemplate_v2`, {
      method: 'POST',
      body: params,
    })

    if (res.ok) {
      results.created++
    } else {
      results.errors.push(`Failed to create flair "${flair.text}": ${res.error}`)
    }

    // Small delay between API calls
    await new Promise(r => setTimeout(r, 500))
  }

  if (results.errors.length > 0) {
    results.ok = results.created > 0 // partial success is still ok
  }

  return results
}

// ─── AutoModerator setup ──────────────────────────────────────────────────

const AUTOMOD_CONFIG = `---
# Welcome message on new posts
type: submission
is_edited: false
comment: |
    Thanks for posting in r/RaiseGG!

    **Quick links:**
    - [Play Now](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments) | [Leaderboard](https://raisegg.com/leaderboard)
    - [Discord](https://discord.gg/raisegg) | [Telegram](https://t.me/raisegg)

    Please make sure your post has the correct flair. If you're reporting a bug, include as much detail as possible.

    *I am a bot. This action was performed automatically.*
comment_stickied: true
---
# Spam filter — remove posts with common spam patterns
type: any
body (includes, regex): ["free money", "guaranteed win", "hack", "cheat download", "boosting service"]
action: filter
action_reason: "Possible spam/cheat promotion"
---
# New account filter — flag posts from accounts < 3 days old
type: any
author:
    account_age: "< 3 days"
action: filter
action_reason: "New account (< 3 days)"
---
# Karma filter — flag posts from low karma accounts
type: any
author:
    combined_karma: "< 10"
action: filter
action_reason: "Low karma account"
`

interface AutoModResult {
  ok: boolean
  error?: string
}

/**
 * Set up AutoModerator configuration for the subreddit.
 * Posts the config to the AutoModerator wiki page.
 */
export async function setupAutoModerator(
  subreddit: string = SUBREDDIT_NAME
): Promise<AutoModResult> {
  const params = new URLSearchParams({
    content: AUTOMOD_CONFIG,
    page: 'config/automoderator',
    reason: 'RaiseGG AutoModerator initial setup',
  })

  const res = await communityFetch(`/r/${subreddit}/api/wiki/edit`, {
    method: 'POST',
    body: params,
  })

  if (!res.ok) {
    return { ok: false, error: res.error }
  }

  return { ok: true }
}

// ─── Post to own subreddit ────────────────────────────────────────────────

interface OwnPostResult {
  ok: boolean
  postUrl?: string
  postId?: string
  error?: string
}

/**
 * Post to r/RaiseGG with optional flair.
 * Convenience wrapper — does NOT enforce the 10-minute rate limit from reddit-poster
 * since posting to your own subreddit is less restricted.
 */
export async function postToOwnSubreddit(
  title: string,
  body: string,
  flairText?: string
): Promise<OwnPostResult> {
  // Try primary sub first, fall back to user profile if banned/unavailable
  const subsToTry = [SUBREDDIT_NAME, FALLBACK_SUB]
  let lastError = ''

  for (const sub of subsToTry) {
    const params = new URLSearchParams({
      sr: sub,
      kind: 'self',
      title,
      text: body,
      resubmit: 'true',
      api_type: 'json',
    })

    if (flairText && sub === SUBREDDIT_NAME) {
      params.set('flair_text', flairText)
    }

    const res = await communityFetch<{
      json: {
        errors: string[][]
        data?: { url: string; id: string; name: string }
      }
    }>('/api/submit', { method: 'POST', body: params })

    // HTTP-level failure or error string mentioning sub issues
    if (!res.ok) {
      lastError = res.error || 'Unknown error'
      if (lastError.includes('404') || lastError.includes('NOEXIST') || lastError.includes('banned')) {
        continue // Try fallback
      }
      continue
    }

    const json = res.data?.json
    if (json?.errors && json.errors.length > 0) {
      const errStr = json.errors.map(e => e.join(': ')).join('; ')
      lastError = errStr
      // If sub is banned/missing/not allowed, try fallback
      if (/NOTALLOWED|NOEXIST|banned/i.test(errStr) && sub !== FALLBACK_SUB) {
        continue
      }
      return { ok: false, error: errStr }
    }

    return {
      ok: true,
      postUrl: json?.data?.url,
      postId: json?.data?.name,
    }
  }

  return { ok: false, error: `All subs failed. Last error: ${lastError}` }
}

// ─── Sticky a post ────────────────────────────────────────────────────────

/**
 * Sticky/unsticky a post in the subreddit.
 */
export async function stickyPost(
  postId: string,
  sticky: boolean = true,
  num: 1 | 2 = 1
): Promise<{ ok: boolean; error?: string }> {
  const params = new URLSearchParams({
    id: postId,
    state: String(sticky),
    num: String(num),
    api_type: 'json',
  })

  const res = await communityFetch('/api/set_subreddit_sticky', {
    method: 'POST',
    body: params,
  })

  return { ok: res.ok, error: res.error }
}

// ─── Exported constants ───────────────────────────────────────────────────

// ─── User flairs (city/game/rank) ────────────────────────────────────────

const USER_FLAIR_TEMPLATES = [
  // Cities
  { text: 'Istanbul', cssClass: 'istanbul', backgroundColor: '#e74c3c', textColor: 'light' as const },
  { text: 'Ankara', cssClass: 'ankara', backgroundColor: '#e67e22', textColor: 'light' as const },
  { text: 'Izmir', cssClass: 'izmir', backgroundColor: '#f39c12', textColor: 'dark' as const },
  { text: 'Bucharest', cssClass: 'bucharest', backgroundColor: '#2980b9', textColor: 'light' as const },
  { text: 'Belgrade', cssClass: 'belgrade', backgroundColor: '#8e44ad', textColor: 'light' as const },
  { text: 'Sofia', cssClass: 'sofia', backgroundColor: '#27ae60', textColor: 'light' as const },
  { text: 'Athens', cssClass: 'athens', backgroundColor: '#2c3e50', textColor: 'light' as const },
  { text: 'Tbilisi', cssClass: 'tbilisi', backgroundColor: '#d35400', textColor: 'light' as const },
  { text: 'Baku', cssClass: 'baku', backgroundColor: '#16a085', textColor: 'light' as const },
  { text: 'Yerevan', cssClass: 'yerevan', backgroundColor: '#c0392b', textColor: 'light' as const },
  { text: 'Moscow', cssClass: 'moscow', backgroundColor: '#2c3e50', textColor: 'light' as const },
  { text: 'St Petersburg', cssClass: 'spb', backgroundColor: '#3498db', textColor: 'light' as const },
  { text: 'Almaty', cssClass: 'almaty', backgroundColor: '#1abc9c', textColor: 'light' as const },
  { text: 'Kyiv', cssClass: 'kyiv', backgroundColor: '#f1c40f', textColor: 'dark' as const },
  { text: 'Warsaw', cssClass: 'warsaw', backgroundColor: '#e74c3c', textColor: 'light' as const },
  { text: 'Prague', cssClass: 'prague', backgroundColor: '#3498db', textColor: 'light' as const },
  { text: 'Zagreb', cssClass: 'zagreb', backgroundColor: '#2980b9', textColor: 'light' as const },
  { text: 'Sarajevo', cssClass: 'sarajevo', backgroundColor: '#27ae60', textColor: 'light' as const },
  { text: 'Tirana', cssClass: 'tirana', backgroundColor: '#e74c3c', textColor: 'light' as const },
  { text: 'Tehran', cssClass: 'tehran', backgroundColor: '#2ecc71', textColor: 'light' as const },
  // Games
  { text: 'CS2', cssClass: 'cs2-user', backgroundColor: '#ff6b00', textColor: 'light' as const },
  { text: 'Dota 2', cssClass: 'dota2-user', backgroundColor: '#e74c3c', textColor: 'light' as const },
  { text: 'Deadlock', cssClass: 'deadlock-user', backgroundColor: '#9b59b6', textColor: 'light' as const },
  // Ranks
  { text: 'Bronze', cssClass: 'bronze', backgroundColor: '#cd7f32', textColor: 'light' as const },
  { text: 'Silver', cssClass: 'silver', backgroundColor: '#c0c0c0', textColor: 'dark' as const },
  { text: 'Gold', cssClass: 'gold', backgroundColor: '#ffd700', textColor: 'dark' as const },
  { text: 'Diamond', cssClass: 'diamond', backgroundColor: '#00e6ff', textColor: 'dark' as const },
  { text: 'Champion', cssClass: 'champion', backgroundColor: '#ff00ff', textColor: 'light' as const },
]

/**
 * Create user flair templates so people can rep their city/game/rank.
 * Flairs are editable so users can combine: "Istanbul | CS2 | Diamond"
 */
export async function createUserFlairs(
  subreddit: string = SUBREDDIT_NAME
): Promise<{ ok: boolean; created: number; errors: string[] }> {
  const results = { ok: true, created: 0, errors: [] as string[] }

  for (const flair of USER_FLAIR_TEMPLATES) {
    const params = new URLSearchParams({
      api_type: 'json',
      css_class: flair.cssClass,
      flair_type: 'USER_FLAIR',
      text: flair.text,
      text_editable: 'true',
      background_color: flair.backgroundColor,
      text_color: flair.textColor,
    })

    const res = await communityFetch(`/r/${subreddit}/api/flairtemplate_v2`, {
      method: 'POST',
      body: params,
    })

    if (res.ok) {
      results.created++
    } else {
      results.errors.push(`Failed user flair "${flair.text}": ${res.error}`)
    }

    await new Promise(r => setTimeout(r, 500))
  }

  if (results.errors.length > 0) results.ok = results.created > 0
  return results
}

// ─── Cross-post ──────────────────────────────────────────────────────────

/**
 * Cross-post an existing post to another subreddit.
 * Returns the new post URL/ID on the target sub.
 */
export async function crossPost(
  originalPostId: string,
  targetSubreddit: string,
  title?: string
): Promise<{ ok: boolean; postUrl?: string; postId?: string; error?: string }> {
  const params = new URLSearchParams({
    sr: targetSubreddit,
    kind: 'crosspost',
    crosspost_fullname: originalPostId,
    resubmit: 'true',
    api_type: 'json',
  })
  if (title) params.set('title', title)

  const res = await communityFetch<{
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

  return { ok: true, postUrl: json?.data?.url, postId: json?.data?.name }
}

// ─── Wiki pages ──────────────────────────────────────────────────────────

/**
 * Create or update a wiki page in the subreddit.
 */
export async function createWikiPage(
  subreddit: string = SUBREDDIT_NAME,
  page: string,
  content: string,
  reason: string = 'RaiseGG wiki setup'
): Promise<{ ok: boolean; error?: string }> {
  const params = new URLSearchParams({ content, page, reason })

  const res = await communityFetch(`/r/${subreddit}/api/wiki/edit`, {
    method: 'POST',
    body: params,
  })

  return { ok: res.ok, error: res.error }
}

// ─── Distinguish / mod actions ───────────────────────────────────────────

/**
 * Distinguish a comment or post as a moderator.
 */
export async function distinguishAsmod(
  thingId: string,
  how: 'yes' | 'no' | 'admin' | 'special' = 'yes',
  sticky: boolean = false
): Promise<{ ok: boolean; error?: string }> {
  const params = new URLSearchParams({
    id: thingId,
    how,
    sticky: String(sticky),
    api_type: 'json',
  })

  const res = await communityFetch('/api/distinguish', {
    method: 'POST',
    body: params,
  })

  return { ok: res.ok, error: res.error }
}

// ─── Invite moderator ───────────────────────────────────────────────────

/**
 * Invite a user as a moderator to the subreddit.
 */
export async function inviteModerator(
  subreddit: string = SUBREDDIT_NAME,
  username: string,
  permissions: string = '+all'
): Promise<{ ok: boolean; error?: string }> {
  const params = new URLSearchParams({
    api_type: 'json',
    name: username,
    type: 'moderator_invite',
    permissions,
  })

  const res = await communityFetch(`/r/${subreddit}/api/friend`, {
    method: 'POST',
    body: params,
  })

  return { ok: res.ok, error: res.error }
}

// ─── Get new posts in subreddit ──────────────────────────────────────────

/**
 * Get recent posts in the subreddit (for mod engagement).
 */
export async function getNewSubPosts(
  subreddit: string = SUBREDDIT_NAME,
  limit: number = 10
): Promise<{ ok: boolean; posts?: Array<{ id: string; name: string; title: string; author: string; num_comments: number }>; error?: string }> {
  const res = await communityFetch<{
    data: {
      children: Array<{ data: { id: string; name: string; title: string; author: string; num_comments: number } }>
    }
  }>(`/r/${subreddit}/new?limit=${limit}`)

  if (!res.ok) return { ok: false, error: res.error }

  const posts = res.data?.data?.children?.map(c => c.data) ?? []
  return { ok: true, posts }
}

// ─── Upvote ──────────────────────────────────────────────────────────────

/**
 * Upvote a post or comment (for engagement).
 */
export async function upvoteThing(
  thingId: string
): Promise<{ ok: boolean; error?: string }> {
  const params = new URLSearchParams({ id: thingId, dir: '1' })
  const res = await communityFetch('/api/vote', { method: 'POST', body: params })
  return { ok: res.ok, error: res.error }
}

// ─── Wiki content ────────────────────────────────────────────────────────

export const WIKI_PAGES: Record<string, { title: string; content: string }> = {
  index: {
    title: 'Wiki Home',
    content: `# r/RaiseGG Wiki

Welcome to the official RaiseGG wiki! Everything you need to know about competitive stake gaming.

## Pages

- [Getting Started](https://www.reddit.com/r/RaiseGG/wiki/getting-started) — How to sign up and play
- [How Escrow Works](https://www.reddit.com/r/RaiseGG/wiki/escrow) — Blockchain escrow explained
- [Tournaments](https://www.reddit.com/r/RaiseGG/wiki/tournaments) — Tournament schedule & rules
- [City Leaderboard](https://www.reddit.com/r/RaiseGG/wiki/city-leaderboard) — How city rankings work
- [FAQ](https://www.reddit.com/r/RaiseGG/wiki/faq) — Common questions

## Quick Links

- [Play Now](https://raisegg.com/play)
- [Tournaments](https://raisegg.com/tournaments)
- [Leaderboard](https://raisegg.com/leaderboard)
- [Discord](https://discord.gg/raisegg)
`,
  },
  'getting-started': {
    title: 'Getting Started',
    content: `# Getting Started with RaiseGG

## Step 1: Create an Account
Visit [raisegg.com](https://raisegg.com) and sign up. You can connect your Steam account for instant game integration.

## Step 2: Try a Free Tournament
Every day at 3 PM UTC, we run a free tournament. No deposit needed. $5 USDC to the winner.

[Join Today's Tournament](https://raisegg.com/tournaments)

## Step 3: Play Stake Matches
Once you're comfortable, try a 1v1 stake match:
1. Choose your game (CS2, Dota 2, or Deadlock)
2. Set your stake ($1–$50 USDC)
3. Both players deposit into blockchain escrow
4. Play the match on anti-cheat servers
5. Winner receives both stakes automatically

## Step 4: Climb the Leaderboard
Every match earns you ELO points. Climb the leaderboard and rep your city!

## Supported Games
- **CS2** — 1v1, 2v2, 5v5
- **Dota 2** — 1v1 Mid
- **Deadlock** — 1v1

## Need Help?
- [Discord](https://discord.gg/raisegg)
- [Telegram](https://t.me/raisegg)
`,
  },
  escrow: {
    title: 'How Blockchain Escrow Works',
    content: `# How Blockchain Escrow Works

## The Problem
In traditional wager matches, you trust the other player to pay. Most don't.

## The Solution
RaiseGG uses **Solana smart contracts** to hold funds in escrow.

### How It Works
1. **Both players deposit** USDC/USDT into a Solana escrow program
2. **Funds are locked** — neither player can withdraw during the match
3. **Match plays out** on dedicated servers with anti-cheat
4. **Result is verified** and submitted to the contract
5. **Winner receives** both stakes minus a small platform fee (~5%)

### Why Solana?
- **Fast** — Sub-second finality (400ms)
- **Cheap** — Near-zero transaction fees
- **Stablecoins** — USDC/USDT, no price volatility
- **Cross-border** — Works from Turkey, Romania, Georgia, Kazakhstan, anywhere

### Is It Safe?
- Smart contract is audited and open-source
- Funds cannot be moved without match result
- Anti-cheat (VAC + MatchZy) on all servers
- Dispute system for edge cases

### What is USDC?
USDC is a stablecoin pegged 1:1 to USD. 1 USDC = $1 always. You can buy it on any crypto exchange or get it by winning free tournaments on RaiseGG.
`,
  },
  tournaments: {
    title: 'Tournaments',
    content: `# RaiseGG Tournaments

## Daily Free Tournament
- **Time:** 3 PM UTC every day
- **Format:** 8-player single elimination, BO1
- **Entry:** FREE — no deposit needed
- **Prize:** $5 USDC to the winner
- **Games:** CS2 1v1 or Dota 2 1v1 mid

[Sign Up](https://raisegg.com/tournaments)

## Weekend Championship (Coming Soon)
- **Time:** Saturdays at 2 PM UTC
- **Format:** 16-player double elimination
- **Entry:** $5 USDC
- **Prize Pool:** $100+ USDC
- **Games:** CS2 5v5

## Balkan Night
- **Time:** Monday 8 PM CET
- **Format:** 8-player single elimination
- **Entry:** Free
- **Prize:** $5 USDC
- **Eligibility:** Players from Balkan countries

## Turkish Wednesday
- **Time:** Wednesday 9 PM TRT
- **Format:** 8-player single elimination
- **Entry:** Free
- **Prize:** $5 USDC
- **Eligibility:** Players from Turkey

## Rules
1. All players must have a verified Steam account
2. Anti-cheat must be active
3. No smurfing — play on your main account
4. Match results are final (disputes handled by admins)
5. Prizes paid in USDC on Solana within 24 hours
`,
  },
  'city-leaderboard': {
    title: 'City Leaderboard',
    content: `# City Leaderboard — How It Works

## The Concept
Every match you play earns points for your city. Represent your hometown and climb the rankings!

## How Points Work
- **Win a match:** +3 points for your city
- **Win a tournament match:** +5 points
- **Win a tournament:** +10 points
- **Lose a match:** +1 point (participation counts)

## How to Set Your City
1. Go to your profile on [raisegg.com](https://raisegg.com)
2. Set your city in account settings
3. Your city appears on the leaderboard automatically

## Current Cities
Istanbul, Ankara, Izmir, Bucharest, Cluj, Belgrade, Novi Sad, Sofia, Athens, Tbilisi, Batumi, Baku, Yerevan, Moscow, St Petersburg, Almaty, Astana, Kyiv, Warsaw, Prague, Zagreb, Sarajevo, Tirana, Tehran, and more...

## Weekly Reset
City rankings reset every Monday at 00:00 UTC. Top 3 cities get special flairs for the week.

## Country Rankings
Cities also roll up into country rankings. Which country produces the best gamers?

[View Live Leaderboard](https://raisegg.com/leaderboard)
`,
  },
  faq: {
    title: 'FAQ',
    content: `# Frequently Asked Questions

## General

**Q: Is RaiseGG free to use?**
A: Yes! Free daily tournaments with real prizes. Stake matches require a USDC deposit.

**Q: What games are supported?**
A: CS2 (1v1, 2v2, 5v5), Dota 2 (1v1 mid), and Deadlock (1v1).

**Q: What regions are supported?**
A: EU servers in Frankfurt and Istanbul. Best for Turkey, Balkans, Eastern Europe, CIS, Central Asia, and Middle East.

## Money & Payments

**Q: What currency do you use?**
A: USDC and USDT on the Solana blockchain. These are stablecoins worth exactly $1 each.

**Q: How do I deposit?**
A: Send USDC/USDT to your RaiseGG wallet address (shown on your profile). Any Solana wallet or exchange works.

**Q: How do I withdraw?**
A: Instant withdrawal to any Solana wallet. No waiting period.

**Q: What are the fees?**
A: ~5% platform fee on stake matches. Free tournaments have no fees.

## Safety

**Q: Can I get scammed?**
A: No. Both players' funds are locked in a Solana smart contract. The money cannot be moved until the match ends.

**Q: What about cheaters?**
A: All servers run VAC + MatchZy anti-cheat. Cheaters are banned and forfeit their stake.

**Q: What if there's a dispute?**
A: Use the dispute system. Admins review server logs and make a decision.

## Account

**Q: Do I need to verify my identity?**
A: No KYC required. Just a Steam account.

**Q: Can I play from [my country]?**
A: If you can connect to EU servers with playable ping, yes. We don't geo-restrict.

## Community

**Q: How do I get a user flair on r/RaiseGG?**
A: Click "edit flair" in the sidebar. Choose your city, game, and rank. You can customize it!

**Q: How do I report a bug?**
A: Post with the "Bug Report" flair and include as much detail as possible.

**Q: How can I become a moderator?**
A: Active community members may be invited. Keep posting, be helpful, and follow the rules.
`,
  },
}

// ─── Exported constants ───────────────────────────────────────────────────

export {
  SUBREDDIT_NAME,
  SIDEBAR_DESCRIPTION,
  PUBLIC_DESCRIPTION,
  DEFAULT_FLAIRS,
  AUTOMOD_CONFIG,
  USER_FLAIR_TEMPLATES,
}
