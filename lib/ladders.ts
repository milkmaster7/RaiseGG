// Weekly ladder system — players accumulate points from wins during the week
// Points = ELO gained + streak bonus. Resets every Monday UTC.

import { createServiceClient } from '@/lib/supabase'
import type { Game } from '@/types'

const STREAK_BONUS = [0, 0, 5, 10, 15, 25, 35, 50] // bonus by streak length (index = streak count)

/** Get the Monday UTC of the current week */
export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff))
  return monday.toISOString().split('T')[0]
}

/** Get milliseconds until next Monday 00:00 UTC */
export function msUntilReset(): number {
  const now = new Date()
  const day = now.getUTCDay()
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday))
  return nextMonday.getTime() - now.getTime()
}

/** Calculate streak bonus */
export function getStreakBonus(streak: number): number {
  if (streak < 0) streak = 0
  if (streak >= STREAK_BONUS.length) return STREAK_BONUS[STREAK_BONUS.length - 1]
  return STREAK_BONUS[streak]
}

/** Record a win for the ladder (called after match resolution) */
export async function recordLadderWin(
  playerId: string,
  game: Game,
  eloDelta: number,
  currentStreak: number
) {
  const supabase = createServiceClient()
  const weekStart = getCurrentWeekStart()
  const bonus = getStreakBonus(currentStreak)
  const points = Math.max(0, eloDelta) + bonus

  // Upsert the entry
  const { error } = await supabase.rpc('upsert_ladder_entry', {
    p_player_id: playerId,
    p_game: game,
    p_week_start: weekStart,
    p_points: points,
    p_wins: 1,
    p_losses: 0,
    p_streak: currentStreak,
  })

  // Fallback: if RPC doesn't exist yet, do manual upsert
  if (error) {
    const { data: existing } = await supabase
      .from('weekly_ladder_entries')
      .select('id, points, wins, losses, best_streak')
      .eq('player_id', playerId)
      .eq('game', game)
      .eq('week_start', weekStart)
      .single()

    if (existing) {
      await supabase
        .from('weekly_ladder_entries')
        .update({
          points: existing.points + points,
          wins: existing.wins + 1,
          best_streak: Math.max(existing.best_streak, currentStreak),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('weekly_ladder_entries')
        .insert({
          player_id: playerId,
          game,
          week_start: weekStart,
          points,
          wins: 1,
          losses: 0,
          best_streak: currentStreak,
        })
    }
  }
}

/** Record a loss for the ladder */
export async function recordLadderLoss(playerId: string, game: Game) {
  const supabase = createServiceClient()
  const weekStart = getCurrentWeekStart()

  const { data: existing } = await supabase
    .from('weekly_ladder_entries')
    .select('id, losses')
    .eq('player_id', playerId)
    .eq('game', game)
    .eq('week_start', weekStart)
    .single()

  if (existing) {
    await supabase
      .from('weekly_ladder_entries')
      .update({ losses: existing.losses + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('weekly_ladder_entries')
      .insert({
        player_id: playerId,
        game,
        week_start: weekStart,
        points: 0,
        wins: 0,
        losses: 1,
        best_streak: 0,
      })
  }
}

export interface LadderEntry {
  rank: number
  player_id: string
  username: string
  avatar_url: string | null
  points: number
  wins: number
  losses: number
  win_rate: number
  trend: 'up' | 'down' | 'same' | 'new'
}

/** Get current week ladder standings */
export async function getLadderStandings(game: Game, limit = 50): Promise<LadderEntry[]> {
  const supabase = createServiceClient()
  const weekStart = getCurrentWeekStart()

  // Get previous week start for trend
  const prevWeekDate = new Date(weekStart)
  prevWeekDate.setDate(prevWeekDate.getDate() - 7)
  const prevWeekStart = prevWeekDate.toISOString().split('T')[0]

  // Current week entries
  const { data: entries } = await supabase
    .from('weekly_ladder_entries')
    .select('player_id, points, wins, losses')
    .eq('game', game)
    .eq('week_start', weekStart)
    .order('points', { ascending: false })
    .limit(limit)

  if (!entries || entries.length === 0) return []

  const playerIds = entries.map((e) => e.player_id)

  // Get player info
  const { data: players } = await supabase
    .from('players')
    .select('id, username, avatar_url')
    .in('id', playerIds)

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]))

  // Get previous week ranks for trend
  const { data: prevEntries } = await supabase
    .from('weekly_ladder_entries')
    .select('player_id, points')
    .eq('game', game)
    .eq('week_start', prevWeekStart)
    .in('player_id', playerIds)

  // Calculate previous week ranks
  const prevRanks = new Map<string, number>()
  if (prevEntries && prevEntries.length > 0) {
    const sorted = [...prevEntries].sort((a, b) => b.points - a.points)
    sorted.forEach((e, i) => prevRanks.set(e.player_id, i + 1))
  }

  return entries.map((e, i) => {
    const player = playerMap.get(e.player_id)
    const currentRank = i + 1
    const prevRank = prevRanks.get(e.player_id)
    const total = e.wins + e.losses

    let trend: LadderEntry['trend'] = 'new'
    if (prevRank !== undefined) {
      if (currentRank < prevRank) trend = 'up'
      else if (currentRank > prevRank) trend = 'down'
      else trend = 'same'
    }

    return {
      rank: currentRank,
      player_id: e.player_id,
      username: player?.username ?? 'Unknown',
      avatar_url: player?.avatar_url ?? null,
      points: e.points,
      wins: e.wins,
      losses: e.losses,
      win_rate: total > 0 ? Math.round((e.wins / total) * 100) : 0,
      trend,
    }
  })
}

/** Get a specific player's ladder rank for the current week */
export async function getPlayerLadderRank(
  playerId: string,
  game: Game
): Promise<(LadderEntry & { total_players: number }) | null> {
  const supabase = createServiceClient()
  const weekStart = getCurrentWeekStart()

  // Get the player's entry
  const { data: entry } = await supabase
    .from('weekly_ladder_entries')
    .select('player_id, points, wins, losses')
    .eq('player_id', playerId)
    .eq('game', game)
    .eq('week_start', weekStart)
    .single()

  if (!entry) return null

  // Count how many players are above
  const { count } = await supabase
    .from('weekly_ladder_entries')
    .select('*', { count: 'exact', head: true })
    .eq('game', game)
    .eq('week_start', weekStart)
    .gt('points', entry.points)

  // Total players
  const { count: total } = await supabase
    .from('weekly_ladder_entries')
    .select('*', { count: 'exact', head: true })
    .eq('game', game)
    .eq('week_start', weekStart)

  const rank = (count ?? 0) + 1
  const totalGames = entry.wins + entry.losses

  const { data: player } = await supabase
    .from('players')
    .select('username, avatar_url')
    .eq('id', playerId)
    .single()

  return {
    rank,
    player_id: playerId,
    username: player?.username ?? 'Unknown',
    avatar_url: player?.avatar_url ?? null,
    points: entry.points,
    wins: entry.wins,
    losses: entry.losses,
    win_rate: totalGames > 0 ? Math.round((entry.wins / totalGames) * 100) : 0,
    trend: 'same',
    total_players: total ?? 0,
  }
}
