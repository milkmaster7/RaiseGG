import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ players: [] })

  const supabase = createServiceClient()

  const { data: players } = await supabase
    .from('players')
    .select('username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, country')
    .ilike('username', `%${q}%`)
    .eq('banned', false)
    .limit(20)

  return NextResponse.json({ players: players ?? [] })
}
