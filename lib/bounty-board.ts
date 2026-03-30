/**
 * lib/bounty-board.ts — Bounty Board system for RaiseGG
 *
 * Weekly bounties on top-ranked players. Anyone who beats a bounty target
 * in a stake match gets a bonus payout. Creates drama and narratives.
 */

import { createServiceClient } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BountyTarget {
  player_id: string
  username: string
  avatar_url: string | null
  win_streak: number
  bounty_amount: number
  game: string
}

export interface BountyClaim {
  id: string
  match_id: string
  bounty_target_id: string
  bounty_target_username: string
  claimer_id: string
  claimer_username: string
  bounty_amount: number
  game: string
  claimed_at: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BOUNTY_TIERS: { minStreak: number; amount: number }[] = [
  { minStreak: 7, amount: 10 },
  { minStreak: 5, amount: 5 },
  { minStreak: 3, amount: 2 },
]

const MAX_BOUNTIES = 5

function getBountyAmount(streak: number): number {
  for (const tier of BOUNTY_TIERS) {
    if (streak >= tier.minStreak) return tier.amount
  }
  return 0
}

// ─── Compute current win streaks from match history ─────────────────────────

async function computeWinStreaks(): Promise<{ playerId: string; streak: number; game: string }[]> {
  const supabase = createServiceClient()

  // Get recent completed matches ordered by time desc
  const { data: matches } = await supabase
    .from('matches')
    .select('player_a_id, player_b_id, winner_id, game, resolved_at')
    .eq('status', 'completed')
    .not('winner_id', 'is', null)
    .order('resolved_at', { ascending: false })
    .limit(500)

  if (!matches || matches.length === 0) return []

  // Track current streak per player — stops counting at first loss
  const playerStreaks: Map<string, { streak: number; game: string; done: boolean }> = new Map()

  for (const m of matches) {
    const winnerId = m.winner_id as string
    const loserId = m.player_a_id === winnerId ? m.player_b_id : m.player_a_id

    // Winner: increment streak if not already broken
    if (!playerStreaks.has(winnerId)) {
      playerStreaks.set(winnerId, { streak: 1, game: m.game, done: false })
    } else {
      const entry = playerStreaks.get(winnerId)!
      if (!entry.done) entry.streak++
    }

    // Loser: mark streak as broken
    if (!playerStreaks.has(loserId)) {
      playerStreaks.set(loserId, { streak: 0, game: m.game, done: true })
    } else {
      const entry = playerStreaks.get(loserId)!
      entry.done = true
    }
  }

  return Array.from(playerStreaks.entries())
    .filter(([, v]) => v.streak >= 3)
    .map(([playerId, v]) => ({ playerId, streak: v.streak, game: v.game }))
    .sort((a, b) => b.streak - a.streak)
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns top 5 players with highest win streaks as bounty targets,
 * with bounty amounts ($2-$10 based on streak length).
 */
export async function getActiveBounties(): Promise<BountyTarget[]> {
  const supabase = createServiceClient()

  // Check cached bounties first
  const { data: cached } = await supabase
    .from('bounty_board')
    .select('*')
    .eq('active', true)
    .order('bounty_amount', { ascending: false })
    .limit(MAX_BOUNTIES)

  if (cached && cached.length > 0) {
    return cached.map((b: Record<string, unknown>) => ({
      player_id: b.player_id as string,
      username: b.username as string,
      avatar_url: b.avatar_url as string | null,
      win_streak: b.win_streak as number,
      bounty_amount: b.bounty_amount as number,
      game: b.game as string,
    }))
  }

  // Fall back to computing on-the-fly
  return computeBounties()
}

/**
 * Recalculate bounties from match history, store in bounty_board table.
 * Called by the weekly cron.
 */
export async function refreshBounties(): Promise<BountyTarget[]> {
  const supabase = createServiceClient()

  // Mark old bounties as inactive
  await supabase
    .from('bounty_board')
    .update({ active: false })
    .eq('active', true)

  const bounties = await computeBounties()

  if (bounties.length > 0) {
    await supabase.from('bounty_board').insert(
      bounties.map(b => ({
        player_id: b.player_id,
        username: b.username,
        avatar_url: b.avatar_url,
        win_streak: b.win_streak,
        bounty_amount: b.bounty_amount,
        game: b.game,
        active: true,
        created_at: new Date().toISOString(),
      }))
    )
  }

  return bounties
}

/**
 * Compute bounty targets from current streaks (internal helper).
 */
async function computeBounties(): Promise<BountyTarget[]> {
  const supabase = createServiceClient()
  const streaks = await computeWinStreaks()

  const topStreaks = streaks
    .filter(s => getBountyAmount(s.streak) > 0)
    .slice(0, MAX_BOUNTIES)

  if (topStreaks.length === 0) return []

  // Fetch player details
  const playerIds = topStreaks.map(s => s.playerId)
  const { data: players } = await supabase
    .from('players')
    .select('id, username, avatar_url')
    .in('id', playerIds)

  const playerMap = new Map((players ?? []).map((p: Record<string, unknown>) => [p.id, p]))

  return topStreaks.map(s => {
    const player = playerMap.get(s.playerId) as Record<string, unknown> | undefined
    return {
      player_id: s.playerId,
      username: (player?.username as string) ?? 'Unknown',
      avatar_url: (player?.avatar_url as string) ?? null,
      win_streak: s.streak,
      bounty_amount: getBountyAmount(s.streak),
      game: s.game,
    }
  })
}

/**
 * Check if a completed match resulted in someone beating a bounty target.
 * If so, records the bounty claim and credits the claimer.
 */
export async function checkBountyWin(matchId: string): Promise<BountyClaim | null> {
  const supabase = createServiceClient()

  // Fetch the match
  const { data: match } = await supabase
    .from('matches')
    .select('id, player_a_id, player_b_id, winner_id, game, resolved_at')
    .eq('id', matchId)
    .eq('status', 'completed')
    .single()

  if (!match || !match.winner_id) return null

  const loserId = match.player_a_id === match.winner_id
    ? match.player_b_id
    : match.player_a_id

  // Check if the loser was an active bounty target
  const { data: bounty } = await supabase
    .from('bounty_board')
    .select('*')
    .eq('player_id', loserId)
    .eq('active', true)
    .single()

  if (!bounty) return null

  // Bounty claimed! Get claimer info
  const { data: claimer } = await supabase
    .from('players')
    .select('id, username')
    .eq('id', match.winner_id)
    .single()

  const claim: BountyClaim = {
    id: crypto.randomUUID(),
    match_id: matchId,
    bounty_target_id: loserId,
    bounty_target_username: bounty.username,
    claimer_id: match.winner_id,
    claimer_username: claimer?.username ?? 'Unknown',
    bounty_amount: bounty.bounty_amount,
    game: match.game,
    claimed_at: new Date().toISOString(),
  }

  // Record the claim
  await supabase.from('bounty_claims').insert(claim)

  // Credit the claimer
  await supabase.rpc('increment_balance', {
    player_id: match.winner_id,
    field: 'usdc_balance',
    amount: bounty.bounty_amount,
  })

  // Record the transaction
  await supabase.from('transactions').insert({
    player_id: match.winner_id,
    type: 'bounty_claim',
    amount: bounty.bounty_amount,
    note: `Bounty claimed: defeated ${bounty.username} (${bounty.win_streak}-streak)`,
  })

  // Deactivate the claimed bounty
  await supabase
    .from('bounty_board')
    .update({ active: false })
    .eq('player_id', loserId)
    .eq('active', true)

  return claim
}

/**
 * Returns past bounty claims, most recent first.
 */
export async function getBountyHistory(limit = 20): Promise<BountyClaim[]> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('bounty_claims')
    .select('*')
    .order('claimed_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as BountyClaim[]
}
