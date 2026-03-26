import { NextRequest, NextResponse } from 'next/server'
import { cancelExpiredMatches } from '@/lib/matches'

// GET /api/cron — called by Vercel Cron every 5 minutes
// Add to vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "*/5 * * * *" }] }
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await cancelExpiredMatches()
  return NextResponse.json({ ok: true, time: new Date().toISOString() })
}
