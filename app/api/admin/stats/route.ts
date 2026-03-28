import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  const supabase = createServiceClient()
  if (!playerId || !(await isAdmin(playerId, supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    { count: totalPlayers },
    { count: activeMatches },
    { count: openDisputes },
    { count: totalMatches },
    { data: rakeAgg },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }).in('status', ['open', 'locked', 'live']),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.rpc('sum_rake'),
  ])

  const totalRake = Number(rakeAgg ?? 0)

  return NextResponse.json({
    totalPlayers:   totalPlayers  ?? 0,
    activeMatches:  activeMatches ?? 0,
    openDisputes:   openDisputes  ?? 0,
    completedMatches: totalMatches ?? 0,
    totalRake,
  })
}
