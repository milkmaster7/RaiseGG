import { NextRequest, NextResponse } from 'next/server'
import { cancelExpiredMatches } from '@/lib/matches'
import { getTodaysChallenges } from '@/lib/challenges'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

// GET /api/cron — called by Vercel Cron every 5 minutes
// Add to vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "*/5 * * * *" }] }
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  try {
    await cancelExpiredMatches()

    // Pre-seed today's daily challenges so they exist before users hit the dashboard
    const todaysChallenges = getTodaysChallenges()
    const supabase = createServiceClient()
    await supabase.from('daily_challenges').upsert(
      todaysChallenges.map(c => ({ ...c })),
      { onConflict: 'challenge_date,slot', ignoreDuplicates: true }
    )

    await recordCronRun('main', 'ok', { message: 'Expired matches + challenges', durationMs: Date.now() - start })
    return NextResponse.json({ ok: true, time: new Date().toISOString() })
  } catch (e) {
    await recordCronRun('main', 'error', { message: String(e), durationMs: Date.now() - start })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
