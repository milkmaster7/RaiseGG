/**
 * POST /api/matches/resolve/cs2
 *
 * MatchZy webhook — called automatically by the CS2 game server when a match ends.
 * MatchZy config: matchzy_remote_log_url "https://raisegg.gg/api/matches/resolve/cs2"
 * MatchZy config: matchzy_remote_log_header_key "x-matchzy-secret"
 * MatchZy config: matchzy_remote_log_header_value "<MATCHZY_WEBHOOK_SECRET>"
 *
 * Expected payload (MatchZy series_end event):
 * {
 *   event: "series_end",
 *   matchid: "<our UUID>",
 *   team1: { players: [{ steamid64: "...", name: "..." }] },
 *   team2: { players: [{ steamid64: "...", name: "..." }] },
 *   team1_score: 16,
 *   team2_score: 7,
 *   winner: "team1" | "team2"
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveCS2Match } from '@/lib/matches'

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get('x-matchzy-secret')
  if (!process.env.MATCHZY_WEBHOOK_SECRET || secret !== process.env.MATCHZY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only process series_end events
  if (body.event !== 'series_end') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const { matchid, team1, team2, team1_score, team2_score, winner } = body

  if (!matchid || !team1 || !team2 || !winner) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const team1SteamIds: string[] = (team1.players ?? []).map((p: any) => p.steamid64)
  const team2SteamIds: string[] = (team2.players ?? []).map((p: any) => p.steamid64)
  const winnerTeamPlayers = winner === 'team1' ? team1.players : team2.players

  if (!winnerTeamPlayers?.length) {
    return NextResponse.json({ error: 'Could not determine winner players' }, { status: 400 })
  }

  // For 1v1, there's exactly one winner player
  const winnerSteamId: string = winnerTeamPlayers[0].steamid64

  const result = await resolveCS2Match({
    externalMatchId: matchid,
    winnerSteamId,
    team1SteamIds,
    team2SteamIds,
    team1Score:  Number(team1_score ?? 0),
    team2Score:  Number(team2_score ?? 0),
  })

  if (result.error) {
    console.error('CS2 resolve error:', result.error, { matchid })
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  console.log('CS2 match resolved:', { matchid, winner: result.winnerId, payout: result.payout })
  return NextResponse.json({ ok: true, winnerId: result.winnerId, payout: result.payout })
}
