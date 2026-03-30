/**
 * lib/coach-bet.ts — Coach Bet System
 *
 * Coaches/mentors stake on their students' matches.
 * If the student wins, winnings split 70% student / 30% coach.
 */

import { createServiceClient } from '@/lib/supabase'

export interface CoachBet {
  id: string
  coach_id: string
  student_id: string
  match_id: string
  amount: number
  status: 'pending' | 'won' | 'lost' | 'cancelled'
  coach_payout: number | null
  student_payout: number | null
  created_at: string
}

export interface CoachStats {
  coach_id: string
  total_bets: number
  wins: number
  losses: number
  win_rate: number
  total_staked: number
  total_profit: number
}

const STUDENT_SPLIT = 0.7
const COACH_SPLIT = 0.3

/** Coach stakes on a student's match */
export async function createCoachBet(
  coachId: string,
  studentId: string,
  matchId: string,
  amount: number
): Promise<{ bet?: CoachBet; error?: string }> {
  if (coachId === studentId) {
    return { error: 'Coach and student must be different players' }
  }
  if (amount <= 0) {
    return { error: 'Stake amount must be positive' }
  }

  const supabase = createServiceClient()

  // Check coach exists and has balance
  const { data: coach } = await supabase
    .from('players')
    .select('id, balance')
    .eq('id', coachId)
    .single()

  if (!coach) return { error: 'Coach not found' }
  if (coach.balance < amount) return { error: 'Insufficient balance' }

  // Check student exists
  const { data: student } = await supabase
    .from('players')
    .select('id')
    .eq('id', studentId)
    .single()

  if (!student) return { error: 'Student not found' }

  // Check match exists and is active
  const { data: match } = await supabase
    .from('matches')
    .select('id, status, player_a_id, player_b_id')
    .eq('id', matchId)
    .single()

  if (!match) return { error: 'Match not found' }
  if (match.status === 'completed' || match.status === 'cancelled') {
    return { error: 'Match already finished' }
  }

  // Student must be a participant in the match
  if (match.player_a_id !== studentId && match.player_b_id !== studentId) {
    return { error: 'Student is not a participant in this match' }
  }

  // No duplicate coach bets on same match
  const { data: existing } = await supabase
    .from('coach_bets')
    .select('id')
    .eq('coach_id', coachId)
    .eq('match_id', matchId)
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: 'Already placed a coach bet on this match' }
  }

  // Deduct from coach balance
  const { error: balErr } = await supabase
    .from('players')
    .update({ balance: coach.balance - amount })
    .eq('id', coachId)

  if (balErr) return { error: 'Failed to deduct balance' }

  const { data, error } = await supabase
    .from('coach_bets')
    .insert({
      coach_id: coachId,
      student_id: studentId,
      match_id: matchId,
      amount,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { bet: data as CoachBet }
}

/** Resolve all coach bets for a match. Student won => 70/30 split of winnings. */
export async function resolveCoachBet(
  matchId: string
): Promise<{ resolved: number; error?: string }> {
  const supabase = createServiceClient()

  // Get the match result
  const { data: match } = await supabase
    .from('matches')
    .select('id, winner_id, stake_amount, status')
    .eq('id', matchId)
    .single()

  if (!match) return { resolved: 0, error: 'Match not found' }
  if (match.status !== 'completed' || !match.winner_id) {
    return { resolved: 0, error: 'Match not yet resolved' }
  }

  // Get all pending coach bets for this match
  const { data: bets } = await supabase
    .from('coach_bets')
    .select('*')
    .eq('match_id', matchId)
    .eq('status', 'pending')

  if (!bets || bets.length === 0) return { resolved: 0 }

  let resolved = 0

  for (const bet of bets) {
    const studentWon = match.winner_id === bet.student_id
    const winnings = bet.amount * 2 // stake doubled on win

    if (studentWon) {
      const studentPayout = winnings * STUDENT_SPLIT
      const coachPayout = winnings * COACH_SPLIT

      // Credit student
      await supabase.rpc('exec_sql', {
        query: `UPDATE players SET balance = balance + ${studentPayout} WHERE id = '${bet.student_id}'`,
      })

      // Credit coach
      await supabase.rpc('exec_sql', {
        query: `UPDATE players SET balance = balance + ${coachPayout} WHERE id = '${bet.coach_id}'`,
      })

      await supabase
        .from('coach_bets')
        .update({
          status: 'won',
          coach_payout: coachPayout,
          student_payout: studentPayout,
        })
        .eq('id', bet.id)
    } else {
      // Student lost — coach loses stake
      await supabase
        .from('coach_bets')
        .update({
          status: 'lost',
          coach_payout: 0,
          student_payout: 0,
        })
        .eq('id', bet.id)
    }

    resolved++
  }

  return { resolved }
}

/** Get a coach's track record */
export async function getCoachStats(coachId: string): Promise<CoachStats> {
  const supabase = createServiceClient()

  const { data: bets } = await supabase
    .from('coach_bets')
    .select('*')
    .eq('coach_id', coachId)
    .in('status', ['won', 'lost'])

  const allBets = bets ?? []
  const wins = allBets.filter(b => b.status === 'won').length
  const losses = allBets.filter(b => b.status === 'lost').length
  const totalStaked = allBets.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalProfit = allBets.reduce((sum, b) => {
    if (b.status === 'won') return sum + (Number(b.coach_payout) - Number(b.amount))
    return sum - Number(b.amount)
  }, 0)

  return {
    coach_id: coachId,
    total_bets: allBets.length,
    wins,
    losses,
    win_rate: allBets.length > 0 ? wins / allBets.length : 0,
    total_staked: totalStaked,
    total_profit: totalProfit,
  }
}
