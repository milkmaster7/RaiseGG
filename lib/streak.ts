/**
 * lib/streak.ts — Streak Insurance System
 *
 * Track daily match streaks. After 7-day streak, offer "streak insurance":
 * lose your next match, get 50% stake back (capped at $5).
 *
 * ─── SQL Migration ──────────────────────────────────────────────────────────
 *
 * Run in Supabase SQL Editor:
 * https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
 *
 * CREATE TABLE IF NOT EXISTS player_streaks (
 *   user_id             UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
 *   current_streak      INT NOT NULL DEFAULT 0,
 *   longest_streak      INT NOT NULL DEFAULT 0,
 *   last_match_date     DATE,
 *   insurance_available BOOLEAN NOT NULL DEFAULT false,
 *   insurance_last_used TIMESTAMPTZ,
 *   updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
 * );
 *
 * CREATE INDEX idx_player_streaks_streak ON player_streaks(current_streak DESC);
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import { createServiceClient } from '@/lib/supabase'

const INSURANCE_STREAK_THRESHOLD = 7
const INSURANCE_REFUND_PERCENT = 0.50
const INSURANCE_MAX_REFUND = 5.00

interface UserStreak {
  currentStreak: number
  longestStreak: number
  hasInsurance: boolean
  insuranceUsedToday: boolean
}

/**
 * Get the current streak info for a user.
 */
export async function getUserStreak(userId: string): Promise<UserStreak> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('player_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      hasInsurance: false,
      insuranceUsedToday: false,
    }
  }

  // Check if insurance was used today
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const insuranceUsedToday = data.insurance_last_used
    ? new Date(data.insurance_last_used) >= today
    : false

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    hasInsurance: data.insurance_available && data.current_streak >= INSURANCE_STREAK_THRESHOLD,
    insuranceUsedToday,
  }
}

/**
 * Update streak after a match result.
 * Call this after every resolved match.
 */
export async function updateStreak(userId: string, won: boolean): Promise<UserStreak> {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('player_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  if (!existing) {
    // First match ever — create record
    const newStreak = won ? 1 : 0
    await supabase.from('player_streaks').insert({
      user_id: userId,
      current_streak: newStreak,
      longest_streak: newStreak,
      last_match_date: today,
      insurance_available: newStreak >= INSURANCE_STREAK_THRESHOLD,
    })
    return {
      currentStreak: newStreak,
      longestStreak: newStreak,
      hasInsurance: newStreak >= INSURANCE_STREAK_THRESHOLD,
      insuranceUsedToday: false,
    }
  }

  let newStreak: number

  if (won) {
    // Continue streak if last match was today or yesterday, otherwise start fresh
    const lastDate = existing.last_match_date
    if (lastDate === today) {
      // Already played today — keep current streak (don't double-count same day)
      newStreak = existing.current_streak
    } else if (lastDate === yesterday) {
      // Consecutive day — increment
      newStreak = existing.current_streak + 1
    } else {
      // Gap in days — start new streak
      newStreak = 1
    }
  } else {
    // Lost — reset streak (but insurance may apply separately)
    newStreak = 0
  }

  const longestStreak = Math.max(existing.longest_streak, newStreak)
  const insuranceAvailable = newStreak >= INSURANCE_STREAK_THRESHOLD

  await supabase
    .from('player_streaks')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_match_date: today,
      insurance_available: insuranceAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const insuranceUsedToday = existing.insurance_last_used
    ? new Date(existing.insurance_last_used) >= todayStart
    : false

  return {
    currentStreak: newStreak,
    longestStreak,
    hasInsurance: insuranceAvailable,
    insuranceUsedToday,
  }
}

/**
 * Check if insurance applies and refund 50% of stake (up to $5).
 * Call this when a user with 7+ streak loses a match.
 *
 * Returns the refund amount (0 if insurance not applicable).
 */
export async function checkAndApplyInsurance(
  userId: string,
  matchId: string
): Promise<{ refunded: boolean; amount: number; message: string }> {
  const supabase = createServiceClient()

  // Get streak data
  const { data: streak } = await supabase
    .from('player_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!streak) {
    return { refunded: false, amount: 0, message: 'No streak data found.' }
  }

  // Must have 7+ streak and insurance available
  if (streak.current_streak < INSURANCE_STREAK_THRESHOLD || !streak.insurance_available) {
    return { refunded: false, amount: 0, message: 'Streak insurance not available.' }
  }

  // Check if already used today
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  if (streak.insurance_last_used && new Date(streak.insurance_last_used) >= today) {
    return { refunded: false, amount: 0, message: 'Streak insurance already used today.' }
  }

  // Get match details to find stake amount
  const { data: match } = await supabase
    .from('matches')
    .select('stake_amount, currency')
    .eq('id', matchId)
    .single()

  if (!match) {
    return { refunded: false, amount: 0, message: 'Match not found.' }
  }

  // Calculate refund: 50% of stake, capped at $5
  const rawRefund = Number(match.stake_amount) * INSURANCE_REFUND_PERCENT
  const refundAmount = Math.min(rawRefund, INSURANCE_MAX_REFUND)
  const roundedRefund = Math.round(refundAmount * 100) / 100

  if (roundedRefund <= 0) {
    return { refunded: false, amount: 0, message: 'Stake too small for insurance.' }
  }

  const currency = match.currency ?? 'usdc'
  const balanceField = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'

  // Credit the refund
  const { error: balanceError } = await supabase.rpc('increment_balance', {
    player_id: userId,
    field: balanceField,
    amount: roundedRefund,
  })

  if (balanceError) {
    console.error('Streak insurance refund error:', balanceError)
    return { refunded: false, amount: 0, message: 'Failed to process refund.' }
  }

  // Record the insurance transaction
  await supabase.from('transactions').insert({
    player_id: userId,
    type: 'streak_insurance',
    amount: roundedRefund,
    match_id: matchId,
    note: `Streak insurance refund — 50% of $${match.stake_amount} stake (${streak.current_streak}-day streak)`,
  })

  // Mark insurance as used, but don't reset the streak yet (updateStreak handles that)
  await supabase
    .from('player_streaks')
    .update({
      insurance_available: false,
      insurance_last_used: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return {
    refunded: true,
    amount: roundedRefund,
    message: `Streak insurance activated! $${roundedRefund.toFixed(2)} refunded (50% of your stake).`,
  }
}
