import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import {
  checkAndAwardAchievements,
  getPlayerAchievements,
  getAchievementProgress,
  ACHIEVEMENTS,
} from '@/lib/achievements'

// GET /api/achievements?player_id=<uuid>
// If no player_id, uses session player
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  let playerId = searchParams.get('player_id')

  // Fall back to session if no player_id provided
  if (!playerId) {
    playerId = await readSession(req)
  }

  if (!playerId) {
    return NextResponse.json(
      { error: 'player_id required (query param or session)' },
      { status: 400 }
    )
  }

  try {
    // Check and award any new achievements
    const newlyUnlocked = await checkAndAwardAchievements(playerId)

    // Get full unlocked list
    const unlocked = await getPlayerAchievements(playerId)

    // Get progress for all achievements
    const progress = await getAchievementProgress(playerId)

    return NextResponse.json({
      player_id: playerId,
      unlocked,
      progress,
      newlyUnlocked,
      total_achievements: ACHIEVEMENTS.length,
      unlocked_count: unlocked.length,
    })
  } catch (err) {
    console.error('[achievements] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}
