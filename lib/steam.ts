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

// Dota 2 match verification
export async function getDota2MatchDetails(matchId: string) {
  const url = `${BASE}/IDOTA2Match_570/GetMatchDetails/v1/?key=${STEAM_API_KEY}&match_id=${matchId}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  return data?.result ?? null
}

// Verify a Dota 2 match between two players
export async function verifyDota2Match(
  matchId: string,
  playerASteam64: string,
  playerBSteam64: string,
  wagerCreatedAt: Date
): Promise<{ winner: 'a' | 'b' | null; error?: string }> {
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

  return { winner: aWon ? 'a' : 'b' }
}

// Check player eligibility
export async function checkPlayerEligibility(steamId: string): Promise<{
  eligible: boolean
  reason?: string
}> {
  const [summary, bans, cs2Hours, dota2Hours] = await Promise.all([
    getPlayerSummary(steamId),
    getPlayerBans(steamId),
    getHoursPlayed(steamId, 730),
    getHoursPlayed(steamId, 570),
  ])

  if (!summary) return { eligible: false, reason: 'Steam account not found or private.' }

  // Account age check (1 year minimum)
  const accountAge = (Date.now() / 1000 - summary.timecreated) / (365 * 24 * 3600)
  if (accountAge < 1) return { eligible: false, reason: 'Steam account must be at least 1 year old.' }

  // VAC ban check
  if (bans?.VACBanned) return { eligible: false, reason: 'VAC banned accounts are not allowed.' }

  // Hours check (need 100h in at least one supported game)
  if (cs2Hours < 100 && dota2Hours < 100) {
    return { eligible: false, reason: 'Need at least 100 hours in CS2 or Dota 2.' }
  }

  return { eligible: true }
}
