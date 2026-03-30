import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { generateSlug, validateHubInput } from '@/lib/hubs'

// GET /api/hubs — list hubs with search/filter by game/region
export async function GET(req: NextRequest) {
  const db = createServiceClient()
  const url = req.nextUrl

  const search = url.searchParams.get('search')
  const game = url.searchParams.get('game')
  const region = url.searchParams.get('region')

  let query = db
    .from('hubs')
    .select('id, slug, name, game, description, region, min_elo, max_elo, member_count, match_count, is_active, created_at')
    .eq('is_active', true)
    .order('member_count', { ascending: false })
    .limit(50)

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }
  if (game && game !== 'all') {
    query = query.eq('game', game)
  }
  if (region && region !== 'All') {
    query = query.eq('region', region)
  }

  const { data: hubs, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch hubs' }, { status: 500 })
  }

  return NextResponse.json({ hubs: hubs ?? [] })
}

// POST /api/hubs — create a new hub (requires auth)
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const validationError = validateHubInput(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const db = createServiceClient()
  const name = (body.name as string).trim().slice(0, 60)
  const slug = generateSlug(name)

  // Check slug uniqueness
  const { data: existing } = await db
    .from('hubs')
    .select('id')
    .eq('slug', slug)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'A hub with this name already exists' }, { status: 409 })
  }

  // Check owner doesn't already own too many hubs
  const { count } = await db
    .from('hubs')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', playerId)
    .eq('is_active', true)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'You can own a maximum of 5 hubs' }, { status: 400 })
  }

  const { data: hub, error } = await db
    .from('hubs')
    .insert({
      slug,
      name,
      game: body.game,
      description: ((body.description as string) ?? '').trim().slice(0, 1000),
      rules: ((body.rules as string) ?? '').trim().slice(0, 5000),
      region: (body.region as string).trim(),
      min_elo: body.min_elo ?? 0,
      max_elo: body.max_elo ?? 5000,
      owner_id: playerId,
      member_count: 1,
      match_count: 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create hub' }, { status: 500 })
  }

  // Add owner as first member
  await db.from('hub_members').insert({
    hub_id: hub.id,
    player_id: playerId,
    hub_elo: 1000,
    wins: 0,
    losses: 0,
  })

  return NextResponse.json({ hub })
}
