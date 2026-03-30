import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

// POST /api/challenge-link — generate a shareable challenge link
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { game, stakeAmount, currency = 'usdc' } = await req.json()

  if (!game || !['cs2', 'dota2', 'deadlock'].includes(game)) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 })
  }
  if (!stakeAmount || stakeAmount < 1) {
    return NextResponse.json({ error: 'Minimum stake is $1' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: player } = await supabase
    .from('players')
    .select('username')
    .eq('id', playerId)
    .single()

  const linkId = crypto.randomUUID().slice(0, 8) // short 8-char code
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry

  const { error } = await supabase.from('challenge_links').insert({
    id: linkId,
    creator_id: playerId,
    game,
    stake_amount: stakeAmount,
    currency,
    expires_at: expiresAt.toISOString(),
    status: 'active',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const link = `https://raisegg.com/challenge/${linkId}`
  const shareText = `${player?.username ?? 'Someone'} challenged you to a $${stakeAmount} ${game.toUpperCase()} match on RaiseGG!\n${link}`

  return NextResponse.json({
    link,
    linkId,
    shareText,
    telegramUrl: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`,
    expiresAt: expiresAt.toISOString(),
  })
}

// GET /api/challenge-link?id=xxx — get challenge link details
export async function GET(req: NextRequest) {
  const linkId = req.nextUrl.searchParams.get('id')
  if (!linkId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('challenge_links')
    .select('*, creator:players!creator_id(username, avatar_url, cs2_elo, dota2_elo, deadlock_elo)')
    .eq('id', linkId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  if (data.status !== 'active' || new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Challenge expired' }, { status: 410 })
  }

  return NextResponse.json(data)
}
