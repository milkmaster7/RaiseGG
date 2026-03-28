/**
 * PATCH /api/disputes/[id]
 * Admin only — resolve or cancel a dispute.
 *
 * Body: { resolution: string, winnerId?: string, action: 'resolve' | 'cancel' }
 * If action=resolve and winnerId is provided, overrides the match winner and credits payout.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  if (!(await isAdmin(playerId, supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { resolution, winnerId, action } = await req.json() as {
    resolution: string
    winnerId?: string
    action: 'resolve' | 'cancel'
  }

  if (!resolution || !action) {
    return NextResponse.json({ error: 'resolution and action are required' }, { status: 400 })
  }

  const { data: dispute } = await supabase
    .from('disputes')
    .select('*, match:matches(id, player_a_id, player_b_id, stake_amount, status, winner_id)')
    .eq('id', id)
    .single()

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
  if (dispute.status !== 'open') return NextResponse.json({ error: 'Dispute is already resolved' }, { status: 400 })

  const match = dispute.match as any

  if (action === 'resolve' && winnerId) {
    if (winnerId !== match.player_a_id && winnerId !== match.player_b_id) {
      return NextResponse.json({ error: 'winnerId must be one of the two players' }, { status: 400 })
    }

    const loserId = winnerId === match.player_a_id ? match.player_b_id : match.player_a_id
    const payout  = match.stake_amount * 2 * 0.9

    // Override match winner and mark completed
    await supabase.from('matches').update({
      winner_id:   winnerId,
      status:      'completed',
      resolved_at: new Date().toISOString(),
    }).eq('id', match.id)

    // Credit winner payout atomically via RPC
    await supabase.rpc('credit_deposit', {
      p_player_id:    winnerId,
      p_amount:       payout,
      p_tx_signature: `dispute-override-${id}`,
    })

    // Log override transactions
    await supabase.from('transactions').insert([
      { player_id: winnerId, type: 'win',  amount: payout,             match_id: match.id, note: 'Admin dispute resolution' },
      { player_id: loserId,  type: 'loss', amount: match.stake_amount, match_id: match.id, note: 'Admin dispute resolution' },
    ])
  } else if (action === 'resolve') {
    // Resolve without changing winner — mark completed (dismiss after result stands)
    await supabase.from('matches')
      .update({ status: 'completed' })
      .eq('id', match.id)
  } else if (action === 'cancel') {
    // Dismiss dispute — restore match to its pre-dispute status:
    // If it already had a winner (was completed before dispute), keep completed.
    // Otherwise revert to locked so it can still be resolved normally.
    const restoreStatus = match.winner_id ? 'completed' : 'locked'
    await supabase.from('matches')
      .update({ status: restoreStatus })
      .eq('id', match.id)
  }

  // Mark dispute resolved
  const { error } = await supabase.from('disputes').update({
    status:      action === 'cancel' ? 'cancelled' : 'resolved',
    resolution,
    resolved_by: playerId,
    resolved_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) {
    console.error('Dispute resolve error:', error)
    return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
