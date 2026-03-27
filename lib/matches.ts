// Match business logic — called from API routes

import { createServiceClient } from './supabase'
import { verifyDota2Match } from './steam'
import { calculateElo } from './elo'
import type { Game, MatchFormat } from '@/types'

// Create a new match (player A stakes)
export async function createMatch(params: {
  playerAId: string
  game: Game
  format: MatchFormat
  stakeAmount: number
  vaultPda: string
  createTx: string
}) {
  const supabase = createServiceClient()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 min to join

  const { data, error } = await supabase
    .from('matches')
    .insert({
      player_a_id:  params.playerAId,
      game:         params.game,
      format:       params.format,
      stake_amount: params.stakeAmount,
      vault_pda:    params.vaultPda,
      create_tx:    params.createTx,
      status:       'open',
      expires_at:   expiresAt.toISOString(),
    })
    .select()
    .single()

  return { match: data, error }
}

// Player B joins match
export async function joinMatch(matchId: string, playerBId: string, joinTx: string) {
  const supabase = createServiceClient()
  const resolveDeadline = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3hr to resolve

  const { data, error } = await supabase
    .from('matches')
    .update({
      player_b_id:      playerBId,
      join_tx:          joinTx,
      status:           'locked',
      resolve_deadline: resolveDeadline.toISOString(),
    })
    .eq('id', matchId)
    .eq('status', 'open')
    .is('player_b_id', null)
    .select()
    .single()

  return { match: data, error }
}

// Resolve a Dota 2 match by match ID
export async function resolveDota2Match(matchId: string, externalMatchId: string) {
  const supabase = createServiceClient()

  const { data: match } = await supabase
    .from('matches')
    .select('*, player_a:players!player_a_id(*), player_b:players!player_b_id(*)')
    .eq('id', matchId)
    .eq('status', 'locked')
    .single()

  if (!match) return { error: 'Match not found or not in locked state' }

  // Check match ID not already used
  if (match.used_match_ids?.includes(externalMatchId)) {
    return { error: 'This match ID has already been used.' }
  }

  // Verify result via Steam API
  const result = await verifyDota2Match(
    externalMatchId,
    match.player_a.steam_id,
    match.player_b.steam_id,
    new Date(match.created_at)
  )

  if (!result.winner) return { error: result.error }

  const winnerId = result.winner === 'a' ? match.player_a_id : match.player_b_id
  const loserId  = result.winner === 'a' ? match.player_b_id : match.player_a_id

  const eloKey = `${match.game}_elo` as const
  const aWon = result.winner === 'a'
  const eloResult = calculateElo(match.player_a[eloKey], match.player_b[eloKey], aWon)

  // Update match
  await supabase.from('matches').update({
    status:             'completed',
    winner_id:          winnerId,
    match_id_external:  externalMatchId,
    used_match_ids:     [...(match.used_match_ids ?? []), externalMatchId],
    resolved_at:        new Date().toISOString(),
  }).eq('id', matchId)

  // Update ELOs
  await supabase.from('players').update({
    [`${match.game}_elo`]:   eloResult.newEloA,
    [`${match.game}_wins`]:  match.player_a[`${match.game}_wins`] + (aWon ? 1 : 0),
    [`${match.game}_losses`]: match.player_a[`${match.game}_losses`] + (aWon ? 0 : 1),
  }).eq('id', match.player_a_id)

  await supabase.from('players').update({
    [`${match.game}_elo`]:   eloResult.newEloB,
    [`${match.game}_wins`]:  match.player_b[`${match.game}_wins`] + (!aWon ? 1 : 0),
    [`${match.game}_losses`]: match.player_b[`${match.game}_losses`] + (!aWon ? 0 : 1),
  }).eq('id', match.player_b_id)

  // Log transactions
  const rake = match.stake_amount * 2 * 0.1
  const payout = match.stake_amount * 2 * 0.9

  await supabase.from('transactions').insert([
    { player_id: winnerId, type: 'win',  amount: payout, match_id: matchId },
    { player_id: loserId,  type: 'loss', amount: match.stake_amount, match_id: matchId },
  ])

  return { winnerId, payout, rake, eloResult }
}

