import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('matches')
    .select('player_a_id', { count: 'exact', head: true })
    .gte('created_at', since)
  return NextResponse.json({ count: (count ?? 0) * 2 }) // approximate unique players
}
