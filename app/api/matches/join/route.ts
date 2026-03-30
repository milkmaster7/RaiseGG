import { NextRequest, NextResponse } from 'next/server'
import { joinMatch, joinTeamMatch } from '@/lib/matches'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { sendMatchJoined } from '@/lib/email'
import { isMatchableEloRange } from '@/lib/elo'

// POST /api/matches/join — player B joins and stakes
export async function POST(req: NextRequest) {
  const sessionPlayerId = await readSession(req)
  if (!sessionPlayerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId, playerBId, joinTx, password, team, teamName } = await req.json()

  if (!matchId || !playerBId || !joinTx) {
    return NextResponse.json({ error: 'matchId, playerBId, and joinTx are required' }, { status: 400 })
  }

  if (sessionPlayerId !== playerBId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check player is eligible and not banned
  const supabase = createServiceClient()

  // Validate password, challenge lock, and match type
  const { data: matchData } = await supabase
    .from('matches')
    .select('invite_password, has_password, challenged_player_id, player_a_id, match_type, team_a_players, team_b_players')
    .eq('id', matchId)
    .single()

  if (matchData?.player_a_id === playerBId) {
    return NextResponse.json({ error: 'You cannot join your own match' }, { status: 403 })
  }
  if (matchData?.has_password && matchData.invite_password !== password) {
    return NextResponse.json({ error: 'Incorrect match password.' }, { status: 403 })
  }
  if (matchData?.challenged_player_id && matchData.challenged_player_id !== playerBId) {
    return NextResponse.json({ error: 'This match is a private challenge — only the challenged player can join.' }, { status: 403 })
  }

  const { data: player } = await supabase
    .from('players')
    .select('eligible, banned')
    .eq('id', playerBId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  if (player.banned) return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
  if (!player.eligible) return NextResponse.json({ error: 'Your account does not meet eligibility requirements.' }, { status: 403 })

  // ELO range check — prevent smurfing
  const { data: matchForElo } = await supabase
    .from('matches')
    .select('game, player_a:players!player_a_id(cs2_elo, dota2_elo, deadlock_elo)')
    .eq('id', matchId)
    .single()

  if (matchForElo) {
    const { data: playerBElo } = await supabase
      .from('players')
      .select('cs2_elo, dota2_elo, deadlock_elo')
      .eq('id', playerBId)
      .single()

    if (playerBElo) {
      const gameEloKey = `${matchForElo.game}_elo` as keyof typeof playerBElo
      const playerAData = matchForElo.player_a as any
      const eloA = playerAData?.[gameEloKey] ?? 1000
      const eloB = (playerBElo[gameEloKey] as number) ?? 1000
      const eloCheck = isMatchableEloRange(eloA, eloB)
      if (!eloCheck.allowed) {
        return NextResponse.json({ error: eloCheck.reason }, { status: 403 })
      }
    }
  }

  // Handle team matches vs 1v1
  const isTeamMatch = matchData?.match_type && matchData.match_type !== '1v1'

  let match: any = null
  let error: any = null

  if (isTeamMatch) {
    // For team matches, 'team' param is required ('a' or 'b')
    const joinTeam = team === 'a' || team === 'b' ? team : 'b'
    const result = await joinTeamMatch(matchId, playerBId, joinTeam, joinTx, teamName)
    match = result.match
    error = result.error
  } else {
    const result = await joinMatch(matchId, playerBId, joinTx)
    match = result.match
    error = result.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!match) return NextResponse.json({ error: 'Match not available' }, { status: 404 })

  // Notify player A that someone joined (non-blocking)
  const { data: fullMatch } = await supabase
    .from('matches')
    .select('game, stake_amount, player_a:players!player_a_id(email,username), player_b:players!player_b_id(username)')
    .eq('id', matchId)
    .single()
  if (fullMatch) {
    const playerA = fullMatch.player_a as any
    const playerB = fullMatch.player_b as any
    if (playerA?.email) {
      sendMatchJoined(playerA.email, playerA.username, playerB?.username ?? 'Unknown', fullMatch.stake_amount, fullMatch.game).catch(() => {})
    }
  }

  return NextResponse.json(match)
}
