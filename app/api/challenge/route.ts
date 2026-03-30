/*
 * ─── SQL MIGRATION: revenge_challenges ────────────────────────────────────────
 *
 * Run this in the Supabase SQL Editor:
 * https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
 *
 * CREATE TABLE IF NOT EXISTS revenge_challenges (
 *   id            TEXT PRIMARY KEY DEFAULT substr(gen_random_uuid()::text, 1, 12),
 *   challenger_id UUID NOT NULL REFERENCES players(id),
 *   opponent_id   UUID REFERENCES players(id),
 *   stake_amount  NUMERIC NOT NULL CHECK (stake_amount >= 1),
 *   game          TEXT NOT NULL CHECK (game IN ('cs2', 'dota2', 'deadlock')),
 *   message       TEXT,
 *   status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
 *   created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   expires_at    TIMESTAMPTZ NOT NULL,
 *   accepted_by   UUID REFERENCES players(id),
 *   accepted_at   TIMESTAMPTZ
 * );
 *
 * CREATE INDEX idx_revenge_challenges_challenger ON revenge_challenges(challenger_id);
 * CREATE INDEX idx_revenge_challenges_opponent ON revenge_challenges(opponent_id);
 * CREATE INDEX idx_revenge_challenges_status ON revenge_challenges(status);
 *
 * -- Enable RLS (service role bypasses it)
 * ALTER TABLE revenge_challenges ENABLE ROW LEVEL SECURITY;
 */

import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

const VALID_GAMES = ['cs2', 'dota2', 'deadlock']
const CHALLENGE_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

// POST /api/challenge — create a revenge match challenge
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { opponent_id, stake_amount, game, message } = body

  // Validation
  if (!game || !VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: 'Invalid game. Must be cs2, dota2, or deadlock.' }, { status: 400 })
  }
  if (!stake_amount || typeof stake_amount !== 'number' || stake_amount < 1) {
    return NextResponse.json({ error: 'Minimum stake is $1' }, { status: 400 })
  }
  if (stake_amount > 1000) {
    return NextResponse.json({ error: 'Maximum stake is $1000' }, { status: 400 })
  }
  if (message && typeof message === 'string' && message.length > 200) {
    return NextResponse.json({ error: 'Message too long (max 200 chars)' }, { status: 400 })
  }
  if (opponent_id && opponent_id === playerId) {
    return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify opponent exists if provided
  if (opponent_id) {
    const { data: opponent } = await supabase
      .from('players')
      .select('id')
      .eq('id', opponent_id)
      .single()

    if (!opponent) {
      return NextResponse.json({ error: 'Opponent not found' }, { status: 404 })
    }
  }

  const challengeId = crypto.randomUUID().slice(0, 12)
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)

  const { error } = await supabase.from('revenge_challenges').insert({
    id: challengeId,
    challenger_id: playerId,
    opponent_id: opponent_id || null,
    stake_amount,
    game,
    message: message?.trim() || null,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const shareUrl = `https://raisegg.com/challenge/${challengeId}?type=revenge`

  return NextResponse.json({
    challenge_id: challengeId,
    share_url: shareUrl,
    expires_at: expiresAt.toISOString(),
  })
}

// GET /api/challenge?challenge_id=xxx — public endpoint, returns challenge details
export async function GET(req: NextRequest) {
  const challengeId = req.nextUrl.searchParams.get('challenge_id')
  if (!challengeId) {
    return NextResponse.json({ error: 'challenge_id query parameter required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('revenge_challenges')
    .select(`
      id, stake_amount, game, message, status, created_at, expires_at,
      challenger:players!challenger_id(
        username, avatar_url, country,
        cs2_elo, dota2_elo, deadlock_elo,
        cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses
      )
    `)
    .eq('id', challengeId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  // Auto-expire if past deadline
  if (data.status === 'pending' && new Date(data.expires_at) < new Date()) {
    await supabase
      .from('revenge_challenges')
      .update({ status: 'expired' })
      .eq('id', challengeId)
    data.status = 'expired'
  }

  return NextResponse.json(data)
}
