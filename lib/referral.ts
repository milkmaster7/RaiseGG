import { createServiceClient } from '@/lib/supabase'

const REFERRAL_BONUS = 1.0 // $1.00 for both referrer and referred

/**
 * Generate a short unique referral code based on username.
 * Format: username (lowercased, alphanumeric only) + 4 random hex chars
 */
export function generateReferralCode(username: string): string {
  const clean = username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
  const rand = Math.random().toString(16).slice(2, 6)
  return `${clean}-${rand}`
}

/**
 * Get existing referral code for a player, or create one if none exists.
 */
export async function getOrCreateReferralCode(
  playerId: string,
  username: string
): Promise<string> {
  const db = createServiceClient()

  // Check if player already has a code
  const { data: player } = await db
    .from('players')
    .select('referral_code')
    .eq('id', playerId)
    .single()

  if (player?.referral_code) return player.referral_code

  // Generate and save a new code (retry on collision)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode(username)
    const { error } = await db
      .from('players')
      .update({ referral_code: code })
      .eq('id', playerId)

    if (!error) return code
  }

  // Fallback: use player ID prefix
  const fallback = playerId.slice(0, 8)
  await db.from('players').update({ referral_code: fallback }).eq('id', playerId)
  return fallback
}

/**
 * Record a new referral relationship.
 */
export async function createReferral(
  referrerId: string,
  referredId: string,
  code: string
): Promise<{ ok: boolean; error?: string; referralId?: string }> {
  const db = createServiceClient()

  // Prevent self-referral
  if (referrerId === referredId) {
    return { ok: false, error: 'Cannot refer yourself' }
  }

  // Check if referred player already has a referrer
  const { data: existing } = await db
    .from('referrals')
    .select('id')
    .eq('referred_id', referredId)
    .maybeSingle()

  if (existing) {
    return { ok: false, error: 'Player already has a referrer' }
  }

  // Insert referral record
  const { data: referral, error } = await db
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referred_id: referredId,
      code,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  // Update referred player's referred_by column
  await db
    .from('players')
    .update({ referred_by: referrerId })
    .eq('id', referredId)

  return { ok: true, referralId: referral.id }
}

/**
 * Claim the referral bonus: gives both referrer and referred $1.00 credit.
 */
export async function claimReferralBonus(
  referralId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = createServiceClient()

  // Get the referral
  const { data: referral } = await db
    .from('referrals')
    .select('id, referrer_id, referred_id, bonus_claimed')
    .eq('id', referralId)
    .single()

  if (!referral) {
    return { ok: false, error: 'Referral not found' }
  }

  if (referral.bonus_claimed) {
    return { ok: false, error: 'Bonus already claimed' }
  }

  // Mark as claimed
  const { error: updateErr } = await db
    .from('referrals')
    .update({ bonus_claimed: true })
    .eq('id', referralId)

  if (updateErr) {
    return { ok: false, error: updateErr.message }
  }

  // Credit both players
  // Use raw RPC to do atomic increments
  await db.rpc('exec_sql', {
    query: `
      UPDATE players SET usdc_balance = usdc_balance + ${REFERRAL_BONUS}
      WHERE id IN ('${referral.referrer_id}', '${referral.referred_id}');
    `,
  })

  // Record transactions for audit trail
  const now = new Date().toISOString()
  await db.from('transactions').insert([
    {
      player_id: referral.referrer_id,
      type: 'referral_bonus',
      amount: REFERRAL_BONUS,
      status: 'completed',
      description: 'Referral bonus — friend signed up',
      created_at: now,
    },
    {
      player_id: referral.referred_id,
      type: 'referral_bonus',
      amount: REFERRAL_BONUS,
      status: 'completed',
      description: 'Referral bonus — joined via referral',
      created_at: now,
    },
  ])

  return { ok: true }
}

/**
 * Get referral stats for a player.
 */
export async function getReferralStats(playerId: string): Promise<{
  totalReferred: number
  totalEarned: number
  referrals: Array<{
    id: string
    referredId: string
    referredUsername: string | null
    bonusClaimed: boolean
    createdAt: string
  }>
}> {
  const db = createServiceClient()

  // Get all referrals where this player is the referrer
  const { data: refs } = await db
    .from('referrals')
    .select('id, referred_id, bonus_claimed, created_at')
    .eq('referrer_id', playerId)
    .order('created_at', { ascending: false })

  const referrals = refs ?? []

  // Fetch usernames for referred players
  const referredIds = referrals.map(r => r.referred_id)
  let usernameMap: Record<string, string> = {}

  if (referredIds.length > 0) {
    const { data: players } = await db
      .from('players')
      .select('id, username')
      .in('id', referredIds)

    for (const p of players ?? []) {
      usernameMap[p.id] = p.username
    }
  }

  const totalReferred = referrals.length
  const totalEarned = referrals.filter(r => r.bonus_claimed).length * REFERRAL_BONUS

  return {
    totalReferred,
    totalEarned,
    referrals: referrals.map(r => ({
      id: r.id,
      referredId: r.referred_id,
      referredUsername: usernameMap[r.referred_id] ?? null,
      bonusClaimed: r.bonus_claimed,
      createdAt: r.created_at,
    })),
  }
}
