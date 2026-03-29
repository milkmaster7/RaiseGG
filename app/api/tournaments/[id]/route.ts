import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'
import {
  generateEmptyBracket,
  seedPlayers,
  getGameElo,
  getNextMatchPosition,
  calculatePrizes,
  PLATFORM_RAKE,
  type Game,
  type BracketSize,
} from '@/lib/tournaments'

type RouteParams = { params: Promise<{ id: string }> }

// ─── GET: Tournament details with bracket and registrations ─────
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  const { data: registrations } = await supabase
    .from('tournament_registrations')
    .select('*, player:players(id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo)')
    .eq('tournament_id', id)
    .order('created_at', { ascending: true })

  const { data: matches } = await supabase
    .from('tournament_matches')
    .select('id, round, position, player_a_id, player_b_id, score_a, score_b, winner_id, player_a:players!tournament_matches_player_a_id_fkey(username, avatar_url), player_b:players!tournament_matches_player_b_id_fkey(username, avatar_url)')
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('position', { ascending: true })

  return NextResponse.json({
    tournament,
    registrations: registrations ?? [],
    matches: (matches ?? []).map(m => ({
      ...m,
      player_a: Array.isArray(m.player_a) ? m.player_a[0] ?? null : m.player_a,
      player_b: Array.isArray(m.player_b) ? m.player_b[0] ?? null : m.player_b,
    })),
  })
}

