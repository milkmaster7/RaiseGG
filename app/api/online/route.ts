import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 30

export async function GET() {
  const supabase = createServiceClient()

  // Count players active in last 15 minutes
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .gte('last_seen', cutoff)

  // Boost: add a baseline so the site never looks empty
  const real = count ?? 0
  const hour = new Date().getUTCHours()
  // Simulate daily traffic curve: peak at 15-21 UTC (evening in Turkey/CIS)
  const curves: Record<number, [number, number]> = {
    0: [18, 30], 1: [15, 25], 2: [12, 22], 3: [10, 18], 4: [8, 15], 5: [8, 14],
    6: [10, 18], 7: [15, 25], 8: [20, 35], 9: [25, 40], 10: [30, 48], 11: [35, 52],
    12: [40, 58], 13: [42, 60], 14: [45, 65], 15: [50, 72], 16: [55, 78], 17: [58, 82],
    18: [60, 85], 19: [58, 80], 20: [55, 75], 21: [48, 68], 22: [38, 55], 23: [25, 40],
  }
  const [min, max] = curves[hour] ?? [25, 45]
  // Seed from minute so it doesn't jump wildly every 30s poll
  const minute = new Date().getMinutes()
  const seed = Math.sin(minute * 9301 + 49297) * 0.5 + 0.5
  const boosted = Math.floor(min + seed * (max - min)) + real

  return NextResponse.json({ online: boosted })
}
