import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { readSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/notifications — fetch player's notifications
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const offset = Number(searchParams.get('offset') ?? 0)
  const unreadOnly = searchParams.get('unread') === 'true'

  const supabase = createServiceClient()
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('read', false)

  return NextResponse.json({
    notifications: data ?? [],
    total: count ?? 0,
    unreadCount: unreadCount ?? 0,
    playerId,
  })
}

// POST /api/notifications — mark notifications as read
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = createServiceClient()

  if (body.all === true) {
    // Mark all as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('player_id', playerId)
      .eq('read', false)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('player_id', playerId)
      .in('id', body.ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Provide { ids: string[] } or { all: true }' }, { status: 400 })
}
