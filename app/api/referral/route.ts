import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import {
  getOrCreateReferralCode,
  createReferral,
  claimReferralBonus,
  getReferralStats,
} from '@/lib/referral'

// GET /api/referral — returns referral code, link, and stats
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

  // Ensure player has a referral code
  const referralCode = await getOrCreateReferralCode(playerId, player.username)
  const stats = await getReferralStats(playerId)

  return NextResponse.json({
    referralCode,
    referralLink: `https://raisegg.com/?ref=${referralCode}`,
    referredBy: player.referred_by ?? null,
    stats,
  })
}

// POST /api/referral — apply a referral code or claim bonus
// Body: { referralCode: string } or { claimReferralId: string }
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { referralCode?: string; claimReferralId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // --- Claim bonus flow ---
  if (body.claimReferralId) {
    const result = await claimReferralBonus(body.claimReferralId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true, message: 'Bonus claimed! $1.00 added to both accounts.' })
  }

  // --- Apply referral code flow ---
  const code = body.referralCode?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
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

  // Find the referrer by their referral_code or by player ID (backward compat)
  const { data: referrer } = await db
    .from('players')
    .select('id, username, banned')
    .or(`referral_code.eq.${code},id.eq.${code}`)
    .maybeSingle()

  if (!referrer) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  if (referrer.banned) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
  }

  if (referrer.id === playerId) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
  }

  // Create the referral
  const result = await createReferral(referrer.id, playerId, code)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Auto-claim the bonus immediately
  if (result.referralId) {
    await claimReferralBonus(result.referralId)
  }

  return NextResponse.json({
    ok: true,
    referredBy: referrer.id,
    referrerUsername: referrer.username,
    message: 'Referral applied! $1.00 bonus added to both accounts.',
  })
}
