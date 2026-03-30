// Match verification via Steam Web API + OpenDota API
// Steam Web API: requires STEAM_API_KEY (free from https://steamcommunity.com/dev/apikey)
// OpenDota API: free, no key needed

// ─── Constants ─────────────────────────────────────────────────────────────────

const STEAM_API_BASE = 'https://api.steampowered.com'
const OPENDOTA_BASE = 'https://api.opendota.com/api'

const APP_IDS = {
  cs2: 730,
  dota2: 570,
  deadlock: 1422450,
} as const

type GameType = keyof typeof APP_IDS

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SteamPlayerSummary {
  steamid: string
  personaname: string
  profileurl: string
  avatar: string
  avatarfull: string
  personastate: number
  communityvisibilitystate: number
  timecreated?: number
}

export interface OpenDotaRecentMatch {
  match_id: number
  player_slot: number
  radiant_win: boolean
  hero_id: number
  duration: number
  game_mode: number
  lobby_type: number
  start_time: number
  kills: number
  deaths: number
  assists: number
}

export interface OpenDotaMatchDetail {
  match_id: number
  radiant_win: boolean
  duration: number
  start_time: number
  players: {
    account_id: number
    player_slot: number
    hero_id: number
    kills: number
    deaths: number
    assists: number
    radiant_win: boolean
    win: number
    lose: number
    personaname: string
  }[]
}

