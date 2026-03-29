import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/clans/[id] — clan details with members
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id: clanId } = await ctx.params
  const playerId = await readSession(req)
  const db = createServiceClient()

  const { data: clan, error } = await db
    .from('clans')
    .select('*')
    .eq('id', clanId)
    .single()

  if (error || !clan) {
    return NextResponse.json({ error: 'Clan not found' }, { status: 404 })
  }

  // Get members
  const { data: members } = await db
    .from('clan_members')
    .select('player_id, role, status, created_at')
    .eq('clan_id', clanId)
    .eq('status', 'active')

  // Get leader name
  const { data: leader } = await db
    .from('players')
    .select('username')
    .eq('id', clan.leader_id)
    .single()

  // Get player details for members
  const memberIds = (members ?? []).map(m => m.player_id)
  let playerMap: Record<string, { username: string; elo: number; games_played: number }> = {}
  if (memberIds.length > 0) {
    const { data: players } = await db
      .from('players')
      .select('id, username, elo, games_played')
      .in('id', memberIds)
    for (const p of players ?? []) {
      playerMap[p.id] = {
        username: p.username ?? 'Unknown',
        elo: p.elo ?? 1000,
        games_played: p.games_played ?? 0,
      }
    }
  }

  const enrichedMembers = (members ?? []).map(m => ({
    player_id: m.player_id,
    role: m.role,
    joined_at: m.created_at,
    username: playerMap[m.player_id]?.username ?? 'Unknown',
    elo: playerMap[m.player_id]?.elo ?? 1000,
    games_played: playerMap[m.player_id]?.games_played ?? 0,
  }))
  // Sort: leader first, then officers, then members
  enrichedMembers.sort((a, b) => {
    const order: Record<string, number> = { leader: 0, officer: 1, member: 2 }
    return (order[a.role] ?? 3) - (order[b.role] ?? 3)
  })

  const elos = enrichedMembers.map(m => m.elo)
  const avgElo = elos.length > 0 ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : 0

  // Check if current user is a member
  let myRole: string | null = null
  let myPending = false
  if (playerId) {
    const myMember = (members ?? []).find(m => m.player_id === playerId)
    if (myMember) myRole = myMember.role

    if (!myRole) {
      const { data: pending } = await db
        .from('clan_members')
        .select('id')
        .eq('clan_id', clanId)
        .eq('player_id', playerId)
        .eq('status', 'pending')
        .limit(1)
      if (pending && pending.length > 0) myPending = true
    }
  }

  // Clan rank: count clans with higher avg ELO
  const { count: higherCount } = await db
    .from('clans')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    clan: {
      ...clan,
      leader_name: leader?.username ?? 'Unknown',
      member_count: enrichedMembers.length,
      avg_elo: avgElo,
      total_wins: 0, // placeholder until clan matches exist
      clan_rank: higherCount ?? 0,
      members: enrichedMembers,
      my_role: myRole,
      my_pending: myPending,
    },
  })
}

// POST /api/clans/[id] — actions: join, leave, kick, promote, update
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: clanId } = await ctx.params
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body
  const db = createServiceClient()

  // Verify clan exists
  const { data: clan } = await db.from('clans').select('*').eq('id', clanId).single()
  if (!clan) return NextResponse.json({ error: 'Clan not found' }, { status: 404 })

  // Helper: get member record
  async function getMember(pid: string) {
    const { data } = await db
      .from('clan_members')
      .select('*')
      .eq('clan_id', clanId)
      .eq('player_id', pid)
      .eq('status', 'active')
      .single()
    return data
  }

  if (action === 'join') {
    // Check not already a member
    const existing = await getMember(playerId)
    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 400 })

    // Check for pending application
    const { data: pending } = await db
      .from('clan_members')
      .select('id')
      .eq('clan_id', clanId)
      .eq('player_id', playerId)
      .eq('status', 'pending')
      .limit(1)
    if (pending && pending.length > 0) {
      return NextResponse.json({ error: 'Application already pending' }, { status: 400 })
    }

    const status = clan.invite_only ? 'pending' : 'active'
    await db.from('clan_members').insert({
      clan_id: clanId,
      player_id: playerId,
      role: 'member',
      status,
    })

    return NextResponse.json({ ok: true, status })
  }

  if (action === 'leave') {
    if (clan.leader_id === playerId) {
      return NextResponse.json({ error: 'Leader cannot leave. Transfer leadership or disband.' }, { status: 400 })
    }
    await db
      .from('clan_members')
      .delete()
      .eq('clan_id', clanId)
      .eq('player_id', playerId)

    return NextResponse.json({ ok: true })
  }

  if (action === 'kick') {
    const me = await getMember(playerId)
    if (!me || (me.role !== 'leader' && me.role !== 'officer')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const targetId = body.player_id
    if (!targetId) return NextResponse.json({ error: 'player_id required' }, { status: 400 })

    const target = await getMember(targetId)
    if (!target) return NextResponse.json({ error: 'Player not in clan' }, { status: 400 })
    if (target.role === 'leader') return NextResponse.json({ error: 'Cannot kick the leader' }, { status: 400 })
    if (target.role === 'officer' && me.role !== 'leader') {
      return NextResponse.json({ error: 'Only the leader can kick officers' }, { status: 403 })
    }

    await db
      .from('clan_members')
      .delete()
      .eq('clan_id', clanId)
      .eq('player_id', targetId)

    return NextResponse.json({ ok: true })
  }

  if (action === 'promote') {
    if (clan.leader_id !== playerId) {
      return NextResponse.json({ error: 'Only the leader can promote' }, { status: 403 })
    }

    const targetId = body.player_id
    if (!targetId) return NextResponse.json({ error: 'player_id required' }, { status: 400 })

    await db
      .from('clan_members')
      .update({ role: 'officer' })
      .eq('clan_id', clanId)
      .eq('player_id', targetId)
      .eq('status', 'active')

    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    if (clan.leader_id !== playerId) {
      return NextResponse.json({ error: 'Only the leader can edit settings' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (body.description !== undefined) updates.description = String(body.description).trim().slice(0, 500)
    if (body.invite_only !== undefined) updates.invite_only = Boolean(body.invite_only)

    if (Object.keys(updates).length > 0) {
      await db.from('clans').update(updates).eq('id', clanId)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// DELETE /api/clans/[id] — disband clan (leader only)
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id: clanId } = await ctx.params
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  const { data: clan } = await db.from('clans').select('leader_id').eq('id', clanId).single()
  if (!clan) return NextResponse.json({ error: 'Clan not found' }, { status: 404 })
  if (clan.leader_id !== playerId) {
    return NextResponse.json({ error: 'Only the leader can disband' }, { status: 403 })
  }

  // Delete members first, then clan
  await db.from('clan_members').delete().eq('clan_id', clanId)
  await db.from('clans').delete().eq('id', clanId)

  return NextResponse.json({ ok: true })
}
