import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/teams — list player's teams or browse teams
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  const db = createServiceClient()
  const browse = req.nextUrl.searchParams.get('browse')

  if (browse === 'true') {
    // Public team browser
    const { data } = await db
      .from('teams')
      .select('*, members:team_members(count)')
      .eq('recruiting', true)
      .order('elo', { ascending: false })
      .limit(50)
    return NextResponse.json({ teams: data ?? [] })
  }

  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Player's teams
  const { data: memberships } = await db
    .from('team_members')
    .select('team_id, role, joined_at, teams(*)')
    .eq('player_id', playerId)

  return NextResponse.json({
    teams: (memberships ?? []).map(m => ({
      ...m.teams,
      role: m.role,
      joinedAt: m.joined_at,
    })),
  })
}

// POST /api/teams — create a new team
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, tag, game } = await req.json()
  if (!name || !tag || !game) {
    return NextResponse.json({ error: 'Name, tag and game required' }, { status: 400 })
  }

  if (tag.length > 5) {
    return NextResponse.json({ error: 'Tag must be 5 characters or less' }, { status: 400 })
  }

  const db = createServiceClient()

  // Check tag uniqueness
  const { data: existing } = await db.from('teams').select('id').eq('tag', tag.toUpperCase()).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Tag already taken' }, { status: 409 })

  // Create team
  const { data: team, error } = await db
    .from('teams')
    .insert({
      name,
      tag: tag.toUpperCase(),
      game,
      captain_id: playerId,
      elo: 1000,
      recruiting: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add captain as first member
  await db.from('team_members').insert({
    team_id: team.id,
    player_id: playerId,
    role: 'captain',
  })

  return NextResponse.json({ ok: true, team })
}
