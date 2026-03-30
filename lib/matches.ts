// Match business logic — called from API routes

import { createServiceClient } from './supabase'
import { verifyDota2Match } from './steam'
import { calculateElo } from './elo'
import { solanaResolveMatch, solanaCancelMatch } from './escrow'
import { Connection } from '@solana/web3.js'
import type { Game, MatchFormat, MatchType, StakeCurrency } from '@/types'
import { sendMatchResult, sendMatchCancelled } from '@/lib/email'

function getSolanaConnection() {
  return new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed')
}

const REFERRAL_PERCENT = 0.05 // 5% of winner's payout goes to their referrer

const CS2_MAPS: Record<string, string> = {
  de_dust2: 'Dust II', de_mirage: 'Mirage', de_inferno: 'Inferno',
  de_nuke: 'Nuke', de_overpass: 'Overpass', de_ancient: 'Ancient',
  de_anubis: 'Anubis', de_vertigo: 'Vertigo', de_train: 'Train',
  de_cache: 'Cache', de_cobblestone: 'Cobblestone',
}

function formatMapName(raw?: string): string | null {
  if (!raw) return null
  return CS2_MAPS[raw.toLowerCase()] ?? raw.replace(/^de_/i, '').replace(/^\w/, c => c.toUpperCase())
}

async function creditReferralBonus(supabase: any, winnerId: string, payout: number, matchId: string, currency: string) {
  try {
    // Check if the winner was referred by someone
    const { data: winner } = await supabase
      .from('players')
      .select('referred_by')
      .eq('id', winnerId)
      .single()

    if (!winner?.referred_by) return

    const bonus = Math.round(payout * REFERRAL_PERCENT * 100) / 100 // round to 2 decimals
    if (bonus <= 0) return

    // Credit the referrer's balance
    const balanceField = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'
    await supabase.rpc('increment_balance', {
      player_id: winner.referred_by,
      field: balanceField,
      amount: bonus,
    })

    // Log the referral bonus transaction
    await supabase.from('transactions').insert({
      player_id: winner.referred_by,
      type: 'referral_bonus',
      amount: bonus,
      match_id: matchId,
      note: `5% referral bonus from ${winnerId} win (${currency.toUpperCase()})`,
    })
  } catch (_) {
    // Non-critical — don't break match resolution if referral fails
  }
}

// Create a new match (player A stakes)
// Team size lookup for match types
const MATCH_TYPE_SIZES: Record<MatchType, number> = { '1v1': 1, '2v2': 2, '5v5': 5 }

export async function createMatch(params: {
  matchId: string
  playerAId: string
  game: Game
  format: MatchFormat
  matchType?: MatchType
  teamName?: string
  stakeAmount: number
  currency: StakeCurrency
  vaultPda: string
  createTx: string
  region?: string
  invitePassword?: string
  challengedPlayerId?: string
}) {
  const supabase = createServiceClient()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 min to join

  const matchType: MatchType = params.matchType ?? '1v1'
  const isTeam = matchType !== '1v1'
  const teamSize = MATCH_TYPE_SIZES[matchType]

  const { data, error } = await supabase
    .from('matches')
    .insert({
      id:              params.matchId,
      player_a_id:     params.playerAId,
      game:            params.game,
      format:          params.format,
      match_type:      matchType,
      stake_amount:    params.stakeAmount,
      currency:        params.currency,
      vault_pda:       params.vaultPda,
      create_tx:       params.createTx,
      status:          'open',
      expires_at:      expiresAt.toISOString(),
      region:                params.region ?? 'EU',
      invite_password:       params.invitePassword ?? null,
      has_password:          !!params.invitePassword,
      challenged_player_id:  params.challengedPlayerId ?? null,
      // Team match fields
      team_a_name:     isTeam ? (params.teamName || null) : null,
      team_b_name:     null,
      team_a_players:  isTeam ? [params.playerAId] : [],
      team_b_players:  [],
    })
    .select()
    .single()

  return { match: data, error }
}

