import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { getStreakLoginXP } from '@/lib/battle-pass'

type RewardType = 'elo_boost' | 'usdc_bonus' | 'rake_discount'

interface Reward {
  type: RewardType
  value: number
  label: string
}

function generateReward(): Reward {
  const roll = Math.random()

  if (roll < 0.5) {
    // 50% — ELO boost +5 to +15
    const value = Math.floor(Math.random() * 11) + 5
    return { type: 'elo_boost', value, label: `+${value} ELO Boost` }
  } else if (roll < 0.8) {
    // 30% — USDC bonus $0.10 to $0.50
    const value = Math.round((Math.random() * 0.4 + 0.1) * 100) / 100
    return { type: 'usdc_bonus', value, label: `$${value.toFixed(2)} USDC Bonus` }
  } else {
    // 20% — Rake discount 5-15%
    const value = Math.floor(Math.random() * 11) + 5
    return { type: 'rake_discount', value, label: `${value}% Rake Discount` }
  }
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  )
}

function isYesterday(prev: Date, now: Date): boolean {
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  return isSameDay(prev, yesterday)
}

// GET — check status without claiming
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('login_streak, last_daily_claim, last_login_date')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const now = new Date()
  const lastClaim = player.last_daily_claim ? new Date(player.last_daily_claim) : null
  const alreadyClaimed = lastClaim ? isSameDay(lastClaim, now) : false
  const currentStreak = player.login_streak ?? 0
  const streakInfo = getStreakLoginXP(currentStreak)

  return NextResponse.json({
    alreadyClaimed,
    loginStreak: currentStreak,
    lastClaim: player.last_daily_claim,
    multiplier: streakInfo.multiplier,
    xp: streakInfo.xp,
    nextMilestone: streakInfo.nextMilestone,
    daysToNextMilestone: streakInfo.daysToNextMilestone,
  })
}

