import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/referral — returns the logged-in player's referral code (their player ID)
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('id, username, referred_by')
    .eq('id', playerId)
    .single()

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  return NextResponse.json({
    referralCode: player.id,
    referralLink: `https://raisegg.gg/?ref=${player.id}`,
    referredBy: player.referred_by ?? null,
  })
}

// POST /api/referral — link a referrer to the current player
// Body: { referralCode: string }
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { referralCode?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const referralCode = body.referralCode?.trim()
  if (!referralCode) {
    return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
  }

  // Cannot refer yourself
  if (referralCode === playerId) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
  }

  const db = createServiceClient()

  // Check if player already has a referrer
  const { data: currentPlayer } = await db
    .from('players')
    .select('id, referred_by')
    .eq('id', playerId)
    .single()

  if (!currentPlayer) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  if (currentPlayer.referred_by) {
    return NextResponse.json({ error: 'Referral already applied' }, { status: 409 })
  }

  // Validate the referrer exists and is not banned
  const { data: referrer } = await db
    .from('players')
    .select('id, username, banned')
    .eq('id', referralCode)
    .single()

  if (!referrer) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  if (referrer.banned) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
  }

  // Link the referrer
  const { error } = await db
    .from('players')
    .update({ referred_by: referralCode })
    .eq('id', playerId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    referredBy: referralCode,
    referrerUsername: referrer.username,
  })
}
