import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { USDC_MINT_SOLANA } from '@/lib/escrow'
import { getAssociatedTokenAddress } from '@solana/spl-token'

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { amount, txSignature } = body as { amount: number; txSignature: string }

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (!txSignature)           return NextResponse.json({ error: 'Missing transaction signature' }, { status: 400 })

  const supabase = createServiceClient()

  // Prevent duplicate deposits from the same tx
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('tx_signature', txSignature)
    .single()
  if (existing) return NextResponse.json({ error: 'Transaction already processed' }, { status: 409 })

  // Verify the on-chain transaction
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
      'confirmed'
    )

    const treasury = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_SOL ?? '')
    const treasuryAta = await getAssociatedTokenAddress(USDC_MINT_SOLANA, treasury)

    const tx = await connection.getParsedTransaction(txSignature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
    if (!tx) return NextResponse.json({ error: 'Transaction not found on-chain' }, { status: 400 })

    // Walk through token transfers to find one going to our treasury ATA
    const instructions = tx.transaction.message.instructions
    let verified = false

    for (const ix of instructions) {
      if ('parsed' in ix && ix.program === 'spl-token' && ix.parsed?.type === 'transfer') {
        const info = ix.parsed.info
        const destination: string = info.destination
        const transferAmount: number = Number(info.amount)
        const expectedLamports = Math.round(amount * 1_000_000)

        if (
          destination === treasuryAta.toString() &&
          transferAmount >= expectedLamports
        ) {
          verified = true
          break
        }
      }
    }

    if (!verified) {
      return NextResponse.json({ error: 'Could not verify USDC transfer to platform' }, { status: 400 })
    }
  } catch (err) {
    console.error('Deposit verification error:', err)
    return NextResponse.json({ error: 'Failed to verify transaction' }, { status: 500 })
  }

  // Credit balance and record transaction atomically
  const { error } = await supabase.rpc('credit_deposit', {
    p_player_id:    playerId,
    p_amount:       amount,
    p_tx_signature: txSignature,
  })

  if (error) {
    console.error('credit_deposit RPC error:', error)
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
  }

  return NextResponse.json({ success: true, amount })
}
