import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/clans — list clans with filters
export async function GET(req: NextRequest) {
  const db = createServiceClient()
  const url = req.nextUrl

  const search = url.searchParams.get('search')
  const game = url.searchParams.get('game')
  const region = url.searchParams.get('region')

  let query = db
    .from('clans')
    .select('id, name, tag, description, game_focus, region, invite_only, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (search) {
    query = query.or(`name.ilike.%${search}%,tag.ilike.%${search}%`)
  }
  if (game && game !== 'all') {
    query = query.eq('game_focus', game)
  }
  if (region && region !== 'All') {
    query = query.eq('region', region)
  }

  const { data: clans, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch clans' }, { status: 500 })
  }

  // Get member counts and avg ELO for each clan
  const clanIds = (clans ?? []).map(c => c.id)

  let memberStats: Record<string, { member_count: number; avg_elo: number }> = {}
  if (clanIds.length > 0) {
    const { data: members } = await db
      .from('clan_members')
      .select('clan_id, player_id')
      .in('clan_id', clanIds)
      .eq('status', 'active')

    // Get all unique player IDs
    const playerIds = [...new Set((members ?? []).map(m => m.player_id))]
    let playerElos: Record<string, number> = {}
    if (playerIds.length > 0) {
      const { data: players } = await db
        .from('players')
        .select('id, elo')
        .in('id', playerIds)
      for (const p of players ?? []) {
        playerElos[p.id] = p.elo ?? 1000
      }
    }

    // Aggregate per clan
    for (const cid of clanIds) {
      const clanMembers = (members ?? []).filter(m => m.clan_id === cid)
      const elos = clanMembers.map(m => playerElos[m.player_id] ?? 1000)
      memberStats[cid] = {
        member_count: clanMembers.length,
        avg_elo: elos.length > 0 ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : 0,
      }
    }
  }

  const enriched = (clans ?? []).map(c => ({
    ...c,
    member_count: memberStats[c.id]?.member_count ?? 0,
    avg_elo: memberStats[c.id]?.avg_elo ?? 0,
  }))

  return NextResponse.json({ clans: enriched })
}

// POST /api/clans — create a new clan
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, tag, description, game_focus, region, invite_only } = body

  if (!name?.trim() || !tag?.trim()) {
    return NextResponse.json({ error: 'Name and tag are required' }, { status: 400 })
  }

  const cleanTag = tag.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleanTag.length < 3 || cleanTag.length > 5) {
    return NextResponse.json({ error: 'Tag must be 3-5 uppercase characters' }, { status: 400 })
  }

  const db = createServiceClient()

  // Check tag uniqueness
  const { data: existing } = await db
    .from('clans')
    .select('id')
    .eq('tag', cleanTag)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Tag already taken' }, { status: 409 })
  }

  // Create clan
  const { data: clan, error } = await db
    .from('clans')
    .insert({
      name: name.trim().slice(0, 30),
      tag: cleanTag,
      description: (description ?? '').trim().slice(0, 500),
      game_focus: game_focus ?? 'cs2',
      region: region ?? 'EU',
      invite_only: invite_only ?? false,
      leader_id: playerId,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create clan' }, { status: 500 })
  }

  // Add creator as leader member
  await db.from('clan_members').insert({
    clan_id: clan.id,
    player_id: playerId,
    role: 'leader',
    status: 'active',
  })

  return NextResponse.json({ clan })
}
