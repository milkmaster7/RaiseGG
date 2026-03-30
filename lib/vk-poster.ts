/**
 * lib/vk-poster.ts — VK.com API integration for marketing automation
 *
 * Posts tournament announcements to VK community walls.
 * Uses VK API v5.199 via HTTP fetch (no npm package needed).
 *
 * Env vars:
 *   VK_ACCESS_TOKEN  — VK API access token (community or user token with wall.post permission)
 *   VK_GROUP_IDS     — comma-separated list of group IDs (numeric, without minus sign)
 */

const VK_API_BASE = 'https://api.vk.com/method/'
const VK_API_VERSION = '5.199'

// ─── Config check ──────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!process.env.VK_ACCESS_TOKEN
}

function getToken(): string {
  const token = process.env.VK_ACCESS_TOKEN
  if (!token) throw new Error('VK_ACCESS_TOKEN not set')
  return token
}

function getGroupIds(): string[] {
  const raw = process.env.VK_GROUP_IDS
  if (!raw) return []
  return raw.split(',').map(id => id.trim()).filter(Boolean)
}

// ─── VK API call helper ────────────────────────────────────────────────────

interface VKResponse<T = Record<string, unknown>> {
  response?: T
  error?: {
    error_code: number
    error_msg: string
  }
}

async function vkCall<T = Record<string, unknown>>(
  method: string,
  params: Record<string, string | number>
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const url = new URL(`${VK_API_BASE}${method}`)
  url.searchParams.set('access_token', getToken())
  url.searchParams.set('v', VK_API_VERSION)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  try {
    const res = await fetch(url.toString())
    const json: VKResponse<T> = await res.json()

    if (json.error) {
      return { ok: false, error: `VK ${json.error.error_code}: ${json.error.error_msg}` }
    }
    return { ok: true, data: json.response }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Post to a single group's wall ─────────────────────────────────────────

interface WallPostResponse {
  post_id: number
}

export async function postToWall(
  groupId: string,
  message: string
): Promise<{ ok: boolean; postId?: number; error?: string }> {
  const result = await vkCall<WallPostResponse>('wall.post', {
    owner_id: `-${groupId}`, // negative for communities
    from_group: 1,
    message,
  })

  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, postId: result.data?.post_id }
}

// ─── Post to all configured groups ─────────────────────────────────────────

export async function postToMultipleGroups(
  message: string
): Promise<{ results: Array<{ groupId: string; ok: boolean; postId?: number; error?: string }> }> {
  const groupIds = getGroupIds()
  if (groupIds.length === 0) {
    return { results: [{ groupId: 'none', ok: false, error: 'VK_GROUP_IDS not configured' }] }
  }

  const results: Array<{ groupId: string; ok: boolean; postId?: number; error?: string }> = []

  for (const groupId of groupIds) {
    // Small delay between posts to avoid rate limits
    if (results.length > 0) {
      await new Promise(r => setTimeout(r, 2000))
    }
    const result = await postToWall(groupId, message)
    results.push({ groupId, ...result })
  }

  return { results }
}

// ─── Search communities ────────────────────────────────────────────────────

interface GroupSearchItem {
  id: number
  name: string
  screen_name: string
  members_count: number
  type: string
}

interface GroupSearchResponse {
  count: number
  items: GroupSearchItem[]
}

export async function searchCommunities(
  query: string,
  count: number = 20
): Promise<{ ok: boolean; communities?: GroupSearchItem[]; error?: string }> {
  const result = await vkCall<GroupSearchResponse>('groups.search', {
    q: query,
    count,
    type: 'group',
  })

  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, communities: result.data?.items ?? [] }
}
