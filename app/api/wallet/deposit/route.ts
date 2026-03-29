import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { getMintForCurrency, type StakeCurrency } from '@/lib/escrow'
import { getAssociatedTokenAddress } from '@solana/spl-token'

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { amount, txSignature, currency = 'usdc' } = body as { amount: number; txSignature: string; currency: StakeCurrency }

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (!txSignature)           return NextResponse.json({ error: 'Missing transaction signature' }, { status: 400 })
  if (!['usdc', 'usdt'].includes(currency)) return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })

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
    const treasurySol = process.env.NEXT_PUBLIC_TREASURY_SOL
    if (!treasurySol || treasurySol.startsWith('PLACEHOLDER')) {
      return NextResponse.json({ error: 'Solana treasury not configured' }, { status: 503 })
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
      'confirmed'
    )

    const treasury = new PublicKey(treasurySol)
    const mint = getMintForCurrency(currency)
    const treasuryAta = await getAssociatedTokenAddress(mint, treasury)

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
      return NextResponse.json({ error: `Could not verify ${currency.toUpperCase()} transfer to platform` }, { status: 400 })
    }
  } catch (err) {
    console.error('Deposit verification error:', err)
    return NextResponse.json({ error: 'Failed to verify transaction' }, { status: 500 })
  }

  // Credit balance and record transaction
  const balanceField = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'

  if (currency === 'usdc') {
    // Use atomic RPC for USDC (handles duplicate-tx guard inside SQL)
    const { error } = await supabase.rpc('credit_deposit', {
      p_player_id:    playerId,
      p_amount:       amount,
      p_tx_signature: txSignature,
    })
    if (error) {
      console.error('credit_deposit RPC error:', error)
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
    }
  } else {
    // USDT — update balance with optimistic locking to prevent race conditions
    const { data: player } = await supabase
      .from('players')
      .select('usdt_balance')
      .eq('id', playerId)
      .single()

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const currentBalance = Number(player.usdt_balance ?? 0)

    const { error: updateErr, count } = await supabase
      .from('players')
      .update({ usdt_balance: currentBalance + amount })
      .eq('id', playerId)
      .eq('usdt_balance', currentBalance) // optimistic lock — fails if balance changed concurrently

    if (updateErr || count === 0) {
      return NextResponse.json({ error: 'Balance update conflict, please retry' }, { status: 409 })
    }

    await supabase.from('transactions').insert({
      player_id:    playerId,
      type:         'deposit',
      amount,
      tx_signature: txSignature,
      note:         'USDT deposit',
    })
  }

  return NextResponse.json({ success: true, amount })
}
