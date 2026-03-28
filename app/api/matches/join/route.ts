import { NextRequest, NextResponse } from 'next/server'
import { joinMatch } from '@/lib/matches'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// POST /api/matches/join — player B joins and stakes
export async function POST(req: NextRequest) {
  const sessionPlayerId = await readSession(req)
  if (!sessionPlayerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId, playerBId, joinTx, password } = await req.json()

  if (!matchId || !playerBId || !joinTx) {
    return NextResponse.json({ error: 'matchId, playerBId, and joinTx are required' }, { status: 400 })
  }

  if (sessionPlayerId !== playerBId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check player is eligible and not banned
  const supabase = createServiceClient()

  // Validate password if match is password-protected
  const { data: matchData } = await supabase
    .from('matches')
    .select('invite_password, has_password')
    .eq('id', matchId)
    .single()
  if (matchData?.has_password && matchData.invite_password !== password) {
    return NextResponse.json({ error: 'Incorrect match password.' }, { status: 403 })
  }

  const { data: player } = await supabase
    .from('players')
    .select('eligible, banned')
    .eq('id', playerBId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  if (player.banned) return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
  if (!player.eligible) return NextResponse.json({ error: 'Your account does not meet eligibility requirements.' }, { status: 403 })

  const { match, error } = await joinMatch(matchId, playerBId, joinTx)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!match) return NextResponse.json({ error: 'Match not available' }, { status: 404 })

  return NextResponse.json(match)
}
