import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

const ADMIN_PLAYER_IDS = (process.env.ADMIN_PLAYER_IDS ?? '').split(',').filter(Boolean)

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const status = req.nextUrl.searchParams.get('status') ?? undefined
  const game   = req.nextUrl.searchParams.get('game')   ?? undefined

  let query = supabase
    .from('tournaments')
    .select('*, registrations:tournament_registrations(count)')
    .order('starts_at', { ascending: true })
    .limit(50)

  if (status) query = query.eq('status', status)
  if (game)   query = query.eq('game', game)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ tournaments: data ?? [] })
}

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId || !ADMIN_PLAYER_IDS.includes(playerId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, game, format, prizePool, entryFee, maxPlayers, startsAt } = body

  if (!name || !game || !format || !maxPlayers || !startsAt) {
    return NextResponse.json({ error: 'name, game, format, maxPlayers, startsAt are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      name,
      game,
      format,
      prize_pool:  prizePool  ?? 0,
      entry_fee:   entryFee   ?? 0,
      max_players: maxPlayers,
      status:      'upcoming',
      starts_at:   startsAt,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournament: data }, { status: 201 })
}
