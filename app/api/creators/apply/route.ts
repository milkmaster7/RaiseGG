import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, platform, channel_url, audience_size, reason } = body

  if (!name || !platform || !channel_url || !audience_size) {
    return NextResponse.json(
      { error: 'Name, platform, channel URL, and audience size are required.' },
      { status: 400 }
    )
  }

  const db = createServiceClient()

  // Optional: link to logged-in player
  const playerId = await readSession(req)

  // Check for duplicate applications from same channel URL
  const { data: existing } = await db
    .from('creator_applications')
    .select('id')
    .eq('channel_url', channel_url)
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'An application with this channel URL already exists.' },
      { status: 409 }
    )
  }

  const size = parseInt(String(audience_size))

  const { error } = await db.from('creator_applications').insert({
    player_id: playerId || null,
    name,
    platform,
    channel_url,
    audience_size: size,
    handle: channel_url,        // backward compat with existing column
    follower_count: size,       // backward compat with existing column
    reason: reason || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Creator application insert error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