// Resolve a CS2 match from a MatchZy webhook payload
export async function resolveCS2Match(params: {
  externalMatchId: string   // MatchZy's matchid (we set this == our match UUID)
  winnerSteamId:  string   // Steam ID of the winning player
  team1SteamIds:  string[]
  team2SteamIds:  string[]
  team1Score:     number
  team2Score:     number
}) {
  const supabase = createServiceClient()

  // Look up the match by external match ID (set when the game server was spun up)
  const { data: match } = await supabase
    .from('matches')
    .select('*, player_a:players!player_a_id(*), player_b:players!player_b_id(*)')
    .eq('match_id_external', params.externalMatchId)
    .eq('status', 'locked')
    .single()

  if (!match) return { error: 'Match not found or not in locked state' }

  const steamA = match.player_a.steam_id
  const steamB = match.player_b.steam_id

  // Ensure both players were present in the match
  const allSteamIds = [...params.team1SteamIds, ...params.team2SteamIds]
  if (!allSteamIds.includes(steamA) || !allSteamIds.includes(steamB)) {
    return { error: 'One or both players not found in the reported match' }
  }

  // Determine winner
  const winnerIsA = params.winnerSteamId === steamA
  const winnerIsB = params.winnerSteamId === steamB
  if (!winnerIsA && !winnerIsB) return { error: 'Winner steam ID does not match either player' }

  const winnerId = winnerIsA ? match.player_a_id : match.player_b_id
  const loserId  = winnerIsA ? match.player_b_id : match.player_a_id
  const aWon     = winnerIsA

  const eloKey = `${match.game}_elo` as const
  const eloResult = calculateElo(match.player_a[eloKey], match.player_b[eloKey], aWon)

  const rake    = match.stake_amount * 2 * 0.1
  const payout  = match.stake_amount * 2 * 0.9

  // Update match
  await supabase.from('matches').update({
    status:            'completed',
    winner_id:         winnerId,
    resolved_at:       new Date().toISOString(),
  }).eq('id', match.id)

  // Update ELOs and W/L
  await supabase.from('players').update({
    [eloKey]:                    eloResult.newEloA,
    [`${match.game}_wins`]:      match.player_a[`${match.game}_wins`]   + (aWon ? 1 : 0),
    [`${match.game}_losses`]:    match.player_a[`${match.game}_losses`] + (aWon ? 0 : 1),
  }).eq('id', match.player_a_id)

  await supabase.from('players').update({
    [eloKey]:                    eloResult.newEloB,
    [`${match.game}_wins`]:      match.player_b[`${match.game}_wins`]   + (!aWon ? 1 : 0),
    [`${match.game}_losses`]:    match.player_b[`${match.game}_losses`] + (!aWon ? 0 : 1),
  }).eq('id', match.player_b_id)

  // Log transactions
  await supabase.from('transactions').insert([
    { player_id: winnerId, type: 'win',  amount: payout,              match_id: match.id, note: `CS2 win — score ${params.team1Score}:${params.team2Score}` },
    { player_id: loserId,  type: 'loss', amount: match.stake_amount,  match_id: match.id },
  ])

  return { winnerId, payout, rake, eloResult }
}

// Auto-cancel expired matches (called by cron) — with refunds
export async function cancelExpiredMatches() {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Cancel unjoined open matches past expires_at — refund player A only
  const { data: expiredOpen } = await supabase
    .from('matches')
    .update({ status: 'cancelled' })
    .eq('status', 'open')
    .lt('expires_at', now)
    .select('id, player_a_id, stake_amount')

  if (expiredOpen?.length) {
    await supabase.from('transactions').insert(
      expiredOpen.map((m) => ({
        player_id: m.player_a_id,
        type:      'refund',
        amount:    m.stake_amount,
        match_id:  m.id,
        note:      'Match expired — no opponent joined',
      }))
    )
  }

  // Cancel locked matches past resolve_deadline — refund both players
  const { data: expiredLocked } = await supabase
    .from('matches')
    .update({ status: 'cancelled' })
    .eq('status', 'locked')
    .lt('resolve_deadline', now)
    .select('id, player_a_id, player_b_id, stake_amount')

  if (expiredLocked?.length) {
    const refunds = expiredLocked.flatMap((m) => [
      { player_id: m.player_a_id, type: 'refund', amount: m.stake_amount, match_id: m.id, note: 'Match unresolved — deadline passed' },
      { player_id: m.player_b_id, type: 'refund', amount: m.stake_amount, match_id: m.id, note: 'Match unresolved — deadline passed' },
    ])
    await supabase.from('transactions').insert(refunds)
  }
}
