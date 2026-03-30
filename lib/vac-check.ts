import { getPlayerBans } from './steam'

export interface VacBanResult {
  vacBanned: boolean
  numberOfVACBans: number
  daysSinceLastBan: number
  gameBans: number
}

/**
 * Check VAC ban status for a Steam user.
 * Wraps the existing getPlayerBans() into a clean typed result.
 */
export async function checkVacBans(steamId: string): Promise<VacBanResult> {
  const bans = await getPlayerBans(steamId)

  if (!bans) {
    return { vacBanned: false, numberOfVACBans: 0, daysSinceLastBan: 0, gameBans: 0 }
  }

  return {
    vacBanned: bans.VACBanned ?? false,
    numberOfVACBans: bans.NumberOfVACBans ?? 0,
    daysSinceLastBan: bans.DaysSinceLastBan ?? 0,
    gameBans: bans.NumberOfGameBans ?? 0,
  }
}
