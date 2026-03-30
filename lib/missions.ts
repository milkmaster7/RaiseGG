// Missions & RaisePoints system — FACEIT-inspired daily retention
// Extends the existing challenges system with a parallel mission layer
// that awards RaisePoints (RP) instead of XP

import { createServiceClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────

export interface MissionTemplate {
  id: string
  title: string
  description: string
  game: string | null
  mission_type: string
  target: number
  rp_reward: number
  period: 'daily' | 'weekly'
  icon: string // emoji shortcode for UI
}

export interface PlayerMission extends MissionTemplate {
  progress: number
  completed: boolean
  claimed: boolean
  record_id: string | null
}

// ─── Mission Definitions ──────────────────────────────────────

export const DAILY_MISSIONS: MissionTemplate[] = [
  { id: 'daily_win_2',        title: 'Win 2 Matches',           description: 'Win any 2 stake matches today.',                    game: null,    mission_type: 'win_match',     target: 2,  rp_reward: 75,  period: 'daily',  icon: 'trophy' },
  { id: 'daily_play_dota2',   title: 'Play a Dota 2 Match',     description: 'Complete a Dota 2 match (win or lose).',             game: 'dota2', mission_type: 'play_match',    target: 1,  rp_reward: 50,  period: 'daily',  icon: 'sword' },
  { id: 'daily_play_cs2',     title: 'Play a CS2 Match',        description: 'Complete a CS2 match (win or lose).',                game: 'cs2',   mission_type: 'play_match',    target: 1,  rp_reward: 50,  period: 'daily',  icon: 'crosshair' },
  { id: 'daily_challenge',    title: 'Complete a Challenge',     description: 'Complete any daily or weekly challenge.',            game: null,    mission_type: 'complete_challenge', target: 1, rp_reward: 60, period: 'daily', icon: 'star' },
  { id: 'daily_peak_hours',   title: 'Peak Hours Player',       description: 'Play a match during peak hours (6-10 PM UTC).',      game: null,    mission_type: 'peak_hours',    target: 1,  rp_reward: 50,  period: 'daily',  icon: 'clock' },
  { id: 'daily_play_3',       title: 'Play 3 Matches',          description: 'Complete 3 matches today.',                          game: null,    mission_type: 'play_match',    target: 3,  rp_reward: 80,  period: 'daily',  icon: 'fire' },
  { id: 'daily_win_1',        title: 'First Blood',             description: 'Win your first match of the day.',                   game: null,    mission_type: 'win_match',     target: 1,  rp_reward: 50,  period: 'daily',  icon: 'lightning' },
  { id: 'daily_stake_5',      title: 'Stake Up',                description: 'Play a match with $5+ stake.',                       game: null,    mission_type: 'stake_amount',  target: 5,  rp_reward: 60,  period: 'daily',  icon: 'money' },
  { id: 'daily_deadlock',     title: 'Play a Deadlock Match',   description: 'Complete a Deadlock match.',                         game: 'deadlock', mission_type: 'play_match', target: 1,  rp_reward: 50,  period: 'daily',  icon: 'lock' },
  { id: 'daily_win_streak',   title: 'Hot Streak',              description: 'Win 2 matches in a row.',                            game: null,    mission_type: 'win_streak',    target: 2,  rp_reward: 100, period: 'daily',  icon: 'flame' },
]

export const WEEKLY_MISSIONS: MissionTemplate[] = [
  { id: 'weekly_win_5',       title: 'Win 5 Matches',           description: 'Win 5 matches this week.',                           game: null,    mission_type: 'win_match',     target: 5,  rp_reward: 300, period: 'weekly', icon: 'trophy' },
  { id: 'weekly_all_games',   title: 'Try All 3 Games',         description: 'Play at least 1 match in CS2, Dota 2, and Deadlock.', game: null,   mission_type: 'multi_game',    target: 3,  rp_reward: 250, period: 'weekly', icon: 'gamepad' },
  { id: 'weekly_refer',       title: 'Refer a Friend',          description: 'Get a friend to sign up using your referral link.',   game: null,    mission_type: 'referral',      target: 1,  rp_reward: 500, period: 'weekly', icon: 'users' },
  { id: 'weekly_play_15',     title: 'Grind Week',              description: 'Play 15 matches this week.',                         game: null,    mission_type: 'play_match',    target: 15, rp_reward: 400, period: 'weekly', icon: 'fire' },
  { id: 'weekly_challenges_5', title: 'Challenge Hunter',       description: 'Complete 5 challenges this week.',                   game: null,    mission_type: 'complete_challenge', target: 5, rp_reward: 350, period: 'weekly', icon: 'star' },
  { id: 'weekly_win_10',      title: 'Weekly Warrior',          description: 'Win 10 matches this week.',                          game: null,    mission_type: 'win_match',     target: 10, rp_reward: 500, period: 'weekly', icon: 'crown' },
  { id: 'weekly_stake_50',    title: 'Big Week',                description: 'Stake $50+ total this week.',                        game: null,    mission_type: 'total_staked',  target: 50, rp_reward: 400, period: 'weekly', icon: 'money' },
]

// ─── Rotation Logic ───────────────────────────────────────────

/** Get today's 4 daily missions (rotated by day-of-year) */
export function getTodaysMissions(): MissionTemplate[] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  const count = 4
  const offset = (dayOfYear * count) % DAILY_MISSIONS.length
  const selected: MissionTemplate[] = []
  for (let i = 0; i < count; i++) {
    selected.push(DAILY_MISSIONS[(offset + i) % DAILY_MISSIONS.length])
  }
  return selected
}

