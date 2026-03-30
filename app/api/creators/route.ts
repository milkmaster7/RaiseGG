import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 300 // cache for 5 minutes

export async function GET() {
  const db = createServiceClient()

  const { data: creators } = await db
    .from('creator_applications')
    .select('name, handle, platform')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    creators: (creators || []).map(c => ({
      username: c.name || c.handle || 'Creator',
      platform: c.platform,
    })),
  })
}
