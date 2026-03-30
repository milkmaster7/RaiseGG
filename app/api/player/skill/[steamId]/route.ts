import { NextRequest, NextResponse } from 'next/server'
import { lookupPlayerSkill } from '@/lib/match-verify'

// GET /api/player/skill/[steamId] — look up player skill profile by Steam64 ID
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ steamId: string }> }
) {
  const { steamId } = await params

  if (!steamId || !/^\d{17}$/.test(steamId)) {
    return NextResponse.json(
      { error: 'Invalid Steam ID — must be a 17-digit Steam64 ID' },
      { status: 400 }
    )
  }

  try {
    const profile = await lookupPlayerSkill(steamId)

    if (!profile) {
      return NextResponse.json(
        { error: 'Player profile not found for this Steam ID' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      steam_id: steamId,
      source: profile.source,
      skill_level: profile.skill_level,
      elo: profile.elo,
      profile_url: profile.profile_url,
      nickname: profile.nickname,
      hours_played: profile.hours_played,
    })
  } catch (_) {
    return NextResponse.json(
      { error: 'Failed to fetch player data' },
      { status: 502 }
    )
  }
}
