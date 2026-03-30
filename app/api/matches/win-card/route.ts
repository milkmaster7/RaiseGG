/**
 * GET /api/matches/win-card?match_id=xxx
 *
 * Returns a 1080x1080 PNG "Proof of Win" image card.
 * Access: match winner's session OR valid CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { readSession } from '@/lib/session'
import { generateWinCard } from '@/lib/win-card'
import type { Game } from '@/types'

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('match_id')
  if (!matchId) {
    return NextResponse.json({ error: 'match_id is required' }, { status: 400 })
  }

  // ── Auth: CRON_SECRET header OR session of the match winner ─────────
  const cronSecret = req.headers.get('x-cron-secret')
  const isCron = cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET

  const playerId = await readSession(req)

  if (!isCron && !playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Fetch match data ───────────────────────────────────────────────
  const supabase = createServiceClient()

  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      id,
      game,
      score_a,
      score_b,
      stake_amount,
      currency,
      winner_id,
      resolved_at,
      player_a_id,
      player_b_id,
      winner:players!winner_id(id, username, city)
    `)
    .eq('id', matchId)
    .single()

  if (error || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (!match.winner_id || !match.resolved_at) {
    return NextResponse.json({ error: 'Match has not been resolved yet' }, { status: 400 })
  }

  // If not cron, verify the requester is the winner
  if (!isCron && playerId !== match.winner_id) {
    return NextResponse.json({ error: 'Only the match winner can generate this card' }, { status: 403 })
  }

  // ── Build card options ─────────────────────────────────────────────
  const winner = match.winner as unknown as { id: string; username: string; city?: string }

  const score = `${match.score_a ?? 0}-${match.score_b ?? 0}`
  const payout = (match.stake_amount ?? 0) * 2 * 0.95 // 5% platform fee
  const currency = (match.currency ?? 'usdc').toUpperCase()
  const amountWon = `$${payout.toFixed(2)} ${currency}`

  const resolvedDate = new Date(match.resolved_at)
  const dateStr = resolvedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const png = generateWinCard({
    playerName: winner?.username ?? 'Unknown',
    city: winner?.city ?? 'Unknown',
    score,
    amountWon,
    game: match.game as Game,
    date: dateStr,
    matchId: match.id,
  })

  // ── Return PNG ─────────────────────────────────────────────────────
  return new NextResponse(png as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="raisegg-win-${matchId}.png"`,
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
