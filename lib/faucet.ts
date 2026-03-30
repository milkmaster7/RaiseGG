/**
 * lib/faucet.ts — Free First Match Faucet ($0.50 USDC)
 *
 * Every new user gets $0.50 USDC locked to their first match.
 * Cannot withdraw — only stake. If they win, they keep winnings.
 *
 * ─── SQL Migration ──────────────────────────────────────────────────────────
 *
 * Run in Supabase SQL Editor:
 * https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
 *
 * CREATE TABLE IF NOT EXISTS faucet_claims (
 *   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 *   amount      NUMERIC(10,2) NOT NULL DEFAULT 0.50,
 *   claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   converted   BOOLEAN NOT NULL DEFAULT false,
 *   UNIQUE(player_id)
 * );
 *
 * CREATE INDEX idx_faucet_claims_player ON faucet_claims(player_id);
 * CREATE INDEX idx_faucet_claims_date   ON faucet_claims(claimed_at);
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import { createServiceClient } from '@/lib/supabase'

const FAUCET_AMOUNT = 0.50
const DAILY_CLAIM_CAP = 100
const ACCOUNT_AGE_LIMIT_DAYS = 7

/**
 * Check whether a user is eligible to claim the faucet.
 * Returns { canClaim, reason? }
 */
export async function canClaimFaucet(userId: string): Promise<{
  canClaim: boolean
  reason?: string
  alreadyClaimed?: boolean
}> {
  const supabase = createServiceClient()

  // 1. Check if already claimed
  const { data: existing } = await supabase
    .from('faucet_claims')
    .select('id')
    .eq('player_id', userId)
    .single()

  if (existing) {
    return { canClaim: false, reason: 'You have already claimed your free $0.50.', alreadyClaimed: true }
  }

  // 2. Check account age (must be < 7 days old)
  const { data: player } = await supabase
    .from('players')
    .select('created_at')
    .eq('id', userId)
    .single()

  if (!player) {
    return { canClaim: false, reason: 'Player not found.' }
  }

  const accountAge = Date.now() - new Date(player.created_at).getTime()
  const maxAge = ACCOUNT_AGE_LIMIT_DAYS * 24 * 60 * 60 * 1000
  if (accountAge > maxAge) {
    return { canClaim: false, reason: 'Faucet is only available for accounts less than 7 days old.' }
  }

  // 3. Check daily global cap
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('faucet_claims')
    .select('id', { count: 'exact', head: true })
    .gte('claimed_at', today.toISOString())

  if ((count ?? 0) >= DAILY_CLAIM_CAP) {
    return { canClaim: false, reason: 'Daily faucet limit reached. Try again tomorrow!' }
  }

  return { canClaim: true }
}

/**
 * Claim the faucet: credit $0.50 USDC to user's balance.
 * Returns { success, message }
 */
export async function claimFaucet(userId: string): Promise<{
  success: boolean
  message: string
}> {
  // Re-check eligibility (prevent race conditions)
  const eligibility = await canClaimFaucet(userId)
  if (!eligibility.canClaim) {
    return { success: false, message: eligibility.reason ?? 'Not eligible.' }
  }

  const supabase = createServiceClient()

  // Insert claim record (unique constraint prevents duplicates)
  const { error: claimError } = await supabase
    .from('faucet_claims')
    .insert({ player_id: userId, amount: FAUCET_AMOUNT })

  if (claimError) {
    // Unique violation = already claimed
    if (claimError.code === '23505') {
      return { success: false, message: 'You have already claimed your free $0.50.' }
    }
    console.error('Faucet claim insert error:', claimError)
    return { success: false, message: 'Failed to claim faucet.' }
  }

  // Credit USDC balance
  const { error: balanceError } = await supabase.rpc('increment_balance', {
    player_id: userId,
    field: 'usdc_balance',
    amount: FAUCET_AMOUNT,
  })

  if (balanceError) {
    console.error('Faucet balance credit error:', balanceError)
    // Rollback claim record
    await supabase.from('faucet_claims').delete().eq('player_id', userId)
    return { success: false, message: 'Failed to credit balance.' }
  }

  // Record transaction
  await supabase.from('transactions').insert({
    player_id: userId,
    type: 'faucet',
    amount: FAUCET_AMOUNT,
    note: 'Free first match faucet — $0.50 USDC',
  })

  return {
    success: true,
    message: 'You have $0.50 to play your first match! Stake it on any CS2, Dota 2, or Deadlock match.',
  }
}

/**
 * Get faucet stats for admin dashboard.
 */
export async function getFaucetStats(): Promise<{
  totalClaimed: number
  totalAmount: number
  convertedToDeposit: number
  todayClaimed: number
}> {
  const supabase = createServiceClient()

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const [allClaims, todayClaims, converted] = await Promise.all([
    supabase
      .from('faucet_claims')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('faucet_claims')
      .select('id', { count: 'exact', head: true })
      .gte('claimed_at', today.toISOString()),
    supabase
      .from('faucet_claims')
      .select('id', { count: 'exact', head: true })
      .eq('converted', true),
  ])

  const totalClaimed = allClaims.count ?? 0

  return {
    totalClaimed,
    totalAmount: totalClaimed * FAUCET_AMOUNT,
    convertedToDeposit: converted.count ?? 0,
    todayClaimed: todayClaims.count ?? 0,
  }
}
