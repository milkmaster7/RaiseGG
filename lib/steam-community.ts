/**
 * lib/steam-community.ts — Steam Community group posting
 *
 * Posts announcements and discussion threads to Steam community groups.
 * Uses HTTP requests to Steam Community (no official API for group posts).
 *
 * Env vars:
 *   STEAM_SESSION_COOKIE — the full `steamLoginSecure` cookie value from browser
 */

const STEAM_COMMUNITY_BASE = 'https://steamcommunity.com'

// ─── Config check ──────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!process.env.STEAM_SESSION_COOKIE
}

function getCookies(): string {
  const session = process.env.STEAM_SESSION_COOKIE
  if (!session) throw new Error('STEAM_SESSION_COOKIE not set')
  // The steamLoginSecure cookie is the main auth cookie
  return `steamLoginSecure=${session}`
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface SteamPostResult {
  ok: boolean
  method: 'automated' | 'manual'
  url?: string
  error?: string
  manualContent?: {
    postUrl: string
    title: string
    body: string
    instructions: string
  }
}

// ─── Extract session ID from cookie page ───────────────────────────────────

async function getSessionId(): Promise<string | null> {
  try {
    const res = await fetch(`${STEAM_COMMUNITY_BASE}`, {
      headers: {
        'Cookie': getCookies(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const html = await res.text()
    // Steam sets g_sessionID in a script tag
    const match = html.match(/g_sessionID\s*=\s*"([a-f0-9]+)"/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

// ─── Post to a Steam group discussion ──────────────────────────────────────

export async function postToGroup(
  groupUrl: string,
  title: string,
  body: string
): Promise<SteamPostResult> {
  // groupUrl should be like "groups/MyGroupName" or a full URL
  const groupPath = groupUrl.startsWith('http')
    ? new URL(groupUrl).pathname.replace(/^\//, '')
    : groupUrl

  const discussionUrl = `${STEAM_COMMUNITY_BASE}/${groupPath}/discussions`
  const postEndpoint = `${STEAM_COMMUNITY_BASE}/forum/General/createtopic/${groupPath}/`

  if (!isConfigured()) {
    return {
      ok: false,
      method: 'manual',
      manualContent: {
        postUrl: `${discussionUrl}/0`,
        title,
        body,
        instructions: [
          `1. Open ${discussionUrl}`,
          '2. Click "Start a New Discussion"',
          `3. Title: ${title}`,
          '4. Paste the body text',
          '5. Post',
        ].join('\n'),
      },
    }
  }

  try {
    const sessionId = await getSessionId()
    if (!sessionId) {
      return {
        ok: false,
        method: 'manual',
        error: 'Could not obtain Steam session ID — cookie may be expired',
        manualContent: {
          postUrl: `${discussionUrl}/0`,
          title,
          body,
          instructions: [
            'Steam session cookie is expired. Re-login and update STEAM_SESSION_COOKIE.',
            `Then open ${discussionUrl} to post manually.`,
          ].join('\n'),
        },
      }
    }

    const formData = new URLSearchParams({
      topic: title,
      text: body,
      sessionid: sessionId,
    })

    const res = await fetch(postEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `${getCookies()}; sessionid=${sessionId}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': discussionUrl,
      },
      body: formData.toString(),
      redirect: 'manual',
    })

    if (res.status === 302 || res.status === 301 || res.status === 200) {
      const location = res.headers.get('location')
      return { ok: true, method: 'automated', url: location ?? discussionUrl }
    }

    return {
      ok: false,
      method: 'manual',
      error: `HTTP ${res.status}`,
      manualContent: {
        postUrl: `${discussionUrl}/0`,
        title,
        body,
        instructions: [
          `Automated posting failed (HTTP ${res.status}).`,
          `Open ${discussionUrl} and post manually.`,
        ].join('\n'),
      },
    }
  } catch (err) {
    return {
      ok: false,
      method: 'manual',
      error: String(err),
      manualContent: {
        postUrl: `${discussionUrl}/0`,
        title,
        body,
        instructions: `Error: ${err}. Open ${discussionUrl} to post manually.`,
      },
    }
  }
}

// ─── Get group member count ────────────────────────────────────────────────

export async function getGroupMembers(
  groupUrl: string
): Promise<{ ok: boolean; memberCount?: number; error?: string }> {
  const groupPath = groupUrl.startsWith('http')
    ? new URL(groupUrl).pathname.replace(/^\//, '')
    : groupUrl

  const url = `${STEAM_COMMUNITY_BASE}/${groupPath}/memberslistxml/?xml=1`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }

    const xml = await res.text()
    // Parse memberCount from XML: <memberCount>123</memberCount>
    const match = xml.match(/<memberCount>(\d+)<\/memberCount>/)
    if (match) {
      return { ok: true, memberCount: parseInt(match[1], 10) }
    }
    return { ok: false, error: 'Could not parse member count from XML' }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
