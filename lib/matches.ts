// Match business logic — called from API routes

import { createServiceClient } from './supabase'
import { verifyDota2Match } from './steam'
import { calculateElo } from './elo'
import { solanaResolveMatch, solanaCancelMatch } from './escrow'
import { Connection } from '@solana/web3.js'
import type { Game, MatchFormat, StakeCurrency } from '@/types'

function getSolanaConnection() {
  return new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed')
}

// Create a new match (player A stakes)
export async function createMatch(params: {
  matchId: string
  playerAId: string
  game: Game
  format: MatchFormat
  stakeAmount: number
  currency: StakeCurrency
  vaultPda: string
  createTx: string
  region?: string
  invitePassword?: string
}) {
  const supabase = createServiceClient()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 min to join

  const { data, error } = await supabase
    .from('matches')
    .insert({
      id:              params.matchId,
      player_a_id:     params.playerAId,
      game:            params.game,
      format:          params.format,
      stake_amount:    params.stakeAmount,
      currency:        params.currency,
      vault_pda:       params.vaultPda,
      create_tx:       params.createTx,
      status:          'open',
      expires_at:      expiresAt.toISOString(),
      region:          params.region ?? 'EU',
      invite_password: params.invitePassword ?? null,
      has_password:    !!params.invitePassword,
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

  const newWinnerElo = aWon ? eloResult.newEloA : eloResult.newEloB
  const newLoserElo  = aWon ? eloResult.newEloB : eloResult.newEloA
  const winnerDelta  = aWon ? (eloResult.newEloA - match.player_a[eloKey]) : (eloResult.newEloB - match.player_b[eloKey])
  const loserDelta   = aWon ? (eloResult.newEloB - match.player_b[eloKey]) : (eloResult.newEloA - match.player_a[eloKey])
  const game = match.game

  const currency: StakeCurrency = match.currency ?? 'usdc'
  const balanceField = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'

  // Release funds on-chain (Solana) before marking completed
  let resolveTx: string | undefined
  if (match.vault_pda) {
    const winnerPlayer = winnerId === match.player_a_id ? match.player_a : match.player_b
    if (winnerPlayer.wallet_address) {
      try {
        const conn = getSolanaConnection()
        const { txSignature } = await solanaResolveMatch(conn, matchId, winnerPlayer.wallet_address, currency)
        resolveTx = txSignature
      } catch (e) {
        console.error('solanaResolveMatch failed:', e)
        return { error: 'On-chain resolution failed. Funds are safe in vault.' }
      }
    }
  }

  // Update match
  await supabase.from('matches').update({
    status:             'completed',
    winner_id:          winnerId,
    match_id_external:  externalMatchId,
    used_match_ids:     [...(match.used_match_ids ?? []), externalMatchId],
    resolved_at:        new Date().toISOString(),
    ...(resolveTx ? { resolve_tx: resolveTx } : {}),
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

  // Insert ELO history (non-blocking)
  await supabase.from('elo_history').insert([
    { player_id: winnerId, game, elo: newWinnerElo, delta: winnerDelta, match_id: matchId },
    { player_id: loserId,  game, elo: newLoserElo,  delta: loserDelta,  match_id: matchId },
  ]).then(() => {})

  // Update streaks
  const { data: winnerPlayerData } = await supabase.from('players').select('current_streak, best_streak').eq('id', winnerId).single()
  const newStreak = (winnerPlayerData?.current_streak ?? 0) + 1
  await supabase.from('players').update({
    current_streak: newStreak,
    best_streak: Math.max(winnerPlayerData?.best_streak ?? 0, newStreak),
    last_played_date: new Date().toISOString().split('T')[0],
  }).eq('id', winnerId)
  await supabase.from('players').update({
    current_streak: 0,
    last_played_date: new Date().toISOString().split('T')[0],
  }).eq('id', loserId)

  // Log transactions
  const rake = match.stake_amount * 2 * 0.1
  const payout = match.stake_amount * 2 * 0.9

  await supabase.from('transactions').insert([
    { player_id: winnerId, type: 'win',  amount: payout,             match_id: matchId, note: currency.toUpperCase() },
    { player_id: loserId,  type: 'loss', amount: match.stake_amount, match_id: matchId, note: currency.toUpperCase() },
  ])

  return { winnerId, payout, rake, eloResult, currency }
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
    .in('status', ['locked', 'live'])
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

  const newWinnerEloCS2 = aWon ? eloResult.newEloA : eloResult.newEloB
  const newLoserEloCS2  = aWon ? eloResult.newEloB : eloResult.newEloA
  const winnerDeltaCS2  = aWon ? (eloResult.newEloA - match.player_a[eloKey]) : (eloResult.newEloB - match.player_b[eloKey])
  const loserDeltaCS2   = aWon ? (eloResult.newEloB - match.player_b[eloKey]) : (eloResult.newEloA - match.player_a[eloKey])
  const gameCS2 = match.game

  const currency: StakeCurrency = match.currency ?? 'usdc'
  const rake    = match.stake_amount * 2 * 0.1
  const payout  = match.stake_amount * 2 * 0.9

  // Release funds on-chain (Solana) before marking completed
  let resolveTx: string | undefined
  if (match.vault_pda) {
    const winnerPlayer = winnerId === match.player_a_id ? match.player_a : match.player_b
    if (winnerPlayer.wallet_address) {
      try {
        const conn = getSolanaConnection()
        const { txSignature } = await solanaResolveMatch(conn, match.id, winnerPlayer.wallet_address, currency)
        resolveTx = txSignature
      } catch (e) {
        console.error('solanaResolveMatch failed (CS2):', e)
        return { error: 'On-chain resolution failed. Funds are safe in vault.' }
      }
    }
  }

  // Update match
  await supabase.from('matches').update({
    status:            'completed',
    winner_id:         winnerId,
    resolved_at:       new Date().toISOString(),
    ...(resolveTx ? { resolve_tx: resolveTx } : {}),
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

  // Insert ELO history (non-blocking)
  await supabase.from('elo_history').insert([
    { player_id: winnerId, game: gameCS2, elo: newWinnerEloCS2, delta: winnerDeltaCS2, match_id: match.id },
    { player_id: loserId,  game: gameCS2, elo: newLoserEloCS2,  delta: loserDeltaCS2,  match_id: match.id },
  ]).then(() => {})

  // Update streaks
  const { data: winnerCS2Data } = await supabase.from('players').select('current_streak, best_streak').eq('id', winnerId).single()
  const newStreakCS2 = (winnerCS2Data?.current_streak ?? 0) + 1
  await supabase.from('players').update({
    current_streak: newStreakCS2,
    best_streak: Math.max(winnerCS2Data?.best_streak ?? 0, newStreakCS2),
    last_played_date: new Date().toISOString().split('T')[0],
  }).eq('id', winnerId)
  await supabase.from('players').update({
    current_streak: 0,
    last_played_date: new Date().toISOString().split('T')[0],
  }).eq('id', loserId)

  // Log transactions
  await supabase.from('transactions').insert([
    { player_id: winnerId, type: 'win',  amount: payout,              match_id: match.id, note: `CS2 win — score ${params.team1Score}:${params.team2Score} (${currency.toUpperCase()})` },
    { player_id: loserId,  type: 'loss', amount: match.stake_amount,  match_id: match.id, note: currency.toUpperCase() },
  ])

  return { winnerId, payout, rake, eloResult, currency }
}

// Auto-cancel expired matches (called by cron) — with refunds + on-chain cancellation
export async function cancelExpiredMatches() {
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const conn = getSolanaConnection()

  // Cancel unjoined open matches past expires_at — refund player A only
  const { data: expiredOpen } = await supabase
    .from('matches')
    .select('id, player_a_id, stake_amount, vault_pda, player_a:players!player_a_id(wallet_address)')
    .eq('status', 'open')
    .lt('expires_at', now)

  for (const m of expiredOpen ?? []) {
    if (m.vault_pda && (m.player_a as any)?.wallet_address) {
      try {
        await solanaCancelMatch(conn, m.id, (m.player_a as any).wallet_address, null, 'open', (m as any).currency ?? 'usdc')
      } catch (e) {
        console.error('solanaCancelMatch (open) failed for', m.id, e)
        continue // skip DB update if on-chain fails
      }
    }
    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', m.id)
    await supabase.from('transactions').insert({
      player_id: m.player_a_id, type: 'refund', amount: m.stake_amount,
      match_id: m.id, note: 'Match expired — no opponent joined',
    })
  }

  // Cancel locked matches past resolve_deadline — refund both players
  const { data: expiredLocked } = await supabase
    .from('matches')
    .select('id, player_a_id, player_b_id, stake_amount, vault_pda, player_a:players!player_a_id(wallet_address), player_b:players!player_b_id(wallet_address)')
    .eq('status', 'locked')
    .lt('resolve_deadline', now)

  for (const m of expiredLocked ?? []) {
    if (m.vault_pda && (m.player_a as any)?.wallet_address && (m.player_b as any)?.wallet_address) {
      try {
        await solanaCancelMatch(conn, m.id, (m.player_a as any).wallet_address, (m.player_b as any).wallet_address, 'locked', (m as any).currency ?? 'usdc')
      } catch (e) {
        console.error('solanaCancelMatch (locked) failed for', m.id, e)
        continue
      }
    }
    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', m.id)
    await supabase.from('transactions').insert([
      { player_id: m.player_a_id, type: 'refund', amount: m.stake_amount, match_id: m.id, note: 'Match unresolved — deadline passed' },
      { player_id: m.player_b_id, type: 'refund', amount: m.stake_amount, match_id: m.id, note: 'Match unresolved — deadline passed' },
    ])
  }
}
