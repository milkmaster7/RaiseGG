import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { createTeamMatch, joinTeamMatch } from '@/lib/team-matches'
import { minStakeForElo, maxStakeForElo, isMatchableEloRange } from '@/lib/elo'

// POST /api/matches/team — create or join team match
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  if (action === 'create') {
    const { matchId, game, format, stakePerPlayer, currency = 'usdc', teamPlayerIds, region } = body

    if (!matchId || !game || !format || !stakePerPlayer || !teamPlayerIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validFormats = ['2v2', '3v3', '5v5']
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Format must be 2v2, 3v3, or 5v5' }, { status: 400 })
    }

    const teamSize = parseInt(format[0]) as 2 | 3 | 5
    if (teamPlayerIds.length !== teamSize) {
      return NextResponse.json({ error: `Team must have exactly ${teamSize} players (including you)` }, { status: 400 })
    }

    if (!teamPlayerIds.includes(playerId)) {
      return NextResponse.json({ error: 'You must be on your own team' }, { status: 403 })
    }

    if (game === 'deadlock') {
      return NextResponse.json({ error: 'Deadlock matches coming soon' }, { status: 400 })
    }

    // Check all team members are eligible
    const supabase = createServiceClient()
    const { data: teamPlayers } = await supabase
      .from('players')
      .select('id, eligible, banned, age_verified, cs2_elo, dota2_elo, deadlock_elo')
      .in('id', teamPlayerIds)

    if (!teamPlayers || teamPlayers.length !== teamSize) {
      return NextResponse.json({ error: 'Some team members not found' }, { status: 404 })
    }

    for (const tp of teamPlayers) {
      if (tp.banned) return NextResponse.json({ error: `Player ${tp.id} is suspended` }, { status: 403 })
      if (!tp.eligible) return NextResponse.json({ error: `Player ${tp.id} is not eligible` }, { status: 403 })
      if (!tp.age_verified) return NextResponse.json({ error: `All players must verify age (18+)` }, { status: 403 })
    }

    const { match, error } = await createTeamMatch({
      matchId,
      captainId: playerId,
      game,
      format,
      teamSize,
      stakePerPlayer,
      currency,
      region,
      teamAPlayerIds: teamPlayerIds,
    })

    if (error) return NextResponse.json({ error: (error as any).message ?? error }, { status: 500 })
    return NextResponse.json(match, { status: 201 })
  }

  if (action === 'join') {
    const { matchId, teamPlayerIds } = body

    if (!matchId || !teamPlayerIds?.length) {
      return NextResponse.json({ error: 'matchId and teamPlayerIds required' }, { status: 400 })
    }

    if (!teamPlayerIds.includes(playerId)) {
      return NextResponse.json({ error: 'You must be on your own team' }, { status: 403 })
    }

    const { match, error } = await joinTeamMatch(matchId, playerId, teamPlayerIds)
    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json(match)
  }

  return NextResponse.json({ error: 'action must be create or join' }, { status: 400 })
}

// GET /api/matches/team — list open team matches
export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get('game')
  const format = req.nextUrl.searchParams.get('format')

  const supabase = createServiceClient()
  let query = supabase
    .from('matches')
    .select('*, player_a:players!player_a_id(id,username,avatar_url,cs2_elo,dota2_elo,deadlock_elo)')
    .eq('status', 'open')
    .eq('is_team_match', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (game) query = query.eq('game', game)
  if (format) query = query.eq('format', format)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
