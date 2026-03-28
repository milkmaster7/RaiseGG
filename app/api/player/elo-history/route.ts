import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ points: [] })

  const game = req.nextUrl.searchParams.get('game') ?? 'cs2'
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('elo_history')
    .select('elo, recorded_at')
    .eq('player_id', playerId)
    .eq('game', game)
    .order('recorded_at', { ascending: true })
    .limit(30)

  return NextResponse.json({ points: data ?? [] })
}