// POST — claim daily reward
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('login_streak, last_daily_claim, last_login_date, usdc_balance, raise_points')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const now = new Date()
  const lastClaim = player.last_daily_claim ? new Date(player.last_daily_claim) : null

  // Already claimed today
  if (lastClaim && isSameDay(lastClaim, now)) {
    return NextResponse.json({ error: 'Already claimed today', alreadyClaimed: true }, { status: 400 })
  }

  // ── Comeback Bonus for Lapsed Players ──
  let comebackBonus: { xp: number; points: number; message: string } | null = null
  if (lastClaim) {
    const daysSinceLogin = Math.floor((now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceLogin >= 30) {
      comebackBonus = {
        xp: 500,
        points: 100,
        message: 'Welcome back! You\'ve been away for 30+ days. Here\'s a massive bonus to get you started again.',
      }
    } else if (daysSinceLogin >= 7) {
      comebackBonus = {
        xp: 200,
        points: 50,
        message: 'Welcome back! Here\'s a bonus to get you started again.',
      }
    }
  }

  // Calculate streak — reset on comeback but give bonus to soften the blow
  let newStreak: number
  if (lastClaim && isYesterday(lastClaim, now)) {
    newStreak = (player.login_streak ?? 0) + 1
  } else {
    newStreak = 1
  }

  // Calculate streak-scaled XP and rewards
  const streakInfo = getStreakLoginXP(newStreak)

  // Generate base reward
  const reward = generateReward()

  // Streak milestone labels & real-value rewards
  let milestoneLabel: string | null = null
  let cosmeticDrop: string | null = null
  let streakBonusPoints = 0
  let streakBonusUsdc = 0
  let freeTournamentEntry = false

  if (streakInfo.milestone) {
    switch (newStreak) {
      case 3:
        milestoneLabel = '3-day streak! +100 RaisePoints + 2x XP'
        streakBonusPoints = 100
        break
      case 7:
        milestoneLabel = '7-day streak! $1.00 free match credit + 3x XP'
        streakBonusUsdc = 1.0
        cosmeticDrop = ['flame_avatar', 'neon_border', 'pixel_badge', 'holo_ring'][Math.floor(Math.random() * 4)]
        break
      case 14:
        milestoneLabel = '14-day streak! +500 RaisePoints + exclusive badge + 4x XP'
        streakBonusPoints = 500
        cosmeticDrop = 'badge_streak_veteran'
        break
      case 30:
        milestoneLabel = 'Streak Master! Free tournament entry + badge + 5x XP'
        cosmeticDrop = 'badge_streak'
        freeTournamentEntry = true
        break
    }
  }

  // 60-day milestone (not in STREAK_MILESTONES const but we handle it here)
  if (newStreak === 60) {
    milestoneLabel = '60-day streak! $5.00 free match credit — legendary!'
    streakBonusUsdc = 5.0
  }

  // 10% cosmetic drop chance for days 7-13 (non-milestone days)
  if (!cosmeticDrop && newStreak >= 7 && newStreak < 14 && Math.random() < 0.1) {
    cosmeticDrop = ['flame_avatar', 'neon_border', 'pixel_badge', 'holo_ring'][Math.floor(Math.random() * 4)]
  }

  const todayStr = now.toISOString()

  // Update player record
  const updateFields: Record<string, any> = {
    login_streak: newStreak,
    last_daily_claim: todayStr,
    last_login_date: todayStr,
  }

  // If USDC bonus from base reward, credit directly
  if (reward.type === 'usdc_bonus') {
    updateFields.usdc_balance = (player.usdc_balance ?? 0) + reward.value
  }

  // Apply streak milestone USDC bonus (7-day = $1, 60-day = $5)
  if (streakBonusUsdc > 0) {
    updateFields.usdc_balance = (updateFields.usdc_balance ?? player.usdc_balance ?? 0) + streakBonusUsdc
  }

  // Apply comeback bonus RaisePoints
  if (comebackBonus) {
    updateFields.raise_points = ((player.raise_points as number) ?? 0) + comebackBonus.points
  }

  // Apply streak milestone RaisePoints bonus (stacks with comeback)
  if (streakBonusPoints > 0) {
    const currentPts = (updateFields.raise_points as number) ?? (player.raise_points as number) ?? 0
    updateFields.raise_points = currentPts + streakBonusPoints
  }

  await db.from('players').update(updateFields).eq('id', playerId)

  // 30-day streak: free tournament entry for next daily tournament
  if (freeTournamentEntry) {
    const { data: nextTournament } = await db
      .from('tournaments')
      .select('id')
      .eq('status', 'upcoming')
      .order('starts_at', { ascending: true })
      .limit(1)
      .single()

    if (nextTournament) {
      // Check not already registered
      const { data: existingReg } = await db
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', nextTournament.id)
        .eq('player_id', playerId)
        .single()

      if (!existingReg) {
        await db.from('tournament_registrations').insert({
          tournament_id: nextTournament.id,
          player_id: playerId,
          paid: true,
        })
        await db.from('transactions').insert({
          player_id: playerId,
          type: 'win',
          amount: 0,
          note: `30-day streak reward: free tournament entry (${nextTournament.id})`,
        })
      }
    }
  }

  // Save reward to daily_rewards table
  await db.from('daily_rewards').insert({
    player_id: playerId,
    reward_type: reward.type,
    reward_value: reward.value,
    streak_day: newStreak,
    milestone: milestoneLabel,
    multiplier: streakInfo.multiplier,
    cosmetic_drop: cosmeticDrop,
  })

  // Log USDC transactions
  if (reward.type === 'usdc_bonus') {
    await db.from('transactions').insert({
      player_id: playerId,
      type: 'win',
      amount: reward.value,
      note: `Daily reward: ${reward.label}`,
    })
  }
  if (streakBonusUsdc > 0) {
    await db.from('transactions').insert({
      player_id: playerId,
      type: 'win',
      amount: streakBonusUsdc,
      note: `${newStreak}-day streak milestone: $${streakBonusUsdc.toFixed(2)} match credit`,
    })
  }

  // Log comeback bonus
  if (comebackBonus) {
    await db.from('daily_rewards').insert({
      player_id: playerId,
      reward_type: 'comeback_bonus',
      reward_value: comebackBonus.points,
      streak_day: 0,
      milestone: comebackBonus.message,
      multiplier: 1,
    })
  }

  return NextResponse.json({
    reward,
    loginStreak: newStreak,
    milestone: milestoneLabel,
    multiplier: streakInfo.multiplier,
    xp: comebackBonus ? streakInfo.xp + comebackBonus.xp : streakInfo.xp,
    cosmeticDrop,
    nextMilestone: streakInfo.nextMilestone,
    daysToNextMilestone: streakInfo.daysToNextMilestone,
    streakBonusPoints,
    streakBonusUsdc,
    freeTournamentEntry,
    alreadyClaimed: false,
    comebackBonus: comebackBonus ? {
      xp: comebackBonus.xp,
      points: comebackBonus.points,
      message: comebackBonus.message,
    } : null,
  })
}
