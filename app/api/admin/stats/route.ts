import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

const ADMIN_PLAYER_IDS = (process.env.ADMIN_PLAYER_IDS ?? '').split(',').filter(Boolean)

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId || !ADMIN_PLAYER_IDS.includes(playerId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()

  const [
    { count: totalPlayers },
    { count: activeMatches },
    { count: openDisputes },
    { data: rakeRows },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }).in('status', ['open', 'locked', 'live']),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('transactions').select('amount').eq('type', 'rake'),
  ])

  const totalRake = (rakeRows ?? []).reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0)

  return NextResponse.json({
    totalPlayers:  totalPlayers ?? 0,
    activeMatches: activeMatches ?? 0,
    openDisputes:  openDisputes ?? 0,
    totalRake,
  })
}
