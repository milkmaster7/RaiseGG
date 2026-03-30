import { NextResponse } from 'next/server'
import { getActiveBounties, refreshBounties, getBountyHistory } from '@/lib/bounty-board'

// GET /api/bounty — public, returns active bounties + recent claims
export async function GET() {
  try {
    const [bounties, history] = await Promise.all([
      getActiveBounties(),
      getBountyHistory(10),
    ])

    return NextResponse.json({ bounties, history })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/bounty — refresh/recalculate bounties (requires CRON_SECRET)
export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bounties = await refreshBounties()
    return NextResponse.json({ success: true, bounties })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
