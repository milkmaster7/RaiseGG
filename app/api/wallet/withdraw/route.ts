import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
} from '@solana/spl-token'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { getMintForCurrency, type StakeCurrency } from '@/lib/escrow'
import { sendWithdrawal } from '@/lib/email'

const MIN_WITHDRAW = 1   // $1 minimum
const MAX_WITHDRAW = 10_000

export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { amount, currency = 'usdc' } = body as { amount: number; currency: StakeCurrency }

  if (!['usdc', 'usdt'].includes(currency)) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
  }

  if (!amount || amount < MIN_WITHDRAW) {
    return NextResponse.json({ error: `Minimum withdrawal is $${MIN_WITHDRAW}` }, { status: 400 })
  }
  if (amount > MAX_WITHDRAW) {
    return NextResponse.json({ error: `Maximum withdrawal is $${MAX_WITHDRAW}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  const balanceField = currency === 'usdt' ? 'usdt_balance' : 'usdc_balance'

  // Fetch player balance and wallet address
  const { data: player } = await supabase
    .from('players')
    .select(`${balanceField}, wallet_address`)
    .eq('id', playerId)
    .single()

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  if (!player.wallet_address) return NextResponse.json({ error: 'No wallet address on file. Connect your wallet first.' }, { status: 400 })

  const balance = Number((player as any)[balanceField] ?? 0)
  if (amount > balance) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Deduct balance first to prevent double-spend
  const { error: deductError } = await supabase
    .from('players')
    .update({ [balanceField]: balance - amount })
    .eq('id', playerId)
    .eq(balanceField, balance) // optimistic lock — fails if balance changed concurrently

  if (deductError) {
    return NextResponse.json({ error: 'Balance update conflict, please retry' }, { status: 409 })
  }

  // Execute on-chain transfer from treasury to player
  let txSignature: string
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
      'confirmed'
    )

    const rawKey = JSON.parse(process.env.SOLANA_AUTHORITY_PRIVATE_KEY ?? '[]') as number[]
    const authority = Keypair.fromSecretKey(Uint8Array.from(rawKey))
    const treasury  = authority.publicKey

    const mint = getMintForCurrency(currency)
    const playerWallet = new PublicKey(player.wallet_address)
    const fromAta  = await getAssociatedTokenAddress(mint, treasury)
    const toAta    = await getAssociatedTokenAddress(mint, playerWallet)
    const lamports = Math.round(amount * 1_000_000)

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: authority.publicKey })
    tx.add(createTransferInstruction(fromAta, toAta, authority.publicKey, lamports))
    tx.sign(authority)

    txSignature = await connection.sendRawTransaction(tx.serialize())
    await connection.confirmTransaction(txSignature, 'confirmed')
  } catch (err) {
    // Rollback — re-credit balance on transfer failure
    await supabase
      .from('players')
      .update({ [balanceField]: balance })
      .eq('id', playerId)

    console.error('Withdraw transfer error:', err)
    return NextResponse.json({ error: 'On-chain transfer failed. Balance restored.' }, { status: 500 })
  }

  // Record transaction
  await supabase.from('transactions').insert({
    player_id:    playerId,
    type:         'withdraw',
    amount:       -amount,
    tx_signature: txSignature,
    note:         `${currency.toUpperCase()} withdrew to ${player.wallet_address.slice(0, 8)}…`,
  })

  // Send withdrawal email notification (non-blocking)
  const { data: playerInfo } = await supabase
    .from('players')
    .select('email, username')
    .eq('id', playerId)
    .single()
  if (playerInfo?.email) {
    sendWithdrawal(playerInfo.email, playerInfo.username, amount, currency, txSignature).catch(() => {})
  }

  return NextResponse.json({ success: true, amount, txSignature })
}
