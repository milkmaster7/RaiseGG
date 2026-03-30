import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('steam_id, leetify_url, leetify_rating')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  return NextResponse.json({
    steam_id: player.steam_id ?? null,
    leetify_url: player.leetify_url ?? null,
    leetify_rating: player.leetify_rating ?? null,
  })
}

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch (_) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createServiceClient()

  // ─── LINK LEETIFY ────────────────────────────────────────────
  if (body.action === 'link_leetify') {
    const url = body.url?.trim()
    if (!url) return NextResponse.json({ error: 'Leetify URL required' }, { status: 400 })

    // Basic validation
    if (!url.includes('leetify.com')) {
      return NextResponse.json({ error: 'Invalid Leetify URL — must contain leetify.com' }, { status: 400 })
    }

    const { error: updateErr } = await db
      .from('players')
      .update({
        leetify_url: url,
      })
      .eq('id', playerId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  // ─── UNLINK LEETIFY ──────────────────────────────────────────
  if (body.action === 'unlink_leetify') {
    const { error: updateErr } = await db
      .from('players')
      .update({
        leetify_url: null,
        leetify_rating: null,
      })
      .eq('id', playerId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
