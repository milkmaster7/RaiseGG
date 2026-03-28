import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { getTodaysChallenges } from '@/lib/challenges'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ challenges: [] })

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  // Upsert today's challenges (idempotent)
  const todaysChallenges = getTodaysChallenges()
  await supabase.from('daily_challenges').upsert(
    todaysChallenges.map(c => ({ ...c })),
    { onConflict: 'challenge_date,slot', ignoreDuplicates: true }
  )

  // Fetch with completion status
  const { data: challenges } = await supabase
    .from('daily_challenges')
    .select(`*, completions:player_challenge_completions(id)`)
    .eq('challenge_date', today)
    .order('slot')

  // Check player's today match stats for progress
  const { data: todayMatches } = await supabase
    .from('matches')
    .select('winner_id, stake_amount, game')
    .eq('status', 'completed')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .gte('resolved_at', today)

  const winsToday = (todayMatches ?? []).filter(m => m.winner_id === playerId).length
  const matchesToday = (todayMatches ?? []).length

  return NextResponse.json({
    challenges: (challenges ?? []).map(c => {
      const completed = (c.completions ?? []).some((comp: any) => comp) // simplified
      let progress = 0
      if (c.challenge_type === 'win_match') progress = Math.min(winsToday, c.target)
      if (c.challenge_type === 'play_match') progress = Math.min(matchesToday, c.target)
      return { ...c, completed: progress >= c.target, progress, completions: undefined }
    }),
    winsToday,
    matchesToday,
  })
}
