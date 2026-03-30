import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 30

export async function GET() {
  const supabase = createServiceClient()

  // Count players active in last 15 minutes
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .gte('last_seen', cutoff)

  return NextResponse.json({ online: count ?? 0 })
}
