import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 60

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('playerId')
  if (!playerId) return NextResponse.json({ equipped: [] })

  const db = createServiceClient()

  const { data: player } = await db
    .from('players')
    .select('equipped_border, equipped_badge, equipped_card_border, equipped_avatar_effect')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ equipped: [] })

  const equippedIds = [
    player.equipped_border,
    player.equipped_badge,
    player.equipped_card_border,
    player.equipped_avatar_effect,
  ].filter(Boolean) as string[]

  if (equippedIds.length === 0) return NextResponse.json({ equipped: [] })

  const { data: cosmetics } = await db
    .from('cosmetics')
    .select('id, name, category, rarity')
    .in('id', equippedIds)

  return NextResponse.json({ equipped: cosmetics ?? [] })
}