export interface MatchVerificationResult {
  verified: boolean
  winner_steam_id?: string
  match_data?: Record<string, unknown>
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function steamApiKey(): string {
  const key = process.env.STEAM_API_KEY
  if (!key) throw new Error('STEAM_API_KEY is not configured')
  return key
}

/**
 * Convert Steam64 ID to Steam32 (account ID) for OpenDota.
 * Steam32 = Steam64 - 76561197960265728
 */
export function steam64ToSteam32(steam64: string): number {
  return Number(BigInt(steam64) - BigInt('76561197960265728'))
}

/**
 * Convert Steam32 (account ID) back to Steam64.
 */
export function steam32ToSteam64(steam32: number): string {
  return (BigInt(steam32) + BigInt('76561197960265728')).toString()
}

// ─── Steam Web API Functions ───────────────────────────────────────────────────

/**
 * Get Steam player summary (profile info).
 */
export async function getSteamPlayerSummary(
  steamId: string
): Promise<SteamPlayerSummary | null> {
  try {
    const res = await fetch(
      `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey()}&steamids=${encodeURIComponent(steamId)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const players = data?.response?.players ?? []
    return players[0] ?? null
  } catch {
    return null
  }
}

/**
 * Verify a player owns a specific game (CS2, Dota 2, Deadlock).
 */
export async function verifySteamOwnership(
  steamId: string,
  appId: number
): Promise<{ owned: boolean; playtime_hours: number }> {
  try {
    const res = await fetch(
      `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey()}&steamid=${encodeURIComponent(steamId)}&include_appinfo=true&appids_filter[0]=${appId}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return { owned: false, playtime_hours: 0 }
    const data = await res.json()
    const game = data?.response?.games?.[0]
    if (!game) return { owned: false, playtime_hours: 0 }
    return {
      owned: true,
      playtime_hours: Math.round((game.playtime_forever ?? 0) / 60),
    }
  } catch {
    return { owned: false, playtime_hours: 0 }
  }
}

/**
 * Get recent CS2 matches from Steam API.
 * Uses the generic match history endpoint for CS:GO/CS2 (app 730).
 */
export async function getRecentCS2Matches(
  steamId: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${STEAM_API_BASE}/ICSGOPlayers_730/GetMatchHistory/v1/?key=${steamApiKey()}&steamid=${encodeURIComponent(steamId)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) {
      // Fallback: try the generic player stats endpoint
      const fallback = await fetch(
        `${STEAM_API_BASE}/ISteamUserStats/GetUserStatsForGame/v2/?key=${steamApiKey()}&steamid=${encodeURIComponent(steamId)}&appid=730`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (!fallback.ok) return null
      return await fallback.json()
    }
    return await res.json()
  } catch {
    return null
  }
}

// ─── OpenDota API Functions (Dota 2) ───────────────────────────────────────────

/**
 * Get recent Dota 2 matches for a player via OpenDota (free, no key needed).
 */
export async function getOpenDotaMatches(
  steam32Id: number
): Promise<OpenDotaRecentMatch[]> {
  try {
    const res = await fetch(
      `${OPENDOTA_BASE}/players/${steam32Id}/recentMatches`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    return (await res.json()) as OpenDotaRecentMatch[]
  } catch {
    return []
  }
}

/**
 * Get full match detail from OpenDota.
 */
export async function getOpenDotaMatch(
  matchId: number | string
): Promise<OpenDotaMatchDetail | null> {
  try {
    const res = await fetch(
      `${OPENDOTA_BASE}/matches/${matchId}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    return (await res.json()) as OpenDotaMatchDetail
  } catch {
    return null
  }
}

/**
 * Check if a player won or lost a specific Dota 2 match via OpenDota.
 */
export async function verifyDotaMatchResult(
  matchId: number | string,
  playerSteam32: number
): Promise<{ verified: boolean; won: boolean } | null> {
  const match = await getOpenDotaMatch(matchId)
  if (!match) return null

  const player = match.players.find((p) => p.account_id === playerSteam32)
  if (!player) return null

  // player_slot < 128 = Radiant, >= 128 = Dire
  const isRadiant = player.player_slot < 128
  const won = isRadiant ? match.radiant_win : !match.radiant_win

  return { verified: true, won }
}

// ─── Main Verification Flow ────────────────────────────────────────────────────

/**
 * Verify a match result across CS2, Dota 2, or Deadlock.
 *
 * @param matchId       - External match ID (OpenDota match ID for Dota 2, Steam match ID for CS2/Deadlock)
 * @param game          - 'cs2' | 'dota2' | 'deadlock'
 * @param playerASteamId - Steam64 ID of player A
 * @param playerBSteamId - Steam64 ID of player B
 */
export async function verifyMatchResult(
  matchId: string,
  game: string,
  playerASteamId: string,
  playerBSteamId: string
): Promise<MatchVerificationResult> {
  const normalizedGame = game.toLowerCase().replace(/[\s-]/g, '') as string

  try {
    // ── Dota 2: use OpenDota ──
    if (normalizedGame === 'dota2') {
      const steam32A = steam64ToSteam32(playerASteamId)
      const steam32B = steam64ToSteam32(playerBSteamId)

      const matchDetail = await getOpenDotaMatch(matchId)
      if (!matchDetail) {
        return { verified: false, match_data: { error: 'Match not found on OpenDota. It may still be parsing.' } }
      }

      const playerA = matchDetail.players.find((p) => p.account_id === steam32A)
      const playerB = matchDetail.players.find((p) => p.account_id === steam32B)

      if (!playerA && !playerB) {
        return { verified: false, match_data: { error: 'Neither player found in this match' } }
      }

      // Determine winner
      let winnerSteamId: string | undefined
      if (playerA) {
        const aIsRadiant = playerA.player_slot < 128
        const aWon = aIsRadiant ? matchDetail.radiant_win : !matchDetail.radiant_win
        if (aWon) winnerSteamId = playerASteamId
      }
      if (!winnerSteamId && playerB) {
        const bIsRadiant = playerB.player_slot < 128
        const bWon = bIsRadiant ? matchDetail.radiant_win : !matchDetail.radiant_win
        if (bWon) winnerSteamId = playerBSteamId
      }

      return {
        verified: true,
        winner_steam_id: winnerSteamId,
        match_data: {
          source: 'opendota',
          match_id: matchDetail.match_id,
          radiant_win: matchDetail.radiant_win,
          duration: matchDetail.duration,
          player_a_found: !!playerA,
          player_b_found: !!playerB,
        },
      }
    }

    // ── CS2: use Steam API ──
    if (normalizedGame === 'cs2') {
      // CS2 doesn't have a public match detail API like Dota.
      // We verify both players own CS2 and check recent match activity.
      const [ownershipA, ownershipB] = await Promise.all([
        verifySteamOwnership(playerASteamId, APP_IDS.cs2),
        verifySteamOwnership(playerBSteamId, APP_IDS.cs2),
      ])

      if (!ownershipA.owned || !ownershipB.owned) {
        return {
          verified: false,
          match_data: {
            error: 'One or both players do not own CS2',
            player_a_owns: ownershipA.owned,
            player_b_owns: ownershipB.owned,
          },
        }
      }

      // CS2 match verification is limited via public Steam API.
      // For now, verify ownership + return match_id for manual/admin resolution.
      return {
        verified: true,
        match_data: {
          source: 'steam',
          note: 'CS2 match result cannot be auto-verified via public API. Ownership confirmed for both players.',
          steam_match_id: matchId,
          player_a_hours: ownershipA.playtime_hours,
          player_b_hours: ownershipB.playtime_hours,
        },
      }
    }

    // ── Deadlock: use Steam API ──
    if (normalizedGame === 'deadlock') {
      const [ownershipA, ownershipB] = await Promise.all([
        verifySteamOwnership(playerASteamId, APP_IDS.deadlock),
        verifySteamOwnership(playerBSteamId, APP_IDS.deadlock),
      ])

      if (!ownershipA.owned || !ownershipB.owned) {
        return {
          verified: false,
          match_data: {
            error: 'One or both players do not own Deadlock',
            player_a_owns: ownershipA.owned,
            player_b_owns: ownershipB.owned,
          },
        }
      }

      // Deadlock has no public match API yet.
      return {
        verified: true,
        match_data: {
          source: 'steam',
          note: 'Deadlock match ownership verified. Auto-result not yet available via public API.',
          steam_match_id: matchId,
          player_a_hours: ownershipA.playtime_hours,
          player_b_hours: ownershipB.playtime_hours,
        },
      }
    }

    return { verified: false, match_data: { error: `Unsupported game: ${game}` } }
  } catch (err) {
    console.error('[match-verify] Error:', err)
    return { verified: false, match_data: { error: 'Verification failed due to an internal error' } }
  }
}

// ─── Skill Profile (replaces FACEIT skill lookup) ──────────────────────────────

interface PlayerSkillProfile {
  source: 'leetify' | 'steam'
  skill_level: number | null   // 1-10 scale (normalized)
  elo: number | null
  nickname: string
  profile_url: string | null
  hours_played: number | null
}

interface CacheEntry {
  data: PlayerSkillProfile | null
  expires: number
}

const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const cache = new Map<string, CacheEntry>()

/**
 * Look up a player's skill profile by Steam64 ID.
 * Tries Leetify first, then Steam hours as fallback.
 */
export async function lookupPlayerSkill(
  steamId: string
): Promise<PlayerSkillProfile | null> {
  const cached = cache.get(steamId)
  if (cached && cached.expires > Date.now()) return cached.data

  // 1. Try Leetify
  const leetify = await lookupLeetify(steamId)
  if (leetify) {
    cache.set(steamId, { data: leetify, expires: Date.now() + CACHE_TTL })
    return leetify
  }

  // 2. Steam hours fallback
  const steam = await lookupSteamHours(steamId)
  if (steam) {
    cache.set(steamId, { data: steam, expires: Date.now() + CACHE_TTL })
    return steam
  }

  cache.set(steamId, { data: null, expires: Date.now() + CACHE_TTL })
  return null
}

// ─── Leetify ────────────────────────────────────────────────────────────────

async function lookupLeetify(steamId: string): Promise<PlayerSkillProfile | null> {
  try {
    const res = await fetch(
      `https://api.leetify.com/api/profile/${steamId}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null

    const data = await res.json()
    const rating = data?.ratings?.leetifyRating ?? data?.leetifyRating ?? null

    // Normalize Leetify rating (0-100 scale) to 1-10
    const skillLevel = rating ? Math.max(1, Math.min(10, Math.round(rating / 10))) : null

    return {
      source: 'leetify',
      skill_level: skillLevel,
      elo: rating ? Math.round(rating * 10) : null,
      nickname: data?.name ?? data?.steamNickname ?? '',
      profile_url: `https://leetify.com/app/profile/${steamId}`,
      hours_played: null,
    }
  } catch {
    return null
  }
}

// ─── Steam hours fallback ───────────────────────────────────────────────────

async function lookupSteamHours(steamId: string): Promise<PlayerSkillProfile | null> {
  const apiKey = process.env.STEAM_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&appids_filter[0]=730`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null

    const data = await res.json()
    const cs2 = data?.response?.games?.[0]
    if (!cs2) return null

    const hours = Math.round((cs2.playtime_forever ?? 0) / 60)

    // Rough skill estimate from hours: 0-100h=1, 100-500=3, 500-1000=5, 1000-2000=7, 2000+=9
    let level = 1
    if (hours >= 2000) level = 9
    else if (hours >= 1000) level = 7
    else if (hours >= 500) level = 5
    else if (hours >= 100) level = 3

    return {
      source: 'steam',
      skill_level: level,
      elo: null,
      nickname: '',
      profile_url: `https://steamcommunity.com/profiles/${steamId}`,
      hours_played: hours,
    }
  } catch {
    return null
  }
}

// ─── Verify skill for match eligibility ─────────────────────────────────────

export async function verifyPlayerSkill(steamId: string): Promise<{
  verified: boolean
  skill_level?: number
  elo?: number
  nickname?: string
  source?: string
}> {
  const profile = await lookupPlayerSkill(steamId)

  if (!profile) {
    // Can't verify — allow by default (don't block players)
    return { verified: true }
  }

  return {
    verified: true,
    skill_level: profile.skill_level ?? undefined,
    elo: profile.elo ?? undefined,
    nickname: profile.nickname || undefined,
    source: profile.source,
  }
}

// ─── Cache management ──────────────────────────────────────────────────────

export function clearSkillCache(steamId?: string) {
  if (steamId) cache.delete(steamId)
  else cache.clear()
}
