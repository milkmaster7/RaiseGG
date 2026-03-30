import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET — Fetch pending disputes assigned to reviewer
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Verify player is a reviewer
  const { data: player } = await db
    .from('players')
    .select('id, is_reviewer')
    .eq('id', playerId)
    .single()

  if (!player?.is_reviewer) {
    return NextResponse.json({ error: 'Not authorized as reviewer' }, { status: 403 })
  }

  // Fetch pending matches with disputes that haven't been reviewed by this reviewer
  const { data: pendingMatches } = await db
    .from('matches')
    .select(`
      id, game, format, stake_amount, currency, status, dispute_reason, created_at,
      player_a:players!player_a_id(id, username, avatar_url),
      player_b:players!player_b_id(id, username, avatar_url)
    `)
    .eq('status', 'disputed')
    .order('created_at', { ascending: true })
    .limit(50)

  // Filter out matches already reviewed by this reviewer
  const matchIds = (pendingMatches ?? []).map((m: any) => m.id)

  const { data: existingReviews } = await db
    .from('match_reviews')
    .select('match_id')
    .eq('reviewer_id', playerId)
    .in('match_id', matchIds.length > 0 ? matchIds : ['00000000-0000-0000-0000-000000000000'])

  const reviewedIds = new Set((existingReviews ?? []).map((r: any) => r.match_id))
  const pending = (pendingMatches ?? []).filter((m: any) => !reviewedIds.has(m.id))

  // Fetch this reviewer's past reviews
  const { data: pastReviews } = await db
    .from('match_reviews')
    .select(`
      id, verdict, notes, created_at,
      match:matches!match_id(id, game, stake_amount, currency, status)
    `)
    .eq('reviewer_id', playerId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    pending,
    history: pastReviews ?? [],
  })
}

// POST — Submit review verdict
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Verify player is a reviewer
  const { data: player } = await db
    .from('players')
    .select('id, is_reviewer')
    .eq('id', playerId)
    .single()

  if (!player?.is_reviewer) {
    return NextResponse.json({ error: 'Not authorized as reviewer' }, { status: 403 })
  }

  const { matchId, verdict, notes } = await req.json()

  if (!matchId || !verdict) {
    return NextResponse.json({ error: 'Missing matchId or verdict' }, { status: 400 })
  }

  if (!['valid', 'invalid', 'inconclusive'].includes(verdict)) {
    return NextResponse.json({ error: 'Invalid verdict. Must be valid, invalid, or inconclusive' }, { status: 400 })
  }

  // Check match exists and is disputed
  const { data: match } = await db
    .from('matches')
    .select('id, status')
    .eq('id', matchId)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match.status !== 'disputed') {
    return NextResponse.json({ error: 'Match is not in disputed status' }, { status: 400 })
  }

  // Check reviewer hasn't already reviewed this match
  const { data: existing } = await db
    .from('match_reviews')
    .select('id')
    .eq('match_id', matchId)
    .eq('reviewer_id', playerId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already reviewed this match' }, { status: 409 })
  }

  // Insert review
  const { data: review, error } = await db
    .from('match_reviews')
    .insert({
      match_id: matchId,
      reviewer_id: playerId,
      verdict,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ review })
}
