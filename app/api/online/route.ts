import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 30

export async function GET() {
  const supabase = createServiceClient()

  // Count total registered players
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({ online: count ?? 0 })
}
