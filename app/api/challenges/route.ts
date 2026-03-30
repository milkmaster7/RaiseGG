import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { getTodaysChallenges, getWeeklyChallenges } from '@/lib/challenges'
import {
  getTodaysMissions,
  getWeeklyMissions,
  getTodayUTC,
  getWeekStartUTC,
  ensureMissionRows,
  getPlayerMissions,
  getMatchStats,
  calcMissionProgress,
  type MissionTemplate,
} from '@/lib/missions'

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

  // Upsert this week's challenges
  const weeklyChallenges = getWeeklyChallenges()
  await supabase.from('daily_challenges').upsert(
    weeklyChallenges.map(c => ({ ...c })),
    { onConflict: 'challenge_date,slot', ignoreDuplicates: true }
  )

  // Fetch with completion status
  const { data: challenges } = await supabase
    .from('daily_challenges')
    .select(`*, completions:player_challenge_completions(id)`)
    .eq('challenge_date', today)
    .lt('slot', 100)
    .order('slot')

  // Also fetch weekly
  const weekStart = weeklyChallenges[0]?.challenge_date
  const { data: weeklyData } = await supabase
    .from('daily_challenges')
    .select(`*, completions:player_challenge_completions(id)`)
    .eq('challenge_date', weekStart)
    .gte('slot', 100)
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

  // ─── Missions: piggyback on challenges response ────────────
  await ensureMissionRows(playerId)
  const missionRows = await getPlayerMissions(playerId)

  const dailyStats = await getMatchStats(playerId, getTodayUTC())
  const weeklyStats = await getMatchStats(playerId, getWeekStartUTC())

  const mapMission = (m: MissionTemplate) => {
    const isDailyPeriod = m.period === 'daily'
    const stats = isDailyPeriod ? dailyStats : weeklyStats
    const periodStart = isDailyPeriod ? getTodayUTC() : getWeekStartUTC()
    const row = missionRows.find(r => r.mission_id === m.id && r.period_start === periodStart)
    const progress = calcMissionProgress(m, stats)
    const completed = progress >= m.target

    // Update DB row if progress changed (fire-and-forget)
    if (row && (row.progress !== progress || row.completed !== completed)) {
      supabase
        .from('player_missions')
        .update({ progress, completed })
        .eq('player_id', playerId)
        .eq('mission_id', m.id)
        .eq('period_start', periodStart)
        .then(() => {})
    }

    return {
      mission_id: m.id,
      title: m.title,
      description: m.description,
      game: m.game,
      rp_reward: m.rp_reward,
      period: m.period,
      icon: m.icon,
      target: m.target,
      progress,
      completed,
      claimed: row?.claimed ?? false,
    }
  }

  const dailyMissions = getTodaysMissions().map(mapMission)
  const weeklyMissions = getWeeklyMissions().map(mapMission)

  // Get player's RP balance
  const { data: player } = await supabase
    .from('players')
    .select('raise_points')
    .eq('id', playerId)
    .single()

  return NextResponse.json({
    challenges: (challenges ?? []).map(c => {
      const completed = (c.completions ?? []).some((comp: any) => comp) // simplified
      let progress = 0
      if (c.challenge_type === 'win_match') progress = Math.min(winsToday, c.target)
      if (c.challenge_type === 'play_match') progress = Math.min(matchesToday, c.target)
      return { ...c, completed: progress >= c.target, progress, completions: undefined }
    }),
    weeklyChallenges: (weeklyData ?? []).map(c => {
      const completed = (c.completions ?? []).some((comp: any) => comp)
      let progress = 0
      if (c.challenge_type === 'win_match') progress = Math.min(winsToday, c.target) // TODO: use weekly stats
      if (c.challenge_type === 'play_match') progress = Math.min(matchesToday, c.target)
      return { ...c, completed: progress >= c.target, progress, completions: undefined }
    }),
    // Missions (RaisePoints) — integrated alongside challenges
    missions: {
      daily: dailyMissions,
      weekly: weeklyMissions,
      raise_points: player?.raise_points ?? 0,
    },
    winsToday,
    matchesToday,
  })
}
