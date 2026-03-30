import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { PublicKey } from '@solana/web3.js'

// POST /api/wallet/connect — save player's Solana wallet address
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { walletAddress } = await req.json()
  if (!walletAddress) return NextResponse.json({ error: 'walletAddress required' }, { status: 400 })

  // Validate it's a real Solana pubkey
  try { new PublicKey(walletAddress) } catch (_) {
    return NextResponse.json({ error: 'Invalid Solana address' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('players')
    .update({ wallet_address: walletAddress })
    .eq('id', playerId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
