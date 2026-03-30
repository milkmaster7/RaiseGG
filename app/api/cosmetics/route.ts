import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

const EQUIP_COLUMN: Record<string, string> = {
  border: 'equipped_border',
  badge: 'equipped_badge',
  card_border: 'equipped_card_border',
  avatar_effect: 'equipped_avatar_effect',
}

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  const db = createServiceClient()

  // Get all cosmetics
  const { data: allCosmetics } = await db
    .from('cosmetics')
    .select('*')
    .order('category')
    .order('price')

  if (!allCosmetics) return NextResponse.json({ cosmetics: [] })

  let ownedIds = new Set<string>()
  let equippedIds = new Set<string>()

  if (playerId) {
    // Get owned cosmetics
    const { data: owned } = await db
      .from('player_cosmetics')
      .select('cosmetic_id')
      .eq('player_id', playerId)

    ownedIds = new Set((owned ?? []).map(o => o.cosmetic_id))

    // Get equipped cosmetics
    const { data: player } = await db
      .from('players')
      .select('equipped_border, equipped_badge, equipped_card_border, equipped_avatar_effect')
      .eq('id', playerId)
      .single()

    if (player) {
      if (player.equipped_border) equippedIds.add(player.equipped_border)
      if (player.equipped_badge) equippedIds.add(player.equipped_badge)
      if (player.equipped_card_border) equippedIds.add(player.equipped_card_border)
      if (player.equipped_avatar_effect) equippedIds.add(player.equipped_avatar_effect)
    }
  }

  const cosmetics = allCosmetics.map(c => ({
    ...c,
    owned: ownedIds.has(c.id),
    equipped: equippedIds.has(c.id),
  }))

  return NextResponse.json({ cosmetics })
}

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { action: string; cosmeticId?: string }
  try {
    body = await req.json()
  } catch (_) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createServiceClient()

  if (body.action === 'purchase') {
    if (!body.cosmeticId) return NextResponse.json({ error: 'cosmeticId required' }, { status: 400 })

    // Get cosmetic details
    const { data: cosmetic } = await db
      .from('cosmetics')
      .select('*')
      .eq('id', body.cosmeticId)
      .single()

    if (!cosmetic) return NextResponse.json({ error: 'Cosmetic not found' }, { status: 404 })

    // Check if already owned
    const { data: existing } = await db
      .from('player_cosmetics')
      .select('id')
      .eq('player_id', playerId)
      .eq('cosmetic_id', body.cosmeticId)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Already owned' }, { status: 409 })
    }

    // Check if seasonal item has expired (can't purchase after expiration)
    if (cosmetic.seasonal && cosmetic.expires_at && new Date(cosmetic.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This seasonal item has expired and is no longer available for purchase' }, { status: 410 })
    }

    // Free items (like Early Supporter badge) — check eligibility
    if (cosmetic.price === 0 && cosmetic.id === 'badge_early') {
      // Check if fewer than 100 players own it
      const { count } = await db
        .from('player_cosmetics')
        .select('id', { count: 'exact', head: true })
        .eq('cosmetic_id', 'badge_early')

      if ((count ?? 0) >= 100) {
        return NextResponse.json({ error: 'Early Supporter badge is sold out (limited to first 100 users)' }, { status: 410 })
      }
    }

    // Deduct balance if not free
    if (cosmetic.price > 0) {
      const { data: player } = await db
        .from('players')
        .select('usdc_balance')
        .eq('id', playerId)
        .single()

      if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

      if (Number(player.usdc_balance) < cosmetic.price) {
        return NextResponse.json({ error: 'Insufficient USDC balance' }, { status: 402 })
      }

      // Deduct balance
      const { error: balanceErr } = await db
        .from('players')
        .update({ usdc_balance: Number(player.usdc_balance) - cosmetic.price })
        .eq('id', playerId)

      if (balanceErr) return NextResponse.json({ error: balanceErr.message }, { status: 500 })

      // Record transaction
      await db.from('transactions').insert({
        player_id: playerId,
        type: 'cosmetic_purchase',
        amount: -cosmetic.price,
        note: `Purchased cosmetic: ${cosmetic.name}`,
      })
    }

    // Add to player's collection
    const { error: insertErr } = await db.from('player_cosmetics').insert({
      player_id: playerId,
      cosmetic_id: body.cosmeticId,
    })

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  if (body.action === 'equip') {
    if (!body.cosmeticId) return NextResponse.json({ error: 'cosmeticId required' }, { status: 400 })

    // Verify ownership
    const { data: owned } = await db
      .from('player_cosmetics')
      .select('cosmetic_id')
      .eq('player_id', playerId)
      .eq('cosmetic_id', body.cosmeticId)
      .limit(1)

    if (!owned || owned.length === 0) {
      return NextResponse.json({ error: 'You do not own this cosmetic' }, { status: 403 })
    }

    // Get category to know which column to update
    const { data: cosmetic } = await db
      .from('cosmetics')
      .select('category')
      .eq('id', body.cosmeticId)
      .single()

    if (!cosmetic) return NextResponse.json({ error: 'Cosmetic not found' }, { status: 404 })

    const column = EQUIP_COLUMN[cosmetic.category]
    if (!column) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

    const { error: updateErr } = await db
      .from('players')
      .update({ [column]: body.cosmeticId })
      .eq('id', playerId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
