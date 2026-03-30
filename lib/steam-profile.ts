const STEAM_API_KEY = process.env.STEAM_API_KEY!
const BASE = 'https://api.steampowered.com'

// Well-known Steam App IDs
const CS2_APP_ID = 730
const DOTA2_APP_ID = 570

export interface PlayerSummary {
  personaname: string
  avatarfull: string
  profileurl: string
  timecreated: number
  loccountrycode: string | null
}

export interface OwnedGameHours {
  cs2Hours: number
  dota2Hours: number
}

/**
 * Fetch a player's public profile summary.
 */
export async function getPlayerSummary(steamId: string): Promise<PlayerSummary | null> {
  const url = `${BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return null

  const data = await res.json()
  const player = data?.response?.players?.[0]
  if (!player) return null

  return {
    personaname: player.personaname ?? 'Unknown',
    avatarfull: player.avatarfull ?? '',
    profileurl: player.profileurl ?? '',
    timecreated: player.timecreated ?? 0,
    loccountrycode: player.loccountrycode ?? null,
  }
}

/**
 * Fetch CS2 and Dota 2 playtime hours for a player.
 * Returns 0 for either game if not owned or profile is private.
 */
export async function getOwnedGames(steamId: string): Promise<OwnedGameHours> {
  const url = `${BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&appids_filter[0]=${CS2_APP_ID}&appids_filter[1]=${DOTA2_APP_ID}&include_appinfo=false`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return { cs2Hours: 0, dota2Hours: 0 }

  const data = await res.json()
  const games: Array<{ appid: number; playtime_forever: number }> = data?.response?.games ?? []

  const cs2 = games.find(g => g.appid === CS2_APP_ID)
  const dota2 = games.find(g => g.appid === DOTA2_APP_ID)

  return {
    cs2Hours: cs2 ? Math.floor(cs2.playtime_forever / 60) : 0,
    dota2Hours: dota2 ? Math.floor(dota2.playtime_forever / 60) : 0,
  }
}
