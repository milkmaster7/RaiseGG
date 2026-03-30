import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/demos/[id] — single demo details or download redirect
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const download = req.nextUrl.searchParams.get('download')
  const db = createServiceClient()

  const { data: demo, error } = await db
    .from('match_demos')
    .select(`
      id, match_id, game, demo_url, file_size, duration_seconds, map, created_at,
      matches(
        id, player_a_id, player_b_id, winner_id, stake_amount, status, resolved_at,
        score_a, score_b, map,
        player_a:players!matches_player_a_id_fkey(id, username, avatar_url, elo),
        player_b:players!matches_player_b_id_fkey(id, username, avatar_url, elo)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !demo) {
    return NextResponse.json({ error: 'Demo not found' }, { status: 404 })
  }

  // Download redirect — create signed URL from Supabase Storage
  if (download === 'true' && demo.demo_url) {
    // If demo_url is already a full URL, redirect directly
    if (demo.demo_url.startsWith('http')) {
      return NextResponse.redirect(demo.demo_url)
    }

    // Otherwise, create a signed URL from storage
    const { data: signed, error: signErr } = await db
      .storage
      .from('demos')
      .createSignedUrl(demo.demo_url, 3600) // 1 hour expiry

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
    }

    return NextResponse.redirect(signed.signedUrl)
  }

  const match = demo.matches as any

  return NextResponse.json({
    id: demo.id,
    matchId: demo.match_id,
    game: demo.game,
    map: demo.map ?? match?.map ?? null,
    demoUrl: demo.demo_url,
    fileSize: demo.file_size,
    duration: demo.duration_seconds,
    createdAt: demo.created_at,
    match: match ? {
      id: match.id,
      status: match.status,
      stakeAmount: match.stake_amount,
      scoreA: match.score_a ?? null,
      scoreB: match.score_b ?? null,
      winnerId: match.winner_id,
      resolvedAt: match.resolved_at,
      playerA: match.player_a ? {
        id: match.player_a.id,
        username: match.player_a.username,
        avatarUrl: match.player_a.avatar_url,
        elo: match.player_a.elo,
      } : null,
      playerB: match.player_b ? {
        id: match.player_b.id,
        username: match.player_b.username,
        avatarUrl: match.player_b.avatar_url,
        elo: match.player_b.elo,
      } : null,
    } : null,
  })
}
