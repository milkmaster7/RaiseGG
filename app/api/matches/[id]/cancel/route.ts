import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { solanaCancelMatch } from '@/lib/escrow'
import { Connection } from '@solana/web3.js'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: matchId } = await params
  const supabase = createServiceClient()

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, player_a_id, stake_amount, vault_pda, player_a:players!player_a_id(wallet_address)')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.player_a_id !== playerId) return NextResponse.json({ error: 'Only the match creator can cancel' }, { status: 403 })
  if (match.status !== 'open') return NextResponse.json({ error: 'Only open (unjoined) matches can be cancelled' }, { status: 400 })

  // Cancel on-chain first if vault exists
  if (match.vault_pda && (match.player_a as any)?.wallet_address) {
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
        'confirmed'
      )
      await solanaCancelMatch(connection, match.id, (match.player_a as any).wallet_address, null, 'open')
    } catch (e) {
      console.error('solanaCancelMatch failed during player cancel:', e)
      return NextResponse.json({ error: 'On-chain cancellation failed. Funds are safe in vault.' }, { status: 500 })
    }
  }

  await supabase.from('matches').update({ status: 'cancelled' }).eq('id', matchId)

  await supabase.from('transactions').insert({
    player_id: match.player_a_id,
    type:      'refund',
    amount:    match.stake_amount,
    match_id:  matchId,
    note:      'Match cancelled by creator',
  })

  return NextResponse.json({ success: true })
}