// Player B joins match
export async function joinMatch(matchId: string, playerBId: string, joinTx: string) {
  const supabase = createServiceClient()
  const resolveDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2hr to resolve

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

// Player joins a team match (team_a or team_b)
export async function joinTeamMatch(matchId: string, playerId: string, team: 'a' | 'b', joinTx: string, teamName?: string) {
  const supabase = createServiceClient()

  // Fetch the match to validate
  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('status', 'open')
    .single()

  if (fetchErr || !match) return { match: null, error: { message: 'Match not found or not open' } }

  const matchType: MatchType = match.match_type ?? '1v1'
  const teamSize = MATCH_TYPE_SIZES[matchType]
  const teamAPlayers: string[] = match.team_a_players ?? []
  const teamBPlayers: string[] = match.team_b_players ?? []

  // Prevent duplicate join
  if (teamAPlayers.includes(playerId) || teamBPlayers.includes(playerId)) {
    return { match: null, error: { message: 'You have already joined this match' } }
  }

  // Validate team capacity
  if (team === 'a' && teamAPlayers.length >= teamSize) {
    return { match: null, error: { message: 'Team A is already full' } }
  }
  if (team === 'b' && teamBPlayers.length >= teamSize) {
    return { match: null, error: { message: 'Team B is already full' } }
  }

  // Build update
  const update: Record<string, any> = {}
  if (team === 'a') {
    update.team_a_players = [...teamAPlayers, playerId]
  } else {
    update.team_b_players = [...teamBPlayers, playerId]
    if (teamName) update.team_b_name = teamName
  }

  const newTeamA = update.team_a_players ?? teamAPlayers
  const newTeamB = update.team_b_players ?? teamBPlayers

  // If both teams are full, lock the match
  if (newTeamA.length >= teamSize && newTeamB.length >= teamSize) {
    const resolveDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000)
    update.status = 'locked'
    update.resolve_deadline = resolveDeadline.toISOString()
    // Set player_b_id to the first player on team B for compatibility
    update.player_b_id = newTeamB[0]
    update.join_tx = joinTx
  }

  const { data, error } = await supabase
    .from('matches')
    .update(update)
    .eq('id', matchId)
    .eq('status', 'open')
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
  const winnerHero = result.winner === 'a' ? result.heroA : result.heroB
  const loserHero  = result.winner === 'a' ? result.heroB : result.heroA

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

  // Update match — store hero names for PnL cards
  await supabase.from('matches').update({
    status:             'completed',
    winner_id:          winnerId,
    match_id_external:  externalMatchId,
    used_match_ids:     [...(match.used_match_ids ?? []), externalMatchId],
    resolved_at:        new Date().toISOString(),
    game_detail:        winnerHero ?? null,
    game_detail_loser:  loserHero ?? null,
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

  // Streak play bonus — consecutive days playing gives bonus on wins
  let streakBonus = 0
  const { data: winnerStreakData } = await supabase
    .from('players')
    .select('login_streak')
    .eq('id', winnerId)
    .single()
  const playStreak = winnerStreakData?.login_streak ?? 0
  if (playStreak >= 30) streakBonus = 0.25  // 25% bonus
  else if (playStreak >= 14) streakBonus = 0.15  // 15% bonus
  else if (playStreak >= 7) streakBonus = 0.10   // 10% bonus
  else if (playStreak >= 3) streakBonus = 0.05   // 5% bonus
  const bonusAmount = Math.round(payout * streakBonus * 100) / 100

  await supabase.from('transactions').insert([
    { player_id: winnerId, type: 'win',  amount: payout,             match_id: matchId, note: currency.toUpperCase() },
    { player_id: loserId,  type: 'loss', amount: match.stake_amount, match_id: matchId, note: currency.toUpperCase() },
  ])

  // Credit streak bonus
  if (bonusAmount > 0) {
    const streakBalanceField = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'
    await supabase.rpc('increment_balance', {
      player_id: winnerId,
      field: streakBalanceField,
      amount: bonusAmount,
    })
    await supabase.from('transactions').insert({
      player_id: winnerId,
      type: 'streak_bonus',
      amount: bonusAmount,
      match_id: matchId,
      note: `${Math.round(streakBonus * 100)}% streak bonus (${playStreak}-day streak)`,
    })
  }

  // Referral bonus: referrer gets 5% of winner's payout
  await creditReferralBonus(supabase, winnerId, payout, matchId, currency)

  // Email notifications (non-blocking)
  const winner = winnerId === match.player_a_id ? match.player_a : match.player_b
  const loser  = winnerId === match.player_a_id ? match.player_b : match.player_a
  if (winner.email) sendMatchResult(winner.email, winner.username, true, payout, match.game, loser.username).catch(() => {})
  if (loser.email)  sendMatchResult(loser.email, loser.username, false, 0, match.game, winner.username).catch(() => {})

  // Push notifications (non-blocking)
  try {
    const { sendMatchNotification } = await import('@/app/api/notifications/send/route')
    sendMatchNotification('match_result', winnerId, { won: true, payout, game: match.game }).catch(() => {})
    sendMatchNotification('match_result', loserId, { won: false, payout: 0, game: match.game }).catch(() => {})
  } catch {}

  return { winnerId, payout, rake, eloResult, currency, winnerHero, loserHero }
}

// Resolve a CS2 match from a MatchZy webhook payload
export async function resolveCS2Match(params: {
  externalMatchId: string   // MatchZy's matchid (we set this == our match UUID)
  winnerSteamId:  string   // Steam ID of the winning player
  team1SteamIds:  string[]
  team2SteamIds:  string[]
  team1Score:     number
  team2Score:     number
  mapName?:       string   // e.g. "de_dust2", "de_mirage"
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
  const mapDisplay = formatMapName(params.mapName)

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

  // Update match — store map name for PnL cards
  await supabase.from('matches').update({
    status:            'completed',
    winner_id:         winnerId,
    resolved_at:       new Date().toISOString(),
    game_detail:       mapDisplay,
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

  // Streak play bonus — consecutive days playing gives bonus on wins
  let streakBonusCS2 = 0
  const { data: winnerStreakDataCS2 } = await supabase
    .from('players')
    .select('login_streak')
    .eq('id', winnerId)
    .single()
  const playStreakCS2 = winnerStreakDataCS2?.login_streak ?? 0
  if (playStreakCS2 >= 30) streakBonusCS2 = 0.25  // 25% bonus
  else if (playStreakCS2 >= 14) streakBonusCS2 = 0.15  // 15% bonus
  else if (playStreakCS2 >= 7) streakBonusCS2 = 0.10   // 10% bonus
  else if (playStreakCS2 >= 3) streakBonusCS2 = 0.05   // 5% bonus
  const bonusAmountCS2 = Math.round(payout * streakBonusCS2 * 100) / 100

  // Log transactions
  await supabase.from('transactions').insert([
    { player_id: winnerId, type: 'win',  amount: payout,              match_id: match.id, note: `CS2 win — score ${params.team1Score}:${params.team2Score} (${currency.toUpperCase()})` },
    { player_id: loserId,  type: 'loss', amount: match.stake_amount,  match_id: match.id, note: currency.toUpperCase() },
  ])

  // Credit streak bonus
  if (bonusAmountCS2 > 0) {
    const streakBalanceFieldCS2 = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'
    await supabase.rpc('increment_balance', {
      player_id: winnerId,
      field: streakBalanceFieldCS2,
      amount: bonusAmountCS2,
    })
    await supabase.from('transactions').insert({
      player_id: winnerId,
      type: 'streak_bonus',
      amount: bonusAmountCS2,
      match_id: match.id,
      note: `${Math.round(streakBonusCS2 * 100)}% streak bonus (${playStreakCS2}-day streak)`,
    })
  }

  // Referral bonus: referrer gets 5% of winner's payout
  await creditReferralBonus(supabase, winnerId, payout, match.id, currency)

  // Notify both players via email (non-blocking)
  const winner = winnerId === match.player_a_id ? match.player_a : match.player_b
  const loser  = winnerId === match.player_a_id ? match.player_b : match.player_a
  if (winner.email) sendMatchResult(winner.email, winner.username, true, payout, match.game, loser.username).catch(() => {})
  if (loser.email)  sendMatchResult(loser.email, loser.username, false, 0, match.game, winner.username).catch(() => {})

  // Push notifications (non-blocking)
  try {
    const { sendMatchNotification } = await import('@/app/api/notifications/send/route')
    sendMatchNotification('match_result', winnerId, { won: true, payout, game: match.game }).catch(() => {})
    sendMatchNotification('match_result', loserId, { won: false, payout: 0, game: match.game }).catch(() => {})
  } catch {}

  return { winnerId, payout, rake, eloResult, currency, mapName: mapDisplay }
}

// Auto-cancel expired matches (called by cron) — with refunds + on-chain cancellation
export async function cancelExpiredMatches() {
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const conn = getSolanaConnection()

  // Cancel unjoined open matches past expires_at — refund player A only
  const { data: expiredOpen } = await supabase
    .from('matches')
    .select('id, player_a_id, stake_amount, vault_pda, player_a:players!player_a_id(wallet_address,email,username)')
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
    const pA = m.player_a as any
    if (pA?.email) sendMatchCancelled(pA.email, pA.username, m.stake_amount, 'No opponent joined before the match expired.').catch(() => {})
  }

  // Cancel locked matches past resolve_deadline — auto-draw, refund both players
  const { data: expiredLocked } = await supabase
    .from('matches')
    .select('id, player_a_id, player_b_id, stake_amount, vault_pda, currency, match_type, team_a_players, team_b_players, player_a:players!player_a_id(wallet_address,email,username), player_b:players!player_b_id(wallet_address,email,username)')
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

    // Refund all participants — for team matches, refund every player in both teams
    const isTeam = m.match_type && m.match_type !== '1v1'
    if (isTeam) {
      const allPlayers = [...(m.team_a_players ?? []), ...(m.team_b_players ?? [])]
      if (allPlayers.length > 0) {
        await supabase.from('transactions').insert(
          allPlayers.map(pid => ({
            player_id: pid,
            type: 'refund',
            amount: m.stake_amount,
            match_id: m.id,
            note: 'Team match unresolved — auto-draw, deadline passed',
          }))
        )
      }
    } else {
      await supabase.from('transactions').insert([
        { player_id: m.player_a_id, type: 'refund', amount: m.stake_amount, match_id: m.id, note: 'Match unresolved — auto-draw, deadline passed' },
        { player_id: m.player_b_id, type: 'refund', amount: m.stake_amount, match_id: m.id, note: 'Match unresolved — auto-draw, deadline passed' },
      ])
    }

    const pAL = m.player_a as any
    const pBL = m.player_b as any
    if (pAL?.email) sendMatchCancelled(pAL.email, pAL.username, m.stake_amount, 'Match was not resolved before the 2-hour deadline — auto-draw applied.').catch(() => {})
    if (pBL?.email) sendMatchCancelled(pBL.email, pBL.username, m.stake_amount, 'Match was not resolved before the 2-hour deadline — auto-draw applied.').catch(() => {})
  }

  // Cancel open team matches that have expired — refund all joined players
  const { data: expiredTeamOpen } = await supabase
    .from('matches')
    .select('id, player_a_id, stake_amount, vault_pda, currency, match_type, team_a_players, team_b_players, player_a:players!player_a_id(wallet_address,email,username)')
    .eq('status', 'open')
    .neq('match_type', '1v1')
    .lt('expires_at', now)

  for (const m of expiredTeamOpen ?? []) {
    const allPlayers = [...(m.team_a_players ?? []), ...(m.team_b_players ?? [])]
    // On-chain cancel — refund creator
    if (m.vault_pda && (m.player_a as any)?.wallet_address) {
      try {
        await solanaCancelMatch(conn, m.id, (m.player_a as any).wallet_address, null, 'open', (m as any).currency ?? 'usdc')
      } catch (e) {
        console.error('solanaCancelMatch (team open) failed for', m.id, e)
        continue
      }
    }
    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', m.id)
    // Refund all players who joined
    if (allPlayers.length > 0) {
      await supabase.from('transactions').insert(
        allPlayers.map(pid => ({
          player_id: pid,
          type: 'refund',
          amount: m.stake_amount,
          match_id: m.id,
          note: 'Team match expired — not enough players joined',
        }))
      )
    }
    const pA = m.player_a as any
    if (pA?.email) sendMatchCancelled(pA.email, pA.username, m.stake_amount, 'Team match expired — not enough players joined.').catch(() => {})
  }
}
