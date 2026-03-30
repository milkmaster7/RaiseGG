import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import {
  createTripleThreat,
  getTripleThreatStatus,
  getActiveTripleThreats,
} from '@/lib/triple-threat'

/** POST — Create a new Triple Threat series */
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { opponent_id, stake_amount } = body

    if (!opponent_id || !stake_amount) {
      return NextResponse.json(
        { error: 'opponent_id and stake_amount are required' },
        { status: 400 }
      )
    }

    const result = await createTripleThreat(playerId, opponent_id, Number(stake_amount))

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ series: result.series }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

/** GET — List active series or get specific one by ?id=xxx */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const seriesId = searchParams.get('id')

  if (seriesId) {
    const result = await getTripleThreatStatus(seriesId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    return NextResponse.json({ series: result.series })
  }

  const active = await getActiveTripleThreats()
  return NextResponse.json({ series: active })
}
