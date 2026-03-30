import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/demos — list demos (authenticated = own demos, or public browse with filters)
export async function GET(req: NextRequest) {
  const db = createServiceClient()
  const sp = req.nextUrl.searchParams
  const game = sp.get('game')
  const map = sp.get('map')
  const player = sp.get('player') // username search
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
  const limit = 30
  const offset = (page - 1) * limit
  const browse = sp.get('browse') === 'true' // public browse mode

  if (browse) {
    // Public browse: return recent demos with match metadata
    let query = db
      .from('match_demos')
      .select(`
        id, match_id, game, demo_url, file_size, duration_seconds, map, created_at,
        matches!inner(
          id, player_a_id, player_b_id, winner_id, stake_amount, status, score_a, score_b, map,
          player_a:players!matches_player_a_id_fkey(id, username, avatar_url),
          player_b:players!matches_player_b_id_fkey(id, username, avatar_url)
        )
      `, { count: 'exact' })
      .eq('matches.status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (game) query = query.eq('game', game)
    if (map) query = query.ilike('map', `%${map}%`)

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let demos = (data ?? []).map((d: any) => ({
      id: d.id,
      matchId: d.match_id,
      game: d.game,
      map: d.map ?? d.matches?.map ?? null,
      fileSize: d.file_size,
      duration: d.duration_seconds,
      createdAt: d.created_at,
      scoreA: d.matches?.score_a,
      scoreB: d.matches?.score_b,
      stake: d.matches?.stake_amount,
      playerA: d.matches?.player_a ? { id: d.matches.player_a.id, username: d.matches.player_a.username, avatarUrl: d.matches.player_a.avatar_url } : null,
      playerB: d.matches?.player_b ? { id: d.matches.player_b.id, username: d.matches.player_b.username, avatarUrl: d.matches.player_b.avatar_url } : null,
      winnerId: d.matches?.winner_id,
    }))

    // Client-side player filter (username search)
    if (player) {
      const q = player.toLowerCase()
      demos = demos.filter((d: any) =>
        d.playerA?.username?.toLowerCase().includes(q) ||
        d.playerB?.username?.toLowerCase().includes(q)
      )
    }

    return NextResponse.json({ demos, total: count ?? 0, page, limit })
  }

  // Authenticated: own demos
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = db
    .from('match_demos')
    .select(`
      id, match_id, game, demo_url, file_size, duration_seconds, map, created_at,
      matches!inner(player_a_id, player_b_id, winner_id, stake_amount, status, resolved_at)
    `)
    .or(`matches.player_a_id.eq.${playerId},matches.player_b_id.eq.${playerId}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (game) query = query.eq('game', game)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    demos: (data ?? []).map((d: any) => ({
      id: d.id,
      matchId: d.match_id,
      game: d.game,
      map: d.map ?? null,
      demoUrl: d.demo_url,
      fileSize: d.file_size,
      duration: d.duration_seconds,
      createdAt: d.created_at,
      won: d.matches?.winner_id === playerId,
      stake: d.matches?.stake_amount,
    })),
  })
}
