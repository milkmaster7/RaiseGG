import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { getCurrentWeekStart, MIN_MEMBERS } from '@/lib/clan-wars'

// GET /api/clan-wars — fetch wars for user's clan
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Find user's active clan
  const { data: membership } = await db
    .from('clan_members')
    .select('clan_id')
    .eq('player_id', playerId)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not in a clan' }, { status: 400 })
  }

  const clanId = membership.clan_id

  // Get wars involving this clan
  const { data: wars, error } = await db
    .from('clan_wars')
    .select('*')
    .or(`clan_a_id.eq.${clanId},clan_b_id.eq.${clanId}`)
    .order('scheduled_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch wars' }, { status: 500 })
  }

  // Enrich with clan names
  const clanIds = [...new Set((wars ?? []).flatMap(w => [w.clan_a_id, w.clan_b_id]))]
  let clanMap: Record<string, { name: string; tag: string }> = {}
  if (clanIds.length > 0) {
    const { data: clans } = await db.from('clans').select('id, name, tag').in('id', clanIds)
    for (const c of clans ?? []) {
      clanMap[c.id] = { name: c.name, tag: c.tag }
    }
  }

  const enriched = (wars ?? []).map(w => ({
    ...w,
    clan_a_name: clanMap[w.clan_a_id]?.name ?? 'Unknown',
    clan_a_tag: clanMap[w.clan_a_id]?.tag ?? '???',
    clan_b_name: clanMap[w.clan_b_id]?.name ?? 'Unknown',
    clan_b_tag: clanMap[w.clan_b_id]?.tag ?? '???',
  }))

  // Check registration status for current week
  const weekStart = getCurrentWeekStart()
  const { data: reg } = await db
    .from('clan_war_registrations')
    .select('id')
    .eq('clan_id', clanId)
    .eq('week_start', weekStart)
    .maybeSingle()

  return NextResponse.json({
    clanId,
    wars: enriched,
    registered: !!reg,
    weekStart,
  })
}

// POST /api/clan-wars — register clan for next week's war
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Find user's clan and role
  const { data: membership } = await db
    .from('clan_members')
    .select('clan_id, role')
    .eq('player_id', playerId)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not in a clan' }, { status: 400 })
  }

  if (membership.role !== 'leader' && membership.role !== 'officer') {
    return NextResponse.json({ error: 'Only leaders and officers can register for wars' }, { status: 403 })
  }

  const clanId = membership.clan_id

  // Check minimum members
  const { count } = await db
    .from('clan_members')
    .select('id', { count: 'exact', head: true })
    .eq('clan_id', clanId)
    .eq('status', 'active')

  if ((count ?? 0) < MIN_MEMBERS) {
    return NextResponse.json(
      { error: `Your clan needs at least ${MIN_MEMBERS} members to participate` },
      { status: 400 }
    )
  }

  const weekStart = getCurrentWeekStart()

  // Check not already registered
  const { data: existing } = await db
    .from('clan_war_registrations')
    .select('id')
    .eq('clan_id', clanId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already registered for this week' }, { status: 409 })
  }

  const { error } = await db.from('clan_war_registrations').insert({
    clan_id: clanId,
    week_start: weekStart,
    registered_by: playerId,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, weekStart })
}
