import { NextRequest, NextResponse } from 'next/server'
import { joinMatch } from '@/lib/matches'
import { readSession } from '@/lib/session'

// POST /api/matches/join — player B joins and stakes
export async function POST(req: NextRequest) {
  const sessionPlayerId = await readSession(req)
  if (!sessionPlayerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId, playerBId, joinTx } = await req.json()

  if (!matchId || !playerBId || !joinTx) {
    return NextResponse.json({ error: 'matchId, playerBId, and joinTx are required' }, { status: 400 })
  }

  if (sessionPlayerId !== playerBId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { match, error } = await joinMatch(matchId, playerBId, joinTx)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!match) return NextResponse.json({ error: 'Match not available' }, { status: 404 })

  return NextResponse.json(match)
}
