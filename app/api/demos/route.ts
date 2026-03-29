import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/demos — list player's match demos
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const game = req.nextUrl.searchParams.get('game')

  let query = db
    .from('match_demos')
    .select(`
      id, match_id, game, demo_url, file_size, duration_seconds, created_at,
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
      demoUrl: d.demo_url,
      fileSize: d.file_size,
      duration: d.duration_seconds,
      createdAt: d.created_at,
      won: d.matches?.winner_id === playerId,
      stake: d.matches?.stake_amount,
    })),
  })
}
