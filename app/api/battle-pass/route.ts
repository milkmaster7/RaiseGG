import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentTier, getNextTierXP, getUnclaimedRewards, SEASON_CONFIG, BATTLE_TIERS } from '@/lib/battle-pass'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Fetch player's battle pass data
  const [{ data: bpData }, { data: purchase }, { data: claims }] = await Promise.all([
    supabase
      .from('battle_pass_progress')
      .select('total_xp, streak_days')
      .eq('player_id', playerId)
      .eq('season', SEASON_CONFIG.season)
      .single(),
    supabase
      .from('battle_pass_purchases')
      .select('id')
      .eq('player_id', playerId)
      .eq('season', SEASON_CONFIG.season)
      .single(),
    supabase
      .from('battle_pass_claims')
      .select('tier_key')
      .eq('player_id', playerId)
      .eq('season', SEASON_CONFIG.season),
  ])

  const totalXP = bpData?.total_xp ?? 0
  const streakDays = bpData?.streak_days ?? 0
  const isPremium = !!purchase
  const claimedTiers = (claims ?? []).map((c: { tier_key: number }) => c.tier_key)
  const currentTier = getCurrentTier(totalXP)
  const nextTierInfo = getNextTierXP(totalXP)
  const unclaimed = getUnclaimedRewards(totalXP, isPremium, claimedTiers)

  return NextResponse.json({
    season: SEASON_CONFIG.season,
    seasonName: SEASON_CONFIG.name,
    seasonEnd: SEASON_CONFIG.endDate,
    totalXP,
    currentTier,
    nextTier: nextTierInfo,
    isPremium,
    claimedTiers,
    unclaimed,
    streakDays,
  })
}

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  const supabase = createServiceClient()

  // --- Purchase premium pass ---
  if (action === 'purchase') {
    // Check if already purchased
    const { data: existing } = await supabase
      .from('battle_pass_purchases')
      .select('id')
      .eq('player_id', playerId)
      .eq('season', SEASON_CONFIG.season)
      .single()

    if (existing) return NextResponse.json({ error: 'Already purchased' }, { status: 400 })

    // Check balance
    const { data: player } = await supabase
      .from('players')
      .select('usdc_balance')
      .eq('id', playerId)
      .single()

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    if (Number(player.usdc_balance) < SEASON_CONFIG.premiumPrice) {
      return NextResponse.json({ error: 'Insufficient USDC balance' }, { status: 400 })
    }

    // Deduct and record purchase
    const { error: deductErr } = await supabase.rpc('deduct_balance', {
      p_player_id: playerId,
      p_amount: SEASON_CONFIG.premiumPrice,
    })

    if (deductErr) {
      // Fallback: direct update if RPC doesn't exist
      const newBalance = Number(player.usdc_balance) - SEASON_CONFIG.premiumPrice
      await supabase
        .from('players')
        .update({ usdc_balance: newBalance })
        .eq('id', playerId)
    }

    await supabase.from('battle_pass_purchases').insert({
      player_id: playerId,
      season: SEASON_CONFIG.season,
      price_usdc: SEASON_CONFIG.premiumPrice,
    })

    // Log transaction
    await supabase.from('transactions').insert({
      player_id: playerId,
      type: 'battle_pass_purchase',
      amount: -SEASON_CONFIG.premiumPrice,
      currency: 'USDC',
      description: `Season ${SEASON_CONFIG.season} Premium Battle Pass`,
    })

    return NextResponse.json({ success: true })
  }

  // --- Claim reward ---
  if (action === 'claim') {
    const { tier, track } = body as { tier: number; track: 'free' | 'premium' }
    if (!tier || !track) return NextResponse.json({ error: 'Missing tier or track' }, { status: 400 })

    // Verify tier is valid
    const tierData = BATTLE_TIERS.find(t => t.tier === tier)
    if (!tierData) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })

    // Get player XP
    const { data: bpData } = await supabase
      .from('battle_pass_progress')
      .select('total_xp')
      .eq('player_id', playerId)
      .eq('season', SEASON_CONFIG.season)
      .single()

    const totalXP = bpData?.total_xp ?? 0
    const currentTier = getCurrentTier(totalXP)
    if (tier > currentTier) return NextResponse.json({ error: 'Tier not yet unlocked' }, { status: 400 })

    // Check premium requirement
    if (track === 'premium') {
      const { data: purchase } = await supabase
        .from('battle_pass_purchases')
        .select('id')
        .eq('player_id', playerId)
        .eq('season', SEASON_CONFIG.season)
        .single()
      if (!purchase) return NextResponse.json({ error: 'Premium pass required' }, { status: 400 })
    }

    // Check reward exists
    const reward = track === 'premium' ? tierData.premiumReward : tierData.freeReward
    if (!reward) return NextResponse.json({ error: 'No reward for this tier/track' }, { status: 400 })

    // Check not already claimed
    const tierKey = track === 'premium' ? tier * 100 : tier
    const { data: existingClaim } = await supabase
      .from('battle_pass_claims')
      .select('id')
      .eq('player_id', playerId)
      .eq('season', SEASON_CONFIG.season)
      .eq('tier_key', tierKey)
      .single()

    if (existingClaim) return NextResponse.json({ error: 'Already claimed' }, { status: 400 })

    // Insert claim
    await supabase.from('battle_pass_claims').insert({
      player_id: playerId,
      season: SEASON_CONFIG.season,
      tier_key: tierKey,
      tier,
      track,
      reward_name: reward.name,
      reward_type: reward.type,
    })

    // If reward is USDC, credit balance
    if (reward.type === 'usdc' && typeof reward.value === 'number') {
      await supabase.rpc('credit_balance', {
        p_player_id: playerId,
        p_amount: reward.value,
      }).then(async (res) => {
        if (res.error) {
          // Fallback: direct update
          const { data: player } = await supabase
            .from('players')
            .select('usdc_balance')
            .eq('id', playerId)
            .single()
          if (player) {
            await supabase
              .from('players')
              .update({ usdc_balance: Number(player.usdc_balance) + Number(reward.value) })
              .eq('id', playerId)
          }
        }
      })

      await supabase.from('transactions').insert({
        player_id: playerId,
        type: 'battle_pass_reward',
        amount: reward.value,
        currency: 'USDC',
        description: `Battle Pass Tier ${tier} reward: ${reward.name}`,
      })
    }

    return NextResponse.json({ success: true, reward: reward.name })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
