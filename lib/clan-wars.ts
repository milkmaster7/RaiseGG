// ─── Clan Wars — 5v5 weekly format ──────────────────────────────────────────

export type ClanWarStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface ClanWar {
  id: string
  clan_a_id: string
  clan_b_id: string
  status: ClanWarStatus
  winner_clan_id: string | null
  score_a: number
  score_b: number
  scheduled_at: string
  completed_at: string | null
  created_at: string
  // Enriched fields (client-side)
  clan_a_name?: string
  clan_a_tag?: string
  clan_b_name?: string
  clan_b_tag?: string
}

export interface ClanWarRegistration {
  id: string
  clan_id: string
  week_start: string
  registered_by: string
  created_at: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Wars happen every Saturday at 18:00 UTC */
export const WAR_DAY = 6 // Saturday
export const WAR_HOUR = 18
export const WAR_FORMAT = '5v5 Best of 1'
export const MIN_MEMBERS = 5
export const ELO_RANGE = 200

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get the next Saturday date (as YYYY-MM-DD) for war scheduling */
export function getNextWarDate(): string {
  const now = new Date()
  const daysUntilSaturday = (WAR_DAY - now.getUTCDay() + 7) % 7 || 7
  const next = new Date(now)
  next.setUTCDate(now.getUTCDate() + daysUntilSaturday)
  return next.toISOString().split('T')[0]
}

/** Get the Monday of the current week as a date string (week_start for registrations) */
export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  return monday.toISOString().split('T')[0]
}

/** Get the Saturday war timestamp for this week */
export function getWarTimestamp(weekStart: string): string {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + (WAR_DAY - 1)) // Monday=1, Saturday=6 → +5
  d.setUTCHours(WAR_HOUR, 0, 0, 0)
  return d.toISOString()
}

/** Check if two clans are within matching ELO range */
export function canMatch(avgEloA: number, avgEloB: number): boolean {
  return Math.abs(avgEloA - avgEloB) <= ELO_RANGE
}
