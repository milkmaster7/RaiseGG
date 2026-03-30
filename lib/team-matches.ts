import { createServiceClient } from './supabase'
import { calculateElo } from './elo'

export type TeamSize = 2 | 3 | 5
export type TeamMatchFormat = '2v2' | '3v3' | '5v5'

export interface TeamMatchParams {
  matchId: string
  captainId: string
  game: 'cs2' | 'dota2' | 'deadlock'
  format: TeamMatchFormat
  teamSize: TeamSize
  stakePerPlayer: number
  currency: 'usdc' | 'usdt'
  region?: string
  teamAPlayerIds: string[] // captain + teammates
}

// Calculate average team ELO
export function teamAverageElo(elos: number[]): number {
  return Math.round(elos.reduce((a, b) => a + b, 0) / elos.length)
}

// Create a team match — captain creates, full team must be specified
export async function createTeamMatch(params: TeamMatchParams) {
  const supabase = createServiceClient()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1hr for team matches

  const totalStake = params.stakePerPlayer * params.teamSize

  const { data, error } = await supabase
    .from('matches')
    .insert({
      id: params.matchId,
      player_a_id: params.captainId,
      game: params.game,
      format: params.format,
      stake_amount: totalStake,
      stake_per_player: params.stakePerPlayer,
      currency: params.currency,
      status: 'open',
      expires_at: expiresAt.toISOString(),
      region: params.region ?? 'EU',
      is_team_match: true,
      team_size: params.teamSize,
      team_a_ids: params.teamAPlayerIds,
      team_b_ids: [],
    })
    .select()
    .single()

  return { match: data, error }
}

// Team B joins the match
export async function joinTeamMatch(matchId: string, captainBId: string, teamBPlayerIds: string[]) {
  const supabase = createServiceClient()
  const resolveDeadline = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3hr

  // Verify team size matches
  const { data: match } = await supabase
    .from('matches')
    .select('team_size, team_a_ids, status')
    .eq('id', matchId)
    .single()

  if (!match) return { error: 'Match not found' }
  if (match.status !== 'open') return { error: 'Match no longer open' }
  if (teamBPlayerIds.length !== match.team_size) {
    return { error: `Team must have exactly ${match.team_size} players` }
  }

  // Check no overlap with team A
  const overlap = teamBPlayerIds.filter(id => (match.team_a_ids as string[]).includes(id))
  if (overlap.length > 0) return { error: 'Players cannot be on both teams' }

  const { data, error } = await supabase
    .from('matches')
    .update({
      player_b_id: captainBId,
      team_b_ids: teamBPlayerIds,
      status: 'locked',
      resolve_deadline: resolveDeadline.toISOString(),
    })
    .eq('id', matchId)
    .eq('status', 'open')
    .select()
    .single()

  return { match: data, error }
}

// Resolve team match — distribute winnings equally among winning team
export async function resolveTeamMatch(matchId: string, winningTeam: 'a' | 'b') {
  const supabase = createServiceClient()

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('status', 'locked')
    .single()

  if (!match) return { error: 'Match not found or not locked' }

  const winnerIds: string[] = winningTeam === 'a' ? match.team_a_ids : match.team_b_ids
  const loserIds: string[] = winningTeam === 'a' ? match.team_b_ids : match.team_a_ids
  const captainWinnerId = winningTeam === 'a' ? match.player_a_id : match.player_b_id

  const totalPot = match.stake_amount * 2 // both teams' stakes
  const rake = totalPot * 0.1
  const totalPayout = totalPot * 0.9
  const payoutPerPlayer = Math.round((totalPayout / winnerIds.length) * 100) / 100

  const currency = match.currency ?? 'usdc'
  const balanceField = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'

  // Update match status
  await supabase.from('matches').update({
    status: 'completed',
    winner_id: captainWinnerId,
    resolved_at: new Date().toISOString(),
  }).eq('id', matchId)

  // Credit each winner
  for (const pid of winnerIds) {
    await supabase.rpc('increment_balance', {
      player_id: pid,
      field: balanceField,
      amount: payoutPerPlayer,
    })
    await supabase.from('transactions').insert({
      player_id: pid,
      type: 'win',
      amount: payoutPerPlayer,
      match_id: matchId,
      note: `${match.format} team win (${currency.toUpperCase()})`,
    })
  }

  // Log losses
  const stakePerPlayer = match.stake_per_player ?? (match.stake_amount / loserIds.length)
  for (const pid of loserIds) {
    await supabase.from('transactions').insert({
      player_id: pid,
      type: 'loss',
      amount: stakePerPlayer,
      match_id: matchId,
      note: `${match.format} team loss (${currency.toUpperCase()})`,
    })
  }

  // Update ELOs for all players
  const eloKey = `${match.game}_elo`
  for (const pid of winnerIds) {
    const { data: p } = await supabase.from('players').select(eloKey).eq('id', pid).single()
    const elo = (p as any)?.[eloKey] ?? 1000
    await supabase.from('players').update({
      [eloKey]: elo + 20, // flat +20 for team wins
    }).eq('id', pid)
    // Increment wins
    const { error: rpcErr } = await supabase.rpc('increment_counter', { player_id: pid, field: `${match.game}_wins`, amount: 1 })
    if (rpcErr) {
      await supabase.from('players').update({ [`${match.game}_wins`]: elo }).eq('id', pid)
    }
  }
  for (const pid of loserIds) {
    const { data: p } = await supabase.from('players').select(eloKey).eq('id', pid).single()
    const elo = (p as any)?.[eloKey] ?? 1000
    await supabase.from('players').update({
      [eloKey]: Math.max(500, elo - 20),
    }).eq('id', pid)
  }

  return { winnerIds, loserIds, payoutPerPlayer, rake, totalPayout }
}
