import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServiceClient()

  // Calculate average wait time from recent matches (open -> locked transition)
  // We look at matches that were locked in the last 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [recentMatches, openMatches, onlinePlayers] = await Promise.all([
    // Recent completed transitions for avg wait calc
    supabase
      .from('matches')
      .select('created_at, updated_at, status')
      .in('status', ['locked', 'live', 'completed'])
      .gte('updated_at', twentyFourHoursAgo)
      .order('updated_at', { ascending: false })
      .limit(50),

    // Count open matches (active queues)
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),

    // Approximate online players: players with matches in last 30 min
    supabase
      .from('matches')
      .select('player_a_id, player_b_id')
      .in('status', ['open', 'locked', 'live'])
      .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()),
  ])

  // Calculate average wait seconds
  let avgWaitSeconds = 60 // default fallback
  if (recentMatches.data && recentMatches.data.length > 0) {
    const waits = recentMatches.data
      .map(m => {
        const created = new Date(m.created_at).getTime()
        const updated = new Date(m.updated_at).getTime()
        return Math.max(0, (updated - created) / 1000)
      })
      .filter(w => w > 0 && w < 7200) // filter outliers over 2h

    if (waits.length > 0) {
      avgWaitSeconds = Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
    }
  }

  // Count unique online players
  const uniquePlayers = new Set<string>()
  if (onlinePlayers.data) {
    for (const m of onlinePlayers.data) {
      if (m.player_a_id) uniquePlayers.add(m.player_a_id)
      if (m.player_b_id) uniquePlayers.add(m.player_b_id)
    }
  }

  return NextResponse.json({
    avgWaitSeconds,
    activeQueues: openMatches.count ?? 0,
    onlinePlayers: uniquePlayers.size,
  })
}
