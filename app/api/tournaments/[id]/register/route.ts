import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: tournamentId } = await params
  const supabase = createServiceClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, status, entry_fee, max_players')
    .eq('id', tournamentId)
    .single()

  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  if (tournament.status !== 'upcoming') return NextResponse.json({ error: 'Registration is closed' }, { status: 400 })

  // Check current registration count
  const { count } = await supabase
    .from('tournament_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)

  if ((count ?? 0) >= tournament.max_players) {
    return NextResponse.json({ error: 'Tournament is full' }, { status: 400 })
  }

  // Check duplicate registration
  const { data: existing } = await supabase
    .from('tournament_registrations')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId)
    .single()

  if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 409 })

  // Deduct entry fee if applicable
  if (tournament.entry_fee > 0) {
    const { data: player } = await supabase
      .from('players')
      .select('usdc_balance')
      .eq('id', playerId)
      .single()

    if (!player || Number(player.usdc_balance) < tournament.entry_fee) {
      return NextResponse.json({ error: 'Insufficient balance for entry fee' }, { status: 400 })
    }

    await supabase
      .from('players')
      .update({ usdc_balance: Number(player.usdc_balance) - tournament.entry_fee })
      .eq('id', playerId)

    await supabase.from('transactions').insert({
      player_id: playerId,
      type:      'rake',
      amount:    -tournament.entry_fee,
      note:      `Tournament entry: ${tournamentId}`,
    })
  }

  const { data: registration, error } = await supabase
    .from('tournament_registrations')
    .insert({
      tournament_id: tournamentId,
      player_id:     playerId,
      paid:          tournament.entry_fee === 0 || true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ registration }, { status: 201 })
}
