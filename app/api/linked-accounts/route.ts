import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('faceit_username, faceit_level, faceit_elo, leetify_url, leetify_rating')
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  return NextResponse.json({
    faceit_username: player.faceit_username ?? null,
    faceit_level: player.faceit_level ?? null,
    faceit_elo: player.faceit_elo ?? null,
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
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createServiceClient()

  // ─── LINK FACEIT ─────────────────────────────────────────────
  if (body.action === 'link_faceit') {
    const username = body.username?.trim()
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

    // Fetch from FACEIT Data API
    const faceitKey = process.env.FACEIT_API_KEY
    if (!faceitKey) {
      return NextResponse.json({ error: 'FACEIT integration not configured' }, { status: 503 })
    }

    try {
      const res = await fetch(
        `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(username)}`,
        { headers: { Authorization: `Bearer ${faceitKey}` } }
      )

      if (!res.ok) {
        if (res.status === 404) {
          return NextResponse.json({ error: 'FACEIT user not found' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to fetch FACEIT profile' }, { status: 502 })
      }

      const faceitData = await res.json()
      const faceitLevel = faceitData.games?.csgo?.skill_level ?? faceitData.games?.cs2?.skill_level ?? null
      const faceitElo = faceitData.games?.csgo?.faceit_elo ?? faceitData.games?.cs2?.faceit_elo ?? null

      const { error: updateErr } = await db
        .from('players')
        .update({
          faceit_username: faceitData.nickname ?? username,
          faceit_level: faceitLevel,
          faceit_elo: faceitElo,
        })
        .eq('id', playerId)

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

      return NextResponse.json({ ok: true, faceit_level: faceitLevel, faceit_elo: faceitElo })
    } catch {
      return NextResponse.json({ error: 'Failed to connect to FACEIT' }, { status: 502 })
    }
  }

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

  // ─── UNLINK FACEIT ───────────────────────────────────────────
  if (body.action === 'unlink_faceit') {
    const { error: updateErr } = await db
      .from('players')
      .update({
        faceit_username: null,
        faceit_level: null,
        faceit_elo: null,
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
