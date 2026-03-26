'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { breadcrumbSchema } from '@/lib/schemas'
import { formatUsdc } from '@/lib/solana'
import { ArrowDownToLine, ArrowUpFromLine, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function WalletPage() {
  const { connected, publicKey } = useWallet()
  const [depositAmount, setDepositAmount]   = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [loading, setLoading]               = useState(false)
  const [tab, setTab]                       = useState<'deposit' | 'withdraw' | 'history'>('deposit')

  const crumbs = breadcrumbSchema([
    { name: 'Home',      url: 'https://raisegg.gg' },
    { name: 'Dashboard', url: 'https://raisegg.gg/dashboard' },
    { name: 'Wallet',    url: 'https://raisegg.gg/dashboard/wallet' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

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
              <div className="font-orbitron text-4xl font-black text-gradient mb-1">$0.00</div>
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
                <Button variant="cyan" loading={loading} className="w-full" disabled={!depositAmount || Number(depositAmount) <= 0}>
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
                <Button variant="primary" loading={loading} className="w-full" disabled={!withdrawAmount || Number(withdrawAmount) <= 0}>
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
                <div className="text-center py-8 text-muted text-sm">No transactions yet.</div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
