import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createCoachBet, getCoachStats } from '@/lib/coach-bet'
import { createServiceClient } from '@/lib/supabase'

/** POST — Create a coach bet on a student's match */
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { student_id, match_id, amount } = body

    if (!student_id || !match_id || !amount) {
      return NextResponse.json(
        { error: 'student_id, match_id, and amount are required' },
        { status: 400 }
      )
    }

    const result = await createCoachBet(playerId, student_id, match_id, Number(amount))

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ bet: result.bet }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

/** GET — Get coach stats (?coach_id=xxx) or list bets (?bets=true&coach_id=xxx) */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const coachId = searchParams.get('coach_id')
  const listBets = searchParams.get('bets') === 'true'

  if (!coachId) {
    // If no coach_id, try to use the session user
    const playerId = await readSession(req)
    if (!playerId) {
      return NextResponse.json({ error: 'coach_id param or auth required' }, { status: 400 })
    }

    if (listBets) {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('coach_bets')
        .select('*')
        .eq('coach_id', playerId)
        .order('created_at', { ascending: false })
        .limit(50)

      return NextResponse.json({ bets: data ?? [] })
    }

    const stats = await getCoachStats(playerId)
    return NextResponse.json({ stats })
  }

  if (listBets) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('coach_bets')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ bets: data ?? [] })
  }

  const stats = await getCoachStats(coachId)
  return NextResponse.json({ stats })
}
