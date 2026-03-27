import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ player: null })

  const supabase = createServiceClient()
  const { data: player } = await supabase
    .from('players')
    .select('id, username, avatar_url')
    .eq('id', playerId)
    .single()

  return NextResponse.json({ player: player ?? null })
}