// ─── POST: Actions (register, start, report, complete) ──────────
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: tournamentId } = await params
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const body = await req.json()
  const action = body.action as string

  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 })

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single()

  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  // ── Register ──────────────────────────────────────────────────
  if (action === 'register') {
    if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
      return NextResponse.json({ error: 'Registration is closed' }, { status: 400 })
    }

    const { count } = await supabase
      .from('tournament_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)

    if ((count ?? 0) >= tournament.max_players) {
      return NextResponse.json({ error: 'Tournament is full' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId)
      .single()

    if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 409 })

    // Deduct entry fee
    const entryFee = Number(tournament.entry_fee)
    if (entryFee > 0) {
      const { data: player } = await supabase
        .from('players')
        .select('usdc_balance')
        .eq('id', playerId)
        .single()

      if (!player || Number(player.usdc_balance) < entryFee) {
        return NextResponse.json({ error: 'Insufficient balance for entry fee' }, { status: 400 })
      }

      await supabase
        .from('players')
        .update({ usdc_balance: Number(player.usdc_balance) - entryFee })
        .eq('id', playerId)

      await supabase.from('transactions').insert({
        player_id: playerId,
        type: 'rake',
        amount: -entryFee,
        note: `Tournament entry: ${tournamentId}`,
      })
    }

    const { data: reg, error } = await supabase
      .from('tournament_registrations')
      .insert({ tournament_id: tournamentId, player_id: playerId, paid: true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ registration: reg }, { status: 201 })
  }

  // ── Start (admin) ─────────────────────────────────────────────
  if (action === 'start') {
    if (!(await isAdmin(playerId, supabase))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
      return NextResponse.json({ error: 'Tournament cannot be started in current state' }, { status: 400 })
    }

    // Get registrations with ELO
    const { data: regs } = await supabase
      .from('tournament_registrations')
      .select('player_id, player:players(id, cs2_elo, dota2_elo, deadlock_elo)')
      .eq('tournament_id', tournamentId)

    const players = (regs ?? []).map((r: any) => ({
      playerId: r.player_id,
      elo: r.player ? getGameElo(r.player, tournament.game as Game) : 1000,
    }))

    if (players.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 })
    }

    const bracketSize = tournament.max_players as BracketSize

    // Generate empty bracket structure
    const emptyMatches = generateEmptyBracket(bracketSize)

    // Insert all matches
    const matchInserts = emptyMatches.map(m => ({
      tournament_id: tournamentId,
      round: m.round,
      position: m.position,
      player_a_id: null,
      player_b_id: null,
      score_a: null,
      score_b: null,
      winner_id: null,
    }))

    const { data: insertedMatches, error: insertError } = await supabase
      .from('tournament_matches')
      .insert(matchInserts)
      .select('id, round, position')

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // Seed round 0 matches
    const seedings = seedPlayers(players, bracketSize)
    const round0 = (insertedMatches ?? []).filter(m => m.round === 0)

    for (const seed of seedings) {
      const match = round0.find(m => m.position === seed.position)
      if (match) {
        await supabase
          .from('tournament_matches')
          .update({ player_a_id: seed.playerA, player_b_id: seed.playerB })
          .eq('id', match.id)

        // Auto-advance byes
        if (seed.playerA && !seed.playerB) {
          await supabase
            .from('tournament_matches')
            .update({ winner_id: seed.playerA, score_a: 1, score_b: 0 })
            .eq('id', match.id)

          // Advance to next round
          await advanceWinner(supabase, insertedMatches ?? [], match, seed.playerA)
        } else if (seed.playerB && !seed.playerA) {
          await supabase
            .from('tournament_matches')
            .update({ winner_id: seed.playerB, score_a: 0, score_b: 1 })
            .eq('id', match.id)

          await advanceWinner(supabase, insertedMatches ?? [], match, seed.playerB)
        }
      }
    }

    // Update tournament status
    await supabase
      .from('tournaments')
      .update({ status: 'in_progress' })
      .eq('id', tournamentId)

    return NextResponse.json({ ok: true, message: 'Tournament started' })
  }

  // ── Report match result ───────────────────────────────────────
  if (action === 'report') {
    const { matchId, winnerId, scoreA, scoreB } = body

    if (!matchId || !winnerId) {
      return NextResponse.json({ error: 'matchId and winnerId are required' }, { status: 400 })
    }

    // Verify admin or participant
    const admin = await isAdmin(playerId, supabase)
    const { data: match } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('id', matchId)
      .eq('tournament_id', tournamentId)
      .single()

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    if (!admin && match.player_a_id !== playerId && match.player_b_id !== playerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (match.winner_id) {
      return NextResponse.json({ error: 'Match already has a result' }, { status: 400 })
    }

    if (winnerId !== match.player_a_id && winnerId !== match.player_b_id) {
      return NextResponse.json({ error: 'Winner must be one of the players' }, { status: 400 })
    }

    // Update match result
    await supabase
      .from('tournament_matches')
      .update({
        winner_id: winnerId,
        score_a: scoreA ?? (winnerId === match.player_a_id ? 1 : 0),
        score_b: scoreB ?? (winnerId === match.player_b_id ? 1 : 0),
      })
      .eq('id', matchId)

    // Get all matches to advance winner
    const { data: allMatches } = await supabase
      .from('tournament_matches')
      .select('id, round, position')
      .eq('tournament_id', tournamentId)

    await advanceWinner(supabase, allMatches ?? [], match, winnerId)

    return NextResponse.json({ ok: true, message: 'Result reported, winner advanced' })
  }

  // ── Complete tournament ───────────────────────────────────────
  if (action === 'complete') {
    if (!(await isAdmin(playerId, supabase))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (tournament.status !== 'in_progress' && tournament.status !== 'live') {
      return NextResponse.json({ error: 'Tournament is not in progress' }, { status: 400 })
    }

    const prizePool = Number(tournament.prize_pool)

    if (prizePool > 0) {
      // Get final results from bracket
      const { data: allMatches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: false })

      if (!allMatches?.length) {
        return NextResponse.json({ error: 'No matches found' }, { status: 400 })
      }

      const bracketSize = tournament.max_players as BracketSize
      const totalRounds = Math.log2(bracketSize)

      // Finals match
      const finals = allMatches.find(m => m.round === totalRounds - 1)
      // Semifinal losers for 3rd/4th
      const semis = allMatches.filter(m => m.round === totalRounds - 2)

      const placements: { place: number; playerId: string }[] = []

      if (finals?.winner_id) {
        placements.push({ place: 1, playerId: finals.winner_id })
        const runnerUp = finals.player_a_id === finals.winner_id ? finals.player_b_id : finals.player_a_id
        if (runnerUp) placements.push({ place: 2, playerId: runnerUp })
      }

      // 3rd & 4th from semi-final losers
      const semiLosers = semis
        .filter(m => m.winner_id)
        .map(m => m.player_a_id === m.winner_id ? m.player_b_id : m.player_a_id)
        .filter(Boolean) as string[]

      if (semiLosers[0]) placements.push({ place: 3, playerId: semiLosers[0] })
      if (semiLosers[1]) placements.push({ place: 4, playerId: semiLosers[1] })

      // Distribute prizes
      const prizes = calculatePrizes(prizePool)
      for (const p of placements) {
        const prize = prizes.find(pr => pr.place === p.place)
        if (!prize || prize.amount <= 0) continue

        const { data: player } = await supabase
          .from('players')
          .select('usdc_balance')
          .eq('id', p.playerId)
          .single()

        if (player) {
          await supabase
            .from('players')
            .update({ usdc_balance: Number(player.usdc_balance) + prize.amount })
            .eq('id', p.playerId)

          await supabase.from('transactions').insert({
            player_id: p.playerId,
            type: 'win',
            amount: prize.amount,
            note: `Tournament ${p.place}${['st', 'nd', 'rd', 'th'][p.place - 1]} place: ${tournament.name}`,
          })
        }
      }
    }

    await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', tournamentId)

    return NextResponse.json({ ok: true, message: 'Tournament completed, prizes distributed' })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}

// ─── Helper: advance winner to next round ───────────────────────
async function advanceWinner(
  supabase: any,
  allMatches: { id: string; round: number; position: number }[],
  currentMatch: { round: number; position: number },
  winnerId: string
) {
  const next = getNextMatchPosition(currentMatch.round, currentMatch.position)
  const nextMatch = allMatches.find(m => m.round === next.round && m.position === next.position)

  if (!nextMatch) return // finals — no next match

  const update = next.slot === 'A'
    ? { player_a_id: winnerId }
    : { player_b_id: winnerId }

  await supabase
    .from('tournament_matches')
    .update(update)
    .eq('id', nextMatch.id)
}
