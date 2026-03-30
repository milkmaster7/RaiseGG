import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 60

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('playerId')
  if (!playerId) return NextResponse.json({ totalXP: 0, isPremium: false })

  const db = createServiceClient()

  const { data: player } = await db
    .from('players')
    .select('battle_pass_xp, battle_pass_premium')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ totalXP: 0, isPremium: false })

  return NextResponse.json({
    totalXP: player.battle_pass_xp ?? 0,
    isPremium: player.battle_pass_premium ?? false,
  })
}
