import { NextRequest, NextResponse } from 'next/server'
import { resolveDota2Match } from '@/lib/matches'
import { createServiceClient } from '@/lib/supabase'
import { readSession } from '@/lib/session'

// POST /api/matches/resolve — called after player submits match ID
// Handles Dota 2 (via Steam API) and Deadlock (via Steam API when available)
// CS2 is resolved automatically via MatchZy webhook — see /api/matches/resolve/cs2
export async function POST(req: NextRequest) {
  const sessionPlayerId = await readSession(req)
  if (!sessionPlayerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId, externalMatchId } = await req.json()

  if (!matchId || !externalMatchId) {
    return NextResponse.json({ error: 'matchId and externalMatchId are required' }, { status: 400 })
  }

  // Get match to determine game and verify caller is a participant
  const supabase = createServiceClient()
  const { data: match } = await supabase
    .from('matches')
    .select('game, player_a_id, player_b_id')
    .eq('id', matchId)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (sessionPlayerId !== match.player_a_id && sessionPlayerId !== match.player_b_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (match.game === 'cs2') {
    return NextResponse.json({ error: 'CS2 matches are resolved automatically via game server.' }, { status: 400 })
  }

  if (match.game === 'deadlock') {
    return NextResponse.json({ error: 'Deadlock match verification is not yet available. Check back soon.' }, { status: 503 })
  }

  // Dota 2 — Steam API verification
  const result = await resolveDota2Match(matchId, externalMatchId)
  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}
