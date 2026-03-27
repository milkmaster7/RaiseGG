import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const [{ data: player }, { data: transactions }] = await Promise.all([
    supabase.from('players').select('usdc_balance, wallet_address').eq('id', playerId).single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  return NextResponse.json({
    balance: Number(player.usdc_balance ?? 0),
    walletAddress: player.wallet_address,
    transactions: transactions ?? [],
  })
}
