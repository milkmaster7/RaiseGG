'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token'
import { breadcrumbSchema } from '@/lib/schemas'
import { USDC_MINT_SOLANA } from '@/lib/escrow'
import { ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type TxRecord = {
  id: string
  type: 'deposit' | 'withdraw' | 'win' | 'loss' | 'rake' | 'refund'
  amount: number
  created_at: string
  note: string | null
}

const TX_COLORS: Record<TxRecord['type'], string> = {
  deposit:  'text-green-400',
  win:      'text-green-400',
  refund:   'text-green-400',
  withdraw: 'text-red-400',
  loss:     'text-red-400',
  rake:     'text-muted',
}

const TX_SIGN: Record<TxRecord['type'], string> = {
  deposit: '+', win: '+', refund: '+',
  withdraw: '-', loss: '-', rake: '-',
}

export default function WalletPage() {
  const { connection }                          = useConnection()
  const { connected, publicKey, signTransaction } = useWallet()

  const [balance, setBalance]                   = useState<number | null>(null)
  const [transactions, setTransactions]         = useState<TxRecord[]>([])
  const [depositAmount, setDepositAmount]       = useState('')
  const [withdrawAmount, setWithdrawAmount]     = useState('')
  const [loading, setLoading]                   = useState(false)
  const [balanceLoading, setBalanceLoading]     = useState(false)
  const [tab, setTab]                           = useState<'deposit' | 'withdraw' | 'history'>('deposit')
  const [toast, setToast]                       = useState<{ msg: string; ok: boolean } | null>(null)

  const crumbs = breadcrumbSchema([
    { name: 'Home',      url: 'https://raisegg.gg' },
    { name: 'Dashboard', url: 'https://raisegg.gg/dashboard' },
    { name: 'Wallet',    url: 'https://raisegg.gg/dashboard/wallet' },
  ])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true)
    try {
      const res = await fetch('/api/wallet/balance')
      if (!res.ok) return
      const data = await res.json()
      setBalance(data.balance ?? 0)
      setTransactions(data.transactions ?? [])
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (connected) fetchBalance()
  }, [connected, fetchBalance])

  async function handleDeposit() {
    if (!publicKey || !signTransaction || !depositAmount) return
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) return

    setLoading(true)
    try {
      const treasury = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_SOL ?? '')
      const fromAta  = await getAssociatedTokenAddress(USDC_MINT_SOLANA, publicKey)
      const toAta    = await getAssociatedTokenAddress(USDC_MINT_SOLANA, treasury)
      const lamports = Math.round(amount * 1_000_000) // USDC 6 decimals

      const { blockhash } = await connection.getLatestBlockhash()
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey })
      tx.add(createTransferInstruction(fromAta, toAta, publicKey, lamports))

      const signed = await signTransaction(tx)
      const txSignature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(txSignature, 'confirmed')

      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, txSignature }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Deposit failed')

      showToast(`Deposited $${amount.toFixed(2)} USDC`, true)
      setDepositAmount('')
      await fetchBalance()
    } catch (err: any) {
      showToast(err.message ?? 'Deposit failed', false)
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdraw() {
    if (!depositAmount && !withdrawAmount) return
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) return
    if (balance !== null && amount > balance) {
      showToast('Insufficient balance', false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Withdraw failed')

      showToast(`Withdrawn $${amount.toFixed(2)} USDC`, true)
      setWithdrawAmount('')
      await fetchBalance()
    } catch (err: any) {
      showToast(err.message ?? 'Withdraw failed', false)
    } finally {
      setLoading(false)
    }
  }

  const displayBalance = balanceLoading
    ? '…'
    : balance !== null
      ? `$${balance.toFixed(2)}`
      : '$0.00'

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded border text-sm font-semibold shadow-lg transition-all ${
          toast.ok ? 'bg-green-900/80 border-green-500 text-green-300' : 'bg-red-900/80 border-red-500 text-red-300'
        }`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Wallet</h1>
        <p className="text-muted text-sm mb-8">Manage your USDC balance on RaiseGG.</p>

        {/* Connect wallet prompt */}
        {!connected && (
          <div className="card text-center py-12 mb-8">
            <p className="text-muted mb-6">Connect your Solana wallet to deposit and withdraw USDC.</p>
            <WalletMultiButton />
          </div>
        )}

        {connected && (
          <>
            {/* Balance card */}
            <div className="card bg-gradient-card mb-8">
              <div className="text-xs text-muted uppercase tracking-widest mb-2">Platform Balance</div>
              <div className="font-orbitron text-4xl font-black text-gradient mb-1">{displayBalance}</div>
              <div className="text-xs text-muted">USDC available to stake</div>
              {publicKey && (
                <div className="mt-4 text-xs text-muted font-mono truncate">
                  {publicKey.toString()}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex bg-space-800 rounded border border-border p-1 gap-1 mb-6">
              {(['deposit', 'withdraw', 'history'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded text-sm font-semibold capitalize transition-all ${
                    tab === t ? 'bg-accent-purple text-white' : 'text-muted hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Deposit */}
            {tab === 'deposit' && (
              <div className="card space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownToLine className="w-5 h-5 text-accent-cyan" />
                  <h2 className="font-orbitron font-bold text-white">Deposit USDC</h2>
                </div>
                <p className="text-muted text-sm">Send USDC from your wallet to your RaiseGG balance. Funds are held in a Solana smart contract.</p>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider block mb-2">Amount (USDC)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="10.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="flex gap-2">
                  {[5, 10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setDepositAmount(String(amt))}
                      className="px-3 py-1.5 text-xs bg-space-700 border border-border hover:border-accent-purple text-muted hover:text-white rounded transition-all"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <Button
                  variant="cyan"
                  loading={loading}
                  className="w-full"
                  disabled={!depositAmount || Number(depositAmount) <= 0}
                  onClick={handleDeposit}
                >
                  Deposit {depositAmount ? `$${depositAmount}` : ''} USDC
                </Button>
              </div>
            )}

            {/* Withdraw */}
            {tab === 'withdraw' && (
              <div className="card space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpFromLine className="w-5 h-5 text-accent-purple" />
                  <h2 className="font-orbitron font-bold text-white">Withdraw USDC</h2>
                </div>
                <p className="text-muted text-sm">Withdraw USDC from your platform balance back to your wallet. Arrives in seconds.</p>
                {balance !== null && (
                  <div className="text-xs text-muted">
                    Available: <span className="text-white font-semibold">${balance.toFixed(2)}</span>
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider block mb-2">Amount (USDC)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="10.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input"
                  />
                </div>
                {balance !== null && (
                  <button
                    onClick={() => setWithdrawAmount(balance.toFixed(2))}
                    className="text-xs text-accent-purple hover:text-accent-purple-glow"
                  >
                    Withdraw all
                  </button>
                )}
                <Button
                  variant="primary"
                  loading={loading}
                  className="w-full"
                  disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || (balance !== null && Number(withdrawAmount) > balance)}
                  onClick={handleWithdraw}
                >
                  Withdraw {withdrawAmount ? `$${withdrawAmount}` : ''} USDC
                </Button>
              </div>
            )}

            {/* History */}
            {tab === 'history' && (
              <div className="card">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-muted" />
                  <h2 className="font-orbitron font-bold text-white">Transaction History</h2>
                </div>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted text-sm">No transactions yet.</div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <div className="text-sm font-semibold capitalize text-white">{tx.type}</div>
                          {tx.note && <div className="text-xs text-muted">{tx.note}</div>}
                          <div className="text-xs text-muted">{new Date(tx.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className={`font-orbitron font-bold text-sm ${TX_COLORS[tx.type]}`}>
                          {TX_SIGN[tx.type]}${Math.abs(tx.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
