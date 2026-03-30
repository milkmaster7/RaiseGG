import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyMatchResult } from '@/lib/match-verify'

// POST /api/match/verify — verify a RaiseGG match using Steam/OpenDota data
export async function POST(req: NextRequest) {
  try {
    const { match_id, game, steam_match_id } = await req.json()

    if (!match_id) {
      return NextResponse.json(
        { error: 'match_id is required' },
        { status: 400 }
      )
    }

    // 1. Get the RaiseGG match from DB
    const supabase = createServiceClient()
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, game, status, player_a_id, player_b_id, winner_id')
      .eq('id', match_id)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.winner_id) {
      return NextResponse.json({ error: 'Match already resolved' }, { status: 400 })
    }

    const gameType = (game ?? match.game ?? '').toLowerCase().replace(/[\s-]/g, '')
    if (!gameType) {
      return NextResponse.json({ error: 'game is required' }, { status: 400 })
    }

    // 2. Get Steam IDs for both players
    const [{ data: playerA }, { data: playerB }] = await Promise.all([
      supabase
        .from('players')
        .select('id, steam_id')
        .eq('id', match.player_a_id)
        .single(),
      supabase
        .from('players')
        .select('id, steam_id')
        .eq('id', match.player_b_id)
        .single(),
    ])

    if (!playerA?.steam_id || !playerB?.steam_id) {
      return NextResponse.json(
        { error: 'Could not resolve Steam IDs for match players' },
        { status: 400 }
      )
    }

    // 3. Verify via Steam/OpenDota
    const externalMatchId = steam_match_id ?? match_id
    const result = await verifyMatchResult(
      String(externalMatchId),
      gameType,
      playerA.steam_id,
      playerB.steam_id
    )

    if (!result.verified) {
      return NextResponse.json(
        { error: 'Verification failed', details: result.match_data },
        { status: 400 }
      )
    }

    // 4. Determine winner (if auto-verifiable)
    let winnerId: string | null = null
    if (result.winner_steam_id) {
      if (result.winner_steam_id === playerA.steam_id) {
        winnerId = playerA.id
      } else if (result.winner_steam_id === playerB.steam_id) {
        winnerId = playerB.id
      }
    }

    // 5. Update the match in DB
    const updatePayload: Record<string, unknown> = {
      status: winnerId ? 'completed' : 'verified',
      resolved_at: winnerId ? new Date().toISOString() : undefined,
      resolution_method: result.match_data?.source ?? 'steam',
      external_match_id: String(externalMatchId),
    }

    if (winnerId) {
      updatePayload.winner_id = winnerId
    }

    const { error: updateError } = await supabase
      .from('matches')
      .update(updatePayload)
      .eq('id', match_id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update match result' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      verified: true,
      match_id,
      external_match_id: externalMatchId,
      winner_id: winnerId,
      auto_resolved: !!winnerId,
      match_data: result.match_data,
    })
  } catch (err) {
    console.error('[match/verify] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
