import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Get player info
  const { data: player } = await db
    .from('players')
    .select('id, username')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  // Count referrals
  const { count: totalReferrals } = await db
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', playerId)

  // Count active referrals (played at least 1 match in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: referredPlayers } = await db
    .from('players')
    .select('id')
    .eq('referred_by', playerId)

  let activeReferrals = 0
  if (referredPlayers && referredPlayers.length > 0) {
    const referredIds = referredPlayers.map(p => p.id)
    // Check which referred players have matches recently
    const { data: activeMatches } = await db
      .from('matches')
      .select('player_a_id, player_b_id')
      .gte('created_at', thirtyDaysAgo)
      .in('player_a_id', referredIds)

    const { data: activeMatchesB } = await db
      .from('matches')
      .select('player_a_id, player_b_id')
      .gte('created_at', thirtyDaysAgo)
      .in('player_b_id', referredIds)

    const activePlayerIds = new Set<string>()
    activeMatches?.forEach(m => { if (referredIds.includes(m.player_a_id)) activePlayerIds.add(m.player_a_id) })
    activeMatchesB?.forEach(m => { if (referredIds.includes(m.player_b_id)) activePlayerIds.add(m.player_b_id) })
    activeReferrals = activePlayerIds.size
  }

  // Calculate tier
  const total = totalReferrals ?? 0
  let tier: 'starter' | 'silver' | 'gold' = 'starter'
  let tierRate = 0.05
  if (total >= 50) { tier = 'gold'; tierRate = 0.10 }
  else if (total >= 10) { tier = 'silver'; tierRate = 0.075 }

  // Get earnings history (referral_bonus transactions)
  const { data: earnings } = await db
    .from('transactions')
    .select('amount, note, created_at')
    .eq('player_id', playerId)
    .eq('type', 'referral_bonus')
    .order('created_at', { ascending: false })
    .limit(50)

  const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0

  // Parse history — note format: "Referral bonus: {username} won ${amount}"
  const history = (earnings ?? []).map(e => {
    const noteMatch = e.note?.match(/Referral bonus: (.+) won \$(.+)/)
    return {
      date: e.created_at,
      referredPlayer: noteMatch?.[1] ?? 'Unknown',
      winAmount: noteMatch ? parseFloat(noteMatch[2]) : 0,
      commission: Number(e.amount),
    }
  })

  return NextResponse.json({
    referralCode: player.id,
    referralLink: `https://raisegg.com/?ref=${player.id}`,
    totalReferrals: total,
    activeReferrals,
    totalEarnings,
    tier,
    tierRate,
    history,
  })
}

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { action: string; platform?: string; handle?: string; followerCount?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createServiceClient()

  if (body.action === 'creator_status') {
    const { data } = await db
      .from('creator_applications')
      .select('status')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ application: data ?? null })
  }

  if (body.action === 'apply_creator') {
    if (!body.platform || !body.handle || !body.followerCount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (body.followerCount < 1000) {
      return NextResponse.json({ error: 'Minimum 1,000 followers required' }, { status: 400 })
    }

    // Check if already applied
    const { data: existing } = await db
      .from('creator_applications')
      .select('id')
      .eq('player_id', playerId)
      .in('status', ['pending', 'approved'])
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Application already submitted' }, { status: 409 })
    }

    const { error } = await db.from('creator_applications').insert({
      player_id: playerId,
      platform: body.platform,
      handle: body.handle,
      follower_count: body.followerCount,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
