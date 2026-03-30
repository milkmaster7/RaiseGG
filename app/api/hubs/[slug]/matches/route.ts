import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

type Params = { params: Promise<{ slug: string }> }

// GET /api/hubs/[slug]/matches — hub-scoped matches
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const db = createServiceClient()

  const { data: hub } = await db
    .from('hubs')
    .select('id, game')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!hub) {
    return NextResponse.json({ error: 'Hub not found' }, { status: 404 })
  }

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
  const limit = 20
  const offset = (Math.max(1, page) - 1) * limit

  const { data: matches, error } = await db
    .from('matches')
    .select('id, game, format, status, stake_amount, stake_currency, creator_id, opponent_id, winner_id, map, created_at, resolved_at')
    .eq('hub_id', hub.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }

  // Enrich with player names
  const playerIds = new Set<string>()
  for (const m of matches ?? []) {
    if (m.creator_id) playerIds.add(m.creator_id)
    if (m.opponent_id) playerIds.add(m.opponent_id)
    if (m.winner_id) playerIds.add(m.winner_id)
  }

  let playerMap: Record<string, string> = {}
  if (playerIds.size > 0) {
    const { data: players } = await db
      .from('players')
      .select('id, username')
      .in('id', [...playerIds])

    for (const p of players ?? []) {
      playerMap[p.id] = p.username
    }
  }

  const enriched = (matches ?? []).map(m => ({
    ...m,
    creator_name: playerMap[m.creator_id] ?? 'Unknown',
    opponent_name: m.opponent_id ? (playerMap[m.opponent_id] ?? 'Unknown') : null,
    winner_name: m.winner_id ? (playerMap[m.winner_id] ?? 'Unknown') : null,
  }))

  return NextResponse.json({ matches: enriched, page })
}
