import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

const VALID_REASONS = ['suspicious_play', 'possible_aimbot', 'wallhack_suspect', 'other'] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: demoId } = await params

  let body: { round?: number; reason?: string; details?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { round, reason, details } = body

  if (!round || typeof round !== 'number' || round < 1 || round > 30) {
    return NextResponse.json({ error: 'Invalid round number (1-30)' }, { status: 400 })
  }

  if (!reason || !VALID_REASONS.includes(reason as any)) {
    return NextResponse.json(
      { error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 }
    )
  }

  if (details && typeof details === 'string' && details.length > 1000) {
    return NextResponse.json({ error: 'Details must be under 1000 characters' }, { status: 400 })
  }

  const db = createServiceClient()

  // Verify the demo exists
  const { data: demo } = await db
    .from('match_demos')
    .select('id')
    .eq('id', demoId)
    .single()

  if (!demo) {
    return NextResponse.json({ error: 'Demo not found' }, { status: 404 })
  }

  const { data: report, error } = await db
    .from('demo_reports')
    .insert({
      demo_id: demoId,
      player_id: playerId,
      round,
      reason,
      details: details?.trim() || null,
    })
    .select('id, round, reason, status, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already reported this round' },
        { status: 409 }
      )
    }
    console.error('[demo-report] insert error:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }

  return NextResponse.json({ report }, { status: 201 })
}
