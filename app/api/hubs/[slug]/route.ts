import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

type Params = { params: Promise<{ slug: string }> }

// GET /api/hubs/[slug] — hub detail with members + leaderboard
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const db = createServiceClient()

  const { data: hub, error } = await db
    .from('hubs')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !hub) {
    return NextResponse.json({ error: 'Hub not found' }, { status: 404 })
  }

  // Get members with player info, ordered by hub_elo (leaderboard)
  const { data: members } = await db
    .from('hub_members')
    .select('hub_id, player_id, hub_elo, wins, losses, joined_at')
    .eq('hub_id', hub.id)
    .order('hub_elo', { ascending: false })
    .limit(100)

  // Enrich with player usernames and avatars
  const playerIds = (members ?? []).map(m => m.player_id)
  let playerMap: Record<string, { username: string; avatar_url: string | null; country: string | null }> = {}

  if (playerIds.length > 0) {
    const { data: players } = await db
      .from('players')
      .select('id, username, avatar_url, country')
      .in('id', playerIds)

    for (const p of players ?? []) {
      playerMap[p.id] = { username: p.username, avatar_url: p.avatar_url, country: p.country }
    }
  }

  const enrichedMembers = (members ?? []).map(m => ({
    ...m,
    username: playerMap[m.player_id]?.username ?? 'Unknown',
    avatar_url: playerMap[m.player_id]?.avatar_url ?? null,
    country: playerMap[m.player_id]?.country ?? null,
  }))

  return NextResponse.json({
    hub,
    members: enrichedMembers,
    leaderboard: enrichedMembers.slice(0, 20),
  })
}

// POST /api/hubs/[slug] — join or leave hub
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const action = body.action as string

  if (!['join', 'leave'].includes(action)) {
    return NextResponse.json({ error: 'Action must be join or leave' }, { status: 400 })
  }

  const db = createServiceClient()

  const { data: hub } = await db
    .from('hubs')
    .select('id, min_elo, max_elo, game, member_count')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!hub) {
    return NextResponse.json({ error: 'Hub not found' }, { status: 404 })
  }

  if (action === 'join') {
    // Check if already a member
    const { data: existing } = await db
      .from('hub_members')
      .select('hub_id')
      .eq('hub_id', hub.id)
      .eq('player_id', playerId)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 })
    }

    // Check ELO requirements
    const { data: player } = await db
      .from('players')
      .select('id, cs2_elo, dota2_elo, deadlock_elo')
      .eq('id', playerId)
      .single()

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    const eloMap: Record<string, number> = {
      cs2: player.cs2_elo ?? 1000,
      dota2: player.dota2_elo ?? 1000,
      deadlock: player.deadlock_elo ?? 1000,
    }
    const playerElo = eloMap[hub.game] ?? 1000
    if (playerElo < hub.min_elo || playerElo > hub.max_elo) {
      return NextResponse.json({
        error: `Your ELO (${playerElo}) is outside the hub range (${hub.min_elo}-${hub.max_elo})`,
      }, { status: 403 })
    }

    // Join
    const { error } = await db.from('hub_members').insert({
      hub_id: hub.id,
      player_id: playerId,
      hub_elo: 1000,
      wins: 0,
      losses: 0,
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to join hub' }, { status: 500 })
    }

    // Increment member count
    await db
      .from('hubs')
      .update({ member_count: hub.member_count + 1 })
      .eq('id', hub.id)

    return NextResponse.json({ joined: true })
  }

  // Leave
  const { error } = await db
    .from('hub_members')
    .delete()
    .eq('hub_id', hub.id)
    .eq('player_id', playerId)

  if (error) {
    return NextResponse.json({ error: 'Failed to leave hub' }, { status: 500 })
  }

  // Decrement member count
  const { data: currentHub } = await db.from('hubs').select('member_count').eq('id', hub.id).single()
  if (currentHub) {
    await db.from('hubs').update({ member_count: Math.max(0, currentHub.member_count - 1) }).eq('id', hub.id)
  }

  return NextResponse.json({ left: true })
}
