import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

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

  return NextResponse.json({
    alreadyClaimed,
    loginStreak: player.login_streak ?? 0,
    lastClaim: player.last_daily_claim,
  })
}

// POST — claim daily reward
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('login_streak, last_daily_claim, last_login_date, usdc_balance')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const now = new Date()
  const lastClaim = player.last_daily_claim ? new Date(player.last_daily_claim) : null

  // Already claimed today
  if (lastClaim && isSameDay(lastClaim, now)) {
    return NextResponse.json({ error: 'Already claimed today', alreadyClaimed: true }, { status: 400 })
  }

  // Calculate streak
  let newStreak: number
  if (lastClaim && isYesterday(lastClaim, now)) {
    newStreak = (player.login_streak ?? 0) + 1
  } else {
    newStreak = 1
  }

  // Generate reward
  const reward = generateReward()

  // Apply streak milestone bonuses
  let milestoneLabel: string | null = null
  if (newStreak === 3) milestoneLabel = '3-day streak! +10% ELO bonus on next match'
  else if (newStreak === 7) milestoneLabel = '7-day streak! 5% rake discount earned'
  else if (newStreak === 14) milestoneLabel = '14-day streak! $1.00 USDC bonus earned'
  else if (newStreak === 30) milestoneLabel = '30-day streak! Exclusive badge unlocked'

  const todayStr = now.toISOString()

  // Update player record
  const updateFields: Record<string, any> = {
    login_streak: newStreak,
    last_daily_claim: todayStr,
    last_login_date: todayStr,
  }

  // If USDC bonus, credit directly
  if (reward.type === 'usdc_bonus') {
    updateFields.usdc_balance = (player.usdc_balance ?? 0) + reward.value
  }

  // Apply 14-day milestone USDC bonus
  if (newStreak === 14) {
    updateFields.usdc_balance = (updateFields.usdc_balance ?? player.usdc_balance ?? 0) + 1.0
  }

  await db.from('players').update(updateFields).eq('id', playerId)

  // Save reward to daily_rewards table
  await db.from('daily_rewards').insert({
    player_id: playerId,
    reward_type: reward.type,
    reward_value: reward.value,
    streak_day: newStreak,
    milestone: milestoneLabel,
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
  if (newStreak === 14) {
    await db.from('transactions').insert({
      player_id: playerId,
      type: 'win',
      amount: 1.0,
      note: '14-day streak milestone: $1.00 USDC bonus',
    })
  }

  return NextResponse.json({
    reward,
    loginStreak: newStreak,
    milestone: milestoneLabel,
    alreadyClaimed: false,
  })
}