/** Get this week's 3 weekly missions (rotated by week-of-year) */
export function getWeeklyMissions(): MissionTemplate[] {
  const weekOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000)
  )
  const count = 3
  const offset = (weekOfYear * count) % WEEKLY_MISSIONS.length
  const selected: MissionTemplate[] = []
  for (let i = 0; i < count; i++) {
    selected.push(WEEKLY_MISSIONS[(offset + i) % WEEKLY_MISSIONS.length])
  }
  return selected
}

// ─── Period Helpers ───────────────────────────────────────────

export function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0]
}

export function getWeekStartUTC(): string {
  const now = new Date()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7))
  return monday.toISOString().split('T')[0]
}

export function isPeakHours(): boolean {
  const hour = new Date().getUTCHours()
  return hour >= 18 && hour < 22
}

// ─── Progress Calculator ──────────────────────────────────────

interface MatchStats {
  wins: number
  matches: number
  maxWinStreak: number
  gamesPlayed: Set<string>
  totalStaked: number
  maxSingleStake: number
  playedDuringPeak: boolean
  challengesCompleted: number
}

export async function getMatchStats(
  playerId: string,
  since: string,
): Promise<MatchStats> {
  const db = createServiceClient()

  const { data: matches } = await db
    .from('matches')
    .select('winner_id, stake_amount, game, resolved_at')
    .eq('status', 'completed')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .gte('resolved_at', since)

  const rows = matches ?? []
  const wins = rows.filter(m => m.winner_id === playerId).length
  const gamesPlayed = new Set<string>(rows.map(m => m.game))
  const totalStaked = rows.reduce((sum, m) => sum + Number(m.stake_amount ?? 0), 0)
  const maxSingleStake = rows.reduce((max, m) => Math.max(max, Number(m.stake_amount ?? 0)), 0)

  // Calculate max consecutive win streak
  let maxWinStreak = 0
  let currentStreak = 0
  for (const m of rows) {
    if (m.winner_id === playerId) {
      currentStreak++
      maxWinStreak = Math.max(maxWinStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  // Check if any match was during peak hours (6-10 PM UTC)
  const playedDuringPeak = rows.some(m => {
    if (!m.resolved_at) return false
    const hour = new Date(m.resolved_at).getUTCHours()
    return hour >= 18 && hour < 22
  })

  // Count challenge completions in period
  const { count } = await db
    .from('player_challenge_completions')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .gte('completed_at', since)

  return {
    wins,
    matches: rows.length,
    maxWinStreak,
    gamesPlayed,
    totalStaked,
    maxSingleStake,
    playedDuringPeak,
    challengesCompleted: count ?? 0,
  }
}

/** Calculate progress for a single mission based on match stats */
export function calcMissionProgress(mission: MissionTemplate, stats: MatchStats): number {
  switch (mission.mission_type) {
    case 'win_match':
      return Math.min(stats.wins, mission.target)
    case 'play_match':
      if (mission.game) {
        return stats.gamesPlayed.has(mission.game) ? Math.min(stats.matches, mission.target) : 0
      }
      return Math.min(stats.matches, mission.target)
    case 'win_streak':
      return Math.min(stats.maxWinStreak, mission.target)
    case 'stake_amount':
      return stats.maxSingleStake >= mission.target ? mission.target : 0
    case 'total_staked':
      return Math.min(Math.floor(stats.totalStaked), mission.target)
    case 'peak_hours':
      return stats.playedDuringPeak ? 1 : 0
    case 'multi_game':
      return Math.min(stats.gamesPlayed.size, mission.target)
    case 'complete_challenge':
      return Math.min(stats.challengesCompleted, mission.target)
    case 'referral':
      // Referral progress is tracked separately via referral system
      return 0 // handled in API route by checking referrals table
    default:
      return 0
  }
}

// ─── DB Operations ────────────────────────────────────────────

/** Ensure player_missions rows exist for today's + this week's missions */
export async function ensureMissionRows(playerId: string) {
  const db = createServiceClient()
  const today = getTodayUTC()
  const weekStart = getWeekStartUTC()

  const dailyMissions = getTodaysMissions()
  const weeklyMissions = getWeeklyMissions()

  const rows = [
    ...dailyMissions.map(m => ({
      player_id: playerId,
      mission_id: m.id,
      period: 'daily' as const,
      period_start: today,
      progress: 0,
      completed: false,
      claimed: false,
    })),
    ...weeklyMissions.map(m => ({
      player_id: playerId,
      mission_id: m.id,
      period: 'weekly' as const,
      period_start: weekStart,
      progress: 0,
      completed: false,
      claimed: false,
    })),
  ]

  await db
    .from('player_missions')
    .upsert(rows, { onConflict: 'player_id,mission_id,period_start', ignoreDuplicates: true })
}

/** Fetch all mission rows for a player (current daily + weekly) */
export async function getPlayerMissions(playerId: string) {
  const db = createServiceClient()
  const today = getTodayUTC()
  const weekStart = getWeekStartUTC()

  const { data } = await db
    .from('player_missions')
    .select('*')
    .eq('player_id', playerId)
    .or(`period_start.eq.${today},period_start.eq.${weekStart}`)

  return data ?? []
}

/** Claim a completed mission — awards RP to the player */
export async function claimMission(
  playerId: string,
  missionId: string,
  periodStart: string,
): Promise<{ success: boolean; rp_awarded: number; error?: string }> {
  const db = createServiceClient()

  // Find the mission row
  const { data: row } = await db
    .from('player_missions')
    .select('*')
    .eq('player_id', playerId)
    .eq('mission_id', missionId)
    .eq('period_start', periodStart)
    .single()

  if (!row) return { success: false, rp_awarded: 0, error: 'Mission not found' }
  if (!row.completed) return { success: false, rp_awarded: 0, error: 'Mission not completed yet' }
  if (row.claimed) return { success: false, rp_awarded: 0, error: 'Already claimed' }

  // Look up RP reward from template
  const allMissions = [...DAILY_MISSIONS, ...WEEKLY_MISSIONS]
  const template = allMissions.find(m => m.id === missionId)
  if (!template) return { success: false, rp_awarded: 0, error: 'Unknown mission' }

  // Mark claimed
  await db
    .from('player_missions')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('player_id', playerId)
    .eq('mission_id', missionId)
    .eq('period_start', periodStart)

  // Award RP to player
  await db.rpc('add_raise_points', {
    p_player_id: playerId,
    p_amount: template.rp_reward,
  })

  return { success: true, rp_awarded: template.rp_reward }
}
