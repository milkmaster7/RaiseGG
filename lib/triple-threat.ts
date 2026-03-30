/**
 * lib/triple-threat.ts — Triple Threat Cross-Game Challenge
 *
 * Two players compete across CS2, Dota 2, and Deadlock in a best-of-3.
 * Win 2 out of 3 games to take the pot. Minimum stake $5.
 */

import { createServiceClient } from '@/lib/supabase'

const GAMES = ['cs2', 'dota2', 'deadlock'] as const
const MIN_STAKE = 5

export interface TripleThreatSeries {
  id: string
  challenger_id: string
  opponent_id: string
  stake_amount: number
  games: string[]
  results: { game: string; match_id: string; winner_id: string }[]
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  winner_id: string | null
  created_at: string
  updated_at: string
}

/** Create a new Triple Threat series between two players */
export async function createTripleThreat(
  challengerId: string,
  opponentId: string,
  stakeAmount: number
): Promise<{ series?: TripleThreatSeries; error?: string }> {
  if (challengerId === opponentId) {
    return { error: 'Cannot challenge yourself' }
  }
  if (stakeAmount < MIN_STAKE) {
    return { error: `Minimum stake is $${MIN_STAKE}` }
  }

  const supabase = createServiceClient()

  // Check both players exist
  const { data: players } = await supabase
    .from('players')
    .select('id, balance')
    .in('id', [challengerId, opponentId])

  if (!players || players.length < 2) {
    return { error: 'One or both players not found' }
  }

  const challenger = players.find(p => p.id === challengerId)
  if (!challenger || challenger.balance < stakeAmount) {
    return { error: 'Insufficient balance' }
  }

  // Check no active series between these two
  const { data: existing } = await supabase
    .from('triple_threat_series')
    .select('id')
    .or(
      `and(challenger_id.eq.${challengerId},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${challengerId})`
    )
    .in('status', ['pending', 'accepted', 'in_progress'])
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: 'Active series already exists between these players' }
  }

  const { data, error } = await supabase
    .from('triple_threat_series')
    .insert({
      challenger_id: challengerId,
      opponent_id: opponentId,
      stake_amount: stakeAmount,
      games: [...GAMES],
      results: [],
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { series: data as TripleThreatSeries }
}

/** Get full status of a Triple Threat series */
export async function getTripleThreatStatus(
  seriesId: string
): Promise<{ series?: TripleThreatSeries & { score: { challenger: number; opponent: number } }; error?: string }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('triple_threat_series')
    .select('*')
    .eq('id', seriesId)
    .single()

  if (error || !data) return { error: error?.message ?? 'Series not found' }

  const series = data as TripleThreatSeries
  const results = series.results ?? []

  const challengerWins = results.filter(r => r.winner_id === series.challenger_id).length
  const opponentWins = results.filter(r => r.winner_id === series.opponent_id).length

  return {
    series: {
      ...series,
      score: { challenger: challengerWins, opponent: opponentWins },
    },
  }
}

/** Resolve one round of the series. Checks if series is decided (2/3 wins). */
export async function resolveTripleThreatRound(
  seriesId: string,
  matchId: string,
  winnerId: string
): Promise<{ series?: TripleThreatSeries; decided: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('triple_threat_series')
    .select('*')
    .eq('id', seriesId)
    .single()

  if (error || !data) return { decided: false, error: error?.message ?? 'Series not found' }

  const series = data as TripleThreatSeries

  if (series.status === 'completed' || series.status === 'cancelled') {
    return { decided: true, error: 'Series already finished' }
  }

  // Determine which game this round is for (by order: index = results.length)
  const roundIndex = series.results.length
  if (roundIndex >= series.games.length) {
    return { decided: true, error: 'All rounds already played' }
  }

  const game = series.games[roundIndex]
  const updatedResults = [
    ...series.results,
    { game, match_id: matchId, winner_id: winnerId },
  ]

  const challengerWins = updatedResults.filter(r => r.winner_id === series.challenger_id).length
  const opponentWins = updatedResults.filter(r => r.winner_id === series.opponent_id).length
  const decided = challengerWins >= 2 || opponentWins >= 2

  const updatePayload: Record<string, unknown> = {
    results: updatedResults,
    status: decided ? 'completed' : 'in_progress',
    updated_at: new Date().toISOString(),
  }

  if (decided) {
    updatePayload.winner_id = challengerWins >= 2 ? series.challenger_id : series.opponent_id
  }

  const { data: updated, error: updateErr } = await supabase
    .from('triple_threat_series')
    .update(updatePayload)
    .eq('id', seriesId)
    .select()
    .single()

  if (updateErr) return { decided: false, error: updateErr.message }

  return { series: updated as TripleThreatSeries, decided }
}

/** List all active Triple Threat series */
export async function getActiveTripleThreats(): Promise<TripleThreatSeries[]> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('triple_threat_series')
    .select('*')
    .in('status', ['pending', 'accepted', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []) as TripleThreatSeries[]
}
