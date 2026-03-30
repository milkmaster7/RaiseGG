import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

type RouteContext = { params: Promise<{ playerId: string }> }

// GET /api/messages/[playerId] — fetch message history with a player
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { playerId: partnerId } = await ctx.params
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Fetch messages between these two users
  const { data: messages, error } = await db
    .from('messages')
    .select('id, sender_id, receiver_id, text, read_at, created_at')
    .or(
      `and(sender_id.eq.${playerId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${playerId})`
    )
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  // Mark unread messages from partner as read
  const unreadIds = (messages ?? [])
    .filter(m => m.sender_id === partnerId && !m.read_at)
    .map(m => m.id)

  if (unreadIds.length > 0) {
    await db
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  // Get partner info
  const { data: partner } = await db
    .from('players')
    .select('id, username, avatar_url')
    .eq('id', partnerId)
    .single()

  return NextResponse.json({
    partner: partner
      ? { id: partner.id, username: partner.username ?? 'Unknown', avatar_url: partner.avatar_url }
      : { id: partnerId, username: 'Unknown', avatar_url: null },
    messages: messages ?? [],
  })
}
