import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/messages — list conversations for logged-in user
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Get all messages involving this user, ordered newest first
  const { data: messages, error } = await db
    .from('messages')
    .select('id, sender_id, receiver_id, text, read_at, created_at')
    .or(`sender_id.eq.${playerId},receiver_id.eq.${playerId}`)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  // Group by conversation partner
  const convMap = new Map<string, {
    partnerId: string
    lastMessage: string
    lastMessageAt: string
    unread: number
  }>()

  for (const msg of messages ?? []) {
    const partnerId = msg.sender_id === playerId ? msg.receiver_id : msg.sender_id
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, {
        partnerId,
        lastMessage: msg.text,
        lastMessageAt: msg.created_at,
        unread: 0,
      })
    }
    // Count unread: messages sent TO me that I haven't read
    if (msg.receiver_id === playerId && !msg.read_at) {
      const conv = convMap.get(partnerId)!
      conv.unread++
    }
  }

  const partnerIds = [...convMap.keys()]
  let playerMap: Record<string, { username: string; avatar_url: string | null }> = {}
  if (partnerIds.length > 0) {
    const { data: players } = await db
      .from('players')
      .select('id, username, avatar_url')
      .in('id', partnerIds)
    for (const p of players ?? []) {
      playerMap[p.id] = { username: p.username ?? 'Unknown', avatar_url: p.avatar_url }
    }
  }

  const conversations = [...convMap.values()]
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .map(c => ({
      partnerId: c.partnerId,
      username: playerMap[c.partnerId]?.username ?? 'Unknown',
      avatar_url: playerMap[c.partnerId]?.avatar_url ?? null,
      lastMessage: c.lastMessage.length > 80 ? c.lastMessage.slice(0, 80) + '...' : c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unread: c.unread,
    }))

  return NextResponse.json({ conversations })
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { to, text } = body

  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Recipient required' }, { status: 400 })
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Message text required' }, { status: 400 })
  }
  if (text.length > 500) {
    return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 })
  }
  if (to === playerId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  const db = createServiceClient()

  // Verify recipient exists
  const { data: recipient } = await db
    .from('players')
    .select('id')
    .eq('id', to)
    .single()

  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
  }

  const { data: message, error } = await db
    .from('messages')
    .insert({
      sender_id: playerId,
      receiver_id: to,
      text: text.trim(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ message })
}
