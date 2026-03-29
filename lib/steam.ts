import { getHeroName } from './dota-heroes'

const STEAM_API_KEY = process.env.STEAM_API_KEY!
const BASE = 'https://api.steampowered.com'

// Convert Steam64 ID to Steam32 account_id (used in Dota 2 API)
export function steam64ToAccountId(steam64: string): number {
  return Number(BigInt(steam64) - BigInt('76561197960265728'))
}

export async function getPlayerSummary(steamId: string) {
  const url = `${BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  const data = await res.json()
  return data?.response?.players?.[0] ?? null
}

export async function getPlayerBans(steamId: string) {
  const url = `${BASE}/ISteamUser/GetPlayerBans/v1/?key=${STEAM_API_KEY}&steamids=${steamId}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  const data = await res.json()
  return data?.players?.[0] ?? null
}

export async function getHoursPlayed(steamId: string, appId: number): Promise<number> {
  const url = `${BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&appids_filter[0]=${appId}&include_appinfo=false`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  const data = await res.json()
  const game = data?.response?.games?.[0]
  return game ? Math.floor(game.playtime_forever / 60) : 0
}

// Dota 2 match verification — try Valve API first, fall back to OpenDota
export async function getDota2MatchDetails(matchId: string) {
  // Try Valve Steam API first
  try {
    const url = `${BASE}/IDOTA2Match_570/GetMatchDetails/v1/?key=${STEAM_API_KEY}&match_id=${matchId}`
    const res = await fetch(url, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const result = data?.result
      if (result?.players?.length) return result
    }
  } catch {}

  // Fallback: OpenDota API (free, no key needed)
  try {
    const res = await fetch(`https://api.opendota.com/api/matches/${matchId}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (data?.players?.length) return data
    }
  } catch {}

  return null
}

// Verify a Dota 2 match between two players
export async function verifyDota2Match(
  matchId: string,
  playerASteam64: string,
  playerBSteam64: string,
  wagerCreatedAt: Date
): Promise<{ winner: 'a' | 'b' | null; error?: string; heroA?: string; heroB?: string }> {
  const match = await getDota2MatchDetails(matchId)

  if (!match) return { winner: null, error: 'Match not found. Try again in a few minutes.' }

  // Check match happened after wager was placed
  const matchTime = new Date(match.start_time * 1000)
  if (matchTime < wagerCreatedAt) return { winner: null, error: 'Match predates the wager.' }

  // Check match duration (reject remakes < 10 min)
  if (match.duration < 600) return { winner: null, error: 'Match too short (possible remake).' }

  // Check lobby type — reject practice lobbies
  if (match.lobby_type === 1) return { winner: null, error: 'Practice lobby matches are not allowed.' }

  const accountA = steam64ToAccountId(playerASteam64)
  const accountB = steam64ToAccountId(playerBSteam64)

  const playerAData = match.players?.find((p: { account_id: number }) => p.account_id === accountA)
  const playerBData = match.players?.find((p: { account_id: number }) => p.account_id === accountB)

  if (!playerAData) return { winner: null, error: 'Player A not found in this match.' }
  if (!playerBData) return { winner: null, error: 'Player B not found in this match.' }

  // player_slot bit 7: 0 = Radiant, 128+ = Dire
  const aIsRadiant = (playerAData.player_slot & 0x80) === 0
  const bIsRadiant = (playerBData.player_slot & 0x80) === 0

  if (aIsRadiant === bIsRadiant) return { winner: null, error: 'Both players on same team.' }

  const aWon = aIsRadiant ? match.radiant_win : !match.radiant_win

  const heroA = getHeroName(playerAData.hero_id)
  const heroB = getHeroName(playerBData.hero_id)

  return { winner: aWon ? 'a' : 'b', heroA, heroB }
}

// Check player eligibility — returns summary and bans so callers don't re-fetch
export async function checkPlayerEligibility(steamId: string): Promise<{
  eligible: boolean
  reason?: string
  summary: Awaited<ReturnType<typeof getPlayerSummary>>
  bans: Awaited<ReturnType<typeof getPlayerBans>>
}> {
  const [summary, bans] = await Promise.all([
    getPlayerSummary(steamId),
    getPlayerBans(steamId),
  ])

  if (!summary) return { eligible: false, reason: 'Steam account not found or private.', summary, bans }

  // Account age check (1 year minimum)
  const accountAge = (Date.now() / 1000 - summary.timecreated) / (365 * 24 * 3600)
  if (accountAge < 1) return { eligible: false, reason: 'Steam account must be at least 1 year old.', summary, bans }

  // VAC ban check
  if (bans?.VACBanned) return { eligible: false, reason: 'VAC banned accounts are not allowed.', summary, bans }

  return { eligible: true, summary, bans }
}
