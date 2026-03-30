/**
 * lib/stake-roulette.ts — Stake Roulette queue + matching
 *
 * Players join a blind queue with a min/max stake range.
 * The system finds two players with overlapping ranges,
 * picks a random stake in the overlap, and creates a match.
 */

import { createServiceClient } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RouletteQueueEntry {
  id: string
  user_id: string
  game: string
  min_stake: number
  max_stake: number
  joined_at: string
}

export interface RouletteMatchResult {
  matchId: string
  playerA: string
  playerB: string
  stake: number
  game: string
}

// ─── Join Queue ─────────────────────────────────────────────────────────────

/**
 * Add a player to the roulette queue. Upserts so a player can only
 * be in the queue once (user_id is UNIQUE).
 */
export async function joinRouletteQueue(
  userId: string,
  game: string,
  minStake: number,
  maxStake: number
): Promise<{ success: boolean; error?: string }> {
  if (minStake <= 0 || maxStake <= 0) {
    return { success: false, error: 'Stakes must be positive' }
  }
  if (minStake > maxStake) {
    return { success: false, error: 'minStake must be <= maxStake' }
  }
  if (!['cs2', 'dota2', 'deadlock'].includes(game)) {
    return { success: false, error: 'Invalid game' }
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('roulette_queue')
    .upsert(
      {
        user_id: userId,
        game,
        min_stake: minStake,
        max_stake: maxStake,
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Leave Queue ────────────────────────────────────────────────────────────

export async function leaveRouletteQueue(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('roulette_queue')
    .delete()
    .eq('user_id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Queue Status ───────────────────────────────────────────────────────────

export async function getQueueStatus(
  game?: string
): Promise<Record<string, number>> {
  const supabase = createServiceClient()

  let query = supabase.from('roulette_queue').select('game')
  if (game) query = query.eq('game', game)

  const { data } = await query

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.game] = (counts[row.game] ?? 0) + 1
  }
  return counts
}

// ─── Find Match ─────────────────────────────────────────────────────────────

/**
 * Attempt to match two players in the roulette queue for a given game.
 * Finds any pair with overlapping stake ranges, picks a random amount
 * in the overlap, creates a match, and removes both from the queue.
 *
 * Returns the match details or null if no compatible pair found.
 */
export async function findRouletteMatch(
  game: string
): Promise<RouletteMatchResult | null> {
  const supabase = createServiceClient()

  // Fetch all waiting players for this game, ordered by join time (FIFO)
  const { data: queue } = await supabase
    .from('roulette_queue')
    .select('*')
    .eq('game', game)
    .order('joined_at', { ascending: true })

  if (!queue || queue.length < 2) return null

  // Find first compatible pair (FIFO priority)
  for (let i = 0; i < queue.length - 1; i++) {
    for (let j = i + 1; j < queue.length; j++) {
      const a = queue[i] as RouletteQueueEntry
      const b = queue[j] as RouletteQueueEntry

      // Calculate overlap
      const overlapMin = Math.max(a.min_stake, b.min_stake)
      const overlapMax = Math.min(a.max_stake, b.max_stake)

      if (overlapMin > overlapMax) continue // no overlap

      // Pick random stake within the overlap (2 decimal places)
      const randomStake =
        Math.round(
          (overlapMin + Math.random() * (overlapMax - overlapMin)) * 100
        ) / 100

      // Create the match
      const matchId = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30min expiry

      const { error: matchError } = await supabase.from('matches').insert({
        id: matchId,
        player_a_id: a.user_id,
        player_b_id: b.user_id,
        game,
        format: 'bo1',
        match_type: '1v1',
        stake_amount: randomStake,
        currency: 'USD',
        status: 'locked',
        expires_at: expiresAt.toISOString(),
        resolve_deadline: new Date(
          Date.now() + 2 * 60 * 60 * 1000
        ).toISOString(),
        region: 'EU',
        team_a_players: [],
        team_b_players: [],
      })

      if (matchError) {
        console.error('Roulette match insert failed:', matchError.message)
        continue
      }

      // Remove both players from queue
      await supabase
        .from('roulette_queue')
        .delete()
        .in('user_id', [a.user_id, b.user_id])

      return {
        matchId,
        playerA: a.user_id,
        playerB: b.user_id,
        stake: randomStake,
        game,
      }
    }
  }

  return null
}
