import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import {
  getTodaysMissions,
  getWeeklyMissions,
  getTodayUTC,
  getWeekStartUTC,
  ensureMissionRows,
  getPlayerMissions,
  getMatchStats,
  calcMissionProgress,
  claimMission,
  DAILY_MISSIONS,
  WEEKLY_MISSIONS,
} from '@/lib/missions'

// GET — fetch current missions with live progress
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const today = getTodayUTC()
  const weekStart = getWeekStartUTC()

  // Ensure rows exist
  await ensureMissionRows(playerId)

  // Fetch player mission rows
  const rows = await getPlayerMissions(playerId)

  // Get live match stats for both periods
  const [dailyStats, weeklyStats] = await Promise.all([
    getMatchStats(playerId, today),
    getMatchStats(playerId, weekStart),
  ])

  // Also check referral count for weekly referral mission
  const { count: referralCount } = await db
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', playerId)
    .gte('created_at', weekStart)

  // Build response arrays
  const allTemplates = [...DAILY_MISSIONS, ...WEEKLY_MISSIONS]
  const dailyMissions = getTodaysMissions()
  const weeklyMissions = getWeeklyMissions()

  const mapMission = (template: typeof allTemplates[0], stats: typeof dailyStats) => {
    const row = rows.find(
      r => r.mission_id === template.id &&
        r.period_start === (template.period === 'daily' ? today : weekStart)
    )

    let progress = calcMissionProgress(template, stats)

    // Override referral progress from actual DB count
    if (template.mission_type === 'referral') {
      progress = Math.min(referralCount ?? 0, template.target)
    }

    // Game-specific play_match: count only that game's matches
    if (template.mission_type === 'play_match' && template.game) {
      progress = stats.gamesPlayed.has(template.game)
        ? Math.min(stats.matches, template.target)
        : 0
    }

    const completed = progress >= template.target

    // Update progress + completed in DB (fire-and-forget)
    if (row && (row.progress !== progress || row.completed !== completed)) {
      db.from('player_missions')
        .update({ progress, completed })
        .eq('player_id', playerId)
        .eq('mission_id', template.id)
        .eq('period_start', template.period === 'daily' ? today : weekStart)
        .then(() => {})
    }

    return {
      mission_id: template.id,
      title: template.title,
      description: template.description,
      game: template.game,
      mission_type: template.mission_type,
      target: template.target,
      rp_reward: template.rp_reward,
      period: template.period,
      icon: template.icon,
      progress,
      completed,
      claimed: row?.claimed ?? false,
    }
  }

  // Get player's current RP balance
  const { data: player } = await db
    .from('players')
    .select('raise_points')
    .eq('id', playerId)
    .single()

  return NextResponse.json({
    daily: dailyMissions.map(m => mapMission(m, dailyStats)),
    weekly: weeklyMissions.map(m => mapMission(m, weeklyStats)),
    raise_points: player?.raise_points ?? 0,
    today,
    week_start: weekStart,
  })
}

// POST — claim a completed mission
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { mission_id: string; period_start: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.mission_id || !body.period_start) {
    return NextResponse.json({ error: 'mission_id and period_start required' }, { status: 400 })
  }

  const result = await claimMission(playerId, body.mission_id, body.period_start)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Fetch updated RP balance
  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('raise_points')
    .eq('id', playerId)
    .single()

  return NextResponse.json({
    success: true,
    rp_awarded: result.rp_awarded,
    raise_points: player?.raise_points ?? 0,
  })
}
