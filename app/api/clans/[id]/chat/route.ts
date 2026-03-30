import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/clans/[id]/chat — fetch last 50 messages or applications
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: clanId } = await ctx.params
  const db = createServiceClient()
  const url = new URL(req.url)
  const type = url.searchParams.get('type')

  // Verify clan exists
  const { data: clan } = await db.from('clans').select('id').eq('id', clanId).single()
  if (!clan) return NextResponse.json({ error: 'Clan not found' }, { status: 404 })

  // Applications mode (for admin recruitment panel)
  if (type === 'applications') {
    const playerId = await readSession(req)
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin role
    const { data: member } = await db
      .from('clan_members')
      .select('role')
      .eq('clan_id', clanId)
      .eq('player_id', playerId)
      .eq('status', 'active')
      .single()

    if (!member || (member.role !== 'leader' && member.role !== 'officer')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch applications from clan_applications table
    const { data: applications } = await db
      .from('clan_applications')
      .select('id, player_id, message, status, created_at')
      .eq('clan_id', clanId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Enrich with player data
    const playerIds = (applications ?? []).map(a => a.player_id)
    let playerMap: Record<string, { username: string; elo: number }> = {}
    if (playerIds.length > 0) {
      const { data: players } = await db
        .from('players')
        .select('id, username, elo')
        .in('id', playerIds)
      for (const p of players ?? []) {
        playerMap[p.id] = { username: p.username ?? 'Unknown', elo: p.elo ?? 1000 }
      }
    }

    const enriched = (applications ?? []).map(a => ({
      ...a,
      username: playerMap[a.player_id]?.username ?? 'Unknown',
      elo: playerMap[a.player_id]?.elo ?? 1000,
    }))

    return NextResponse.json({ applications: enriched })
  }

  // Chat messages mode
  const { data: messages } = await db
    .from('clan_messages')
    .select('id, player_id, content, created_at')
    .eq('clan_id', clanId)
    .order('created_at', { ascending: true })
    .limit(50)

  // Enrich with player data
  const playerIds = [...new Set((messages ?? []).map(m => m.player_id))]
  let playerMap: Record<string, { username: string; avatar_url: string | null }> = {}
  if (playerIds.length > 0) {
    const { data: players } = await db
      .from('players')
      .select('id, username, avatar_url')
      .in('id', playerIds)
    for (const p of players ?? []) {
      playerMap[p.id] = { username: p.username ?? 'Unknown', avatar_url: p.avatar_url ?? null }
    }
  }

  const enriched = (messages ?? []).map(m => ({
    ...m,
    username: playerMap[m.player_id]?.username ?? 'Unknown',
    avatar_url: playerMap[m.player_id]?.avatar_url ?? null,
  }))

  // Online count: count active members who sent a message in last 15 minutes
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data: recentMessages } = await db
    .from('clan_messages')
    .select('player_id')
    .eq('clan_id', clanId)
    .gte('created_at', fifteenMinAgo)

  const onlineCount = new Set((recentMessages ?? []).map(m => m.player_id)).size

  return NextResponse.json({ messages: enriched, onlineCount })
}

// POST /api/clans/[id]/chat — send message or review application
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: clanId } = await ctx.params
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const body = await req.json()

  // Review application action
  if (body.action === 'review_application') {
    const { application_id, status } = body
    if (!application_id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Check admin role
    const { data: member } = await db
      .from('clan_members')
      .select('role')
      .eq('clan_id', clanId)
      .eq('player_id', playerId)
      .eq('status', 'active')
      .single()

    if (!member || (member.role !== 'leader' && member.role !== 'officer')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update application
    await db
      .from('clan_applications')
      .update({ status })
      .eq('id', application_id)
      .eq('clan_id', clanId)

    // If approved, add player as active member
    if (status === 'approved') {
      const { data: app } = await db
        .from('clan_applications')
        .select('player_id')
        .eq('id', application_id)
        .single()

      if (app) {
        // Update pending membership to active, or insert if not exists
        const { data: existing } = await db
          .from('clan_members')
          .select('id')
          .eq('clan_id', clanId)
          .eq('player_id', app.player_id)
          .limit(1)

        if (existing && existing.length > 0) {
          await db
            .from('clan_members')
            .update({ status: 'active', role: 'member' })
            .eq('clan_id', clanId)
            .eq('player_id', app.player_id)
        } else {
          await db.from('clan_members').insert({
            clan_id: clanId,
            player_id: app.player_id,
            role: 'member',
            status: 'active',
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  }

  // Send chat message
  const content = String(body.content ?? '').trim()
  if (!content) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (content.length > 500) return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 })

  // Verify membership
  const { data: member } = await db
    .from('clan_members')
    .select('id')
    .eq('clan_id', clanId)
    .eq('player_id', playerId)
    .eq('status', 'active')
    .single()

  if (!member) {
    return NextResponse.json({ error: 'You must be a clan member to chat' }, { status: 403 })
  }

  const { error } = await db.from('clan_messages').insert({
    clan_id: clanId,
    player_id: playerId,
    content,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
