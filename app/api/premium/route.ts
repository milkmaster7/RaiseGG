import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

const PREMIUM_PRICE = 2 // $2 USDC per month
const PREMIUM_DAYS = 30

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('premium_until')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const premiumUntil = player.premium_until
  const active = premiumUntil ? new Date(premiumUntil) > new Date() : false

  return NextResponse.json({
    active,
    premiumUntil: premiumUntil ?? null,
  })
}

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { action: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createServiceClient()

  if (body.action === 'subscribe') {
    // Get player balance and current premium status
    const { data: player } = await db
      .from('players')
      .select('usdc_balance, premium_until')
      .eq('id', playerId)
      .single()

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    if (Number(player.usdc_balance) < PREMIUM_PRICE) {
      return NextResponse.json({ error: 'Insufficient USDC balance. You need $2 USDC.' }, { status: 402 })
    }

    // Calculate new premium_until: extend from current expiry if still active, else from now
    const now = new Date()
    const currentExpiry = player.premium_until ? new Date(player.premium_until) : null
    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate.getTime() + PREMIUM_DAYS * 24 * 60 * 60 * 1000)

    // Deduct balance
    const { error: balanceErr } = await db
      .from('players')
      .update({
        usdc_balance: Number(player.usdc_balance) - PREMIUM_PRICE,
        premium_until: newExpiry.toISOString(),
      })
      .eq('id', playerId)

    if (balanceErr) return NextResponse.json({ error: balanceErr.message }, { status: 500 })

    // Record transaction
    await db.from('transactions').insert({
      player_id: playerId,
      type: 'premium_sub',
      amount: -PREMIUM_PRICE,
      note: `Premium subscription: active until ${newExpiry.toISOString().split('T')[0]}`,
    })

    return NextResponse.json({
      ok: true,
      premiumUntil: newExpiry.toISOString(),
    })
  }

  if (body.action === 'cancel') {
    // We don't refund — premium stays active until expiry, just mark as not renewing
    // Since we don't have auto-renewal, cancellation is essentially a no-op.
    // The premium_until date remains as is and simply expires naturally.
    const { data: player } = await db
      .from('players')
      .select('premium_until')
      .eq('id', playerId)
      .single()

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    if (!player.premium_until || new Date(player.premium_until) <= new Date()) {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Subscription will not renew. Premium active until expiry.',
      premiumUntil: player.premium_until,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
