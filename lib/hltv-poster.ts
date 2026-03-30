/**
 * lib/hltv-poster.ts — HLTV forum automation
 *
 * HLTV forums use anti-bot protections (Cloudflare, CSRF tokens, etc.)
 * so reliable automated posting is not feasible. Instead, this module
 * generates ready-to-paste content with the correct forum URLs.
 *
 * If the user provides their HLTV_COOKIE (session cookie from browser),
 * the module attempts direct posting but falls back to content generation.
 *
 * Env vars:
 *   HLTV_COOKIE — full cookie header string after logging in to hltv.org
 */

const HLTV_BASE = 'https://www.hltv.org'

// Forum IDs on HLTV
export const HLTV_FORUMS = {
  general: 0,
  matchmaking: 7,
  offtopic: 13,
  csgo: 29,
  cs2: 32,
} as const

// ─── Config check ──────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!process.env.HLTV_COOKIE
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface HLTVPostResult {
  ok: boolean
  method: 'automated' | 'manual'
  url?: string
  error?: string
  /** Ready-to-paste content when automated posting fails */
  manualContent?: {
    forumUrl: string
    title: string
    body: string
    instructions: string
  }
}

// ─── Attempt automated posting ─────────────────────────────────────────────

async function attemptAutomatedPost(
  endpoint: string,
  formData: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  const cookie = process.env.HLTV_COOKIE
  if (!cookie) return { ok: false, error: 'HLTV_COOKIE not set' }

  try {
    const body = new URLSearchParams(formData).toString()
    const res = await fetch(`${HLTV_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': HLTV_BASE,
        'Origin': HLTV_BASE,
      },
      body,
      redirect: 'manual',
    })

    // HLTV typically redirects to the created thread on success
    if (res.status === 302 || res.status === 301 || res.status === 200) {
      const location = res.headers.get('location')
      return { ok: true, error: location ?? undefined }
    }
    return { ok: false, error: `HTTP ${res.status}` }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Create a new forum thread ─────────────────────────────────────────────

export async function postThread(
  forumId: number,
  title: string,
  body: string
): Promise<HLTVPostResult> {
  const forumUrl = `${HLTV_BASE}/forums/${forumId}`

  // Attempt automated posting
  if (isConfigured()) {
    const result = await attemptAutomatedPost('/forums/post', {
      forumId: String(forumId),
      title,
      message: body,
    })

    if (result.ok) {
      return {
        ok: true,
        method: 'automated',
        url: result.error, // redirect URL stored in error field
      }
    }
  }

  // Fallback: return ready-to-paste content
  return {
    ok: false,
    method: 'manual',
    manualContent: {
      forumUrl,
      title,
      body,
      instructions: [
        `1. Open ${forumUrl}`,
        '2. Click "New Thread" or "Create Topic"',
        `3. Title: ${title}`,
        '4. Paste the body text below',
        '5. Submit',
      ].join('\n'),
    },
  }
}

// ─── Reply to existing thread ──────────────────────────────────────────────

export async function postReply(
  threadId: string,
  body: string
): Promise<HLTVPostResult> {
  const threadUrl = `${HLTV_BASE}/forums/threads/${threadId}`

  if (isConfigured()) {
    const result = await attemptAutomatedPost(`/forums/threads/${threadId}/reply`, {
      message: body,
    })

    if (result.ok) {
      return { ok: true, method: 'automated', url: threadUrl }
    }
  }

  return {
    ok: false,
    method: 'manual',
    manualContent: {
      forumUrl: threadUrl,
      title: '(reply)',
      body,
      instructions: [
        `1. Open ${threadUrl}`,
        '2. Scroll to the reply box',
        '3. Paste the text below',
        '4. Submit',
      ].join('\n'),
    },
  }
}

// ─── Generate promotional content for HLTV ─────────────────────────────────

export function generateHLTVContent(type: 'tournament' | 'platform'): {
  title: string
  body: string
} {
  if (type === 'tournament') {
    return {
      title: 'Free CS2 Tournament — $5 USDC Prize Pool',
      body: [
        'Hey everyone,',
        '',
        'RaiseGG is running free CS2 tournaments with $5 USDC prize pools.',
        '',
        '- 8 players, single elimination',
        '- No entry fee',
        '- Anti-cheat protected',
        '- Instant crypto payout',
        '',
        'We also have 1v1, 2v2, and 5v5 matches where you can stake on your own skill.',
        'Blockchain escrow keeps your money safe.',
        '',
        'https://raisegg.com/tournaments',
        '',
        'Built for players in Turkey, CIS, Balkans, and Caucasus.',
        'LFG!',
      ].join('\n'),
    }
  }

  return {
    title: 'RaiseGG — Stake on Your CS2 Skill (Blockchain Escrow)',
    body: [
      'Tired of playing for nothing?',
      '',
      'RaiseGG lets you stake real money (USDC/USDT) on your CS2 matches.',
      '',
      '- On-chain escrow (your funds are safe)',
      '- Built-in anti-cheat',
      '- Instant payouts',
      '- Free daily tournaments with prizes',
      '- City vs City competitions',
      '',
      'https://raisegg.com',
      '',
      'Currently focused on Turkey, CIS, and Balkan regions.',
      'Check it out and let me know what you think.',
    ].join('\n'),
  }
}
