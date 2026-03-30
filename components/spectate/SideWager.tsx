'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { DollarSign, TrendingUp, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

interface SideWagerProps {
  matchId: string
  playerAName: string
  playerBName: string
}

interface WagerPool {
  totalPool: number
  poolA: number
  poolB: number
  countA: number
  countB: number
  oddsA: string
  oddsB: string
  rake: number
  wagerCount: number
}

export function SideWager({ matchId, playerAName, playerBName }: SideWagerProps) {
  const { connected } = useWallet()
  const [pool, setPool] = useState<WagerPool | null>(null)
  const [backing, setBacking] = useState<'player_a' | 'player_b' | null>(null)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch(`/api/side-wagers?match_id=${matchId}`)
      if (res.ok) {
        const data = await res.json()
        setPool(data)
      }
    } catch {}
  }, [matchId])

  useEffect(() => {
    fetchPool()
    const interval = setInterval(fetchPool, 10000) // poll every 10s
    return () => clearInterval(interval)
  }, [fetchPool])

  const amountNum = parseFloat(amount)
  const canSubmit = connected && backing && amountNum >= 1 && amountNum <= 20 && !submitting && !success

  async function handlePlaceWager() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/side-wagers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, backing, amount: amountNum }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to place wager')
      setSuccess(true)
      fetchPool()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to place wager')
    } finally {
      setSubmitting(false)
    }
  }

  const PRESETS = [1, 5, 10, 20]

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent-purple" />
        <h3 className="font-orbitron text-sm font-bold text-white uppercase tracking-wider">Side Wager</h3>
      </div>

      {/* Pool stats */}
      {pool && pool.totalPool > 0 && (
        <div className="bg-space-800 rounded-lg border border-border p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Total Pool</span>
            <span className="font-orbitron text-sm font-bold text-accent-cyan">
              <DollarSign className="w-3 h-3 inline" />{pool.totalPool.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center bg-space-700 rounded px-2 py-1.5">
              <div className="text-[10px] text-muted uppercase mb-0.5">{playerAName}</div>
              <div className="text-xs text-white font-semibold">${pool.poolA.toFixed(2)}</div>
              <div className="text-[10px] text-accent-cyan">{pool.oddsA}</div>
            </div>
            <div className="text-center bg-space-700 rounded px-2 py-1.5">
              <div className="text-[10px] text-muted uppercase mb-0.5">{playerBName}</div>
              <div className="text-xs text-white font-semibold">${pool.poolB.toFixed(2)}</div>
              <div className="text-[10px] text-accent-cyan">{pool.oddsB}</div>
            </div>
          </div>
          <p className="text-[10px] text-muted mt-2 text-center">{pool.wagerCount} wager{pool.wagerCount !== 1 ? 's' : ''} placed &middot; {pool.rake}% rake</p>
        </div>
      )}

      {success ? (
        <div className="text-center py-4">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-white font-semibold">Wager Placed!</p>
          <p className="text-xs text-muted mt-1">
            You backed <span className="text-accent-cyan">{backing === 'player_a' ? playerAName : playerBName}</span> for ${amountNum.toFixed(2)}
          </p>
        </div>
      ) : (
        <>
          {/* Who wins? */}
          <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Who wins?</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setBacking('player_a')}
              className={`py-3 rounded border text-sm font-semibold transition-all ${
                backing === 'player_a'
                  ? 'border-accent-cyan bg-accent-cyan/10 text-white shadow-[0_0_12px_rgba(0,229,255,0.1)]'
                  : 'border-border text-muted hover:border-accent-cyan/50 hover:text-white'
              }`}
            >
              {playerAName}
            </button>
            <button
              onClick={() => setBacking('player_b')}
              className={`py-3 rounded border text-sm font-semibold transition-all ${
                backing === 'player_b'
                  ? 'border-accent-purple bg-accent-purple/10 text-white shadow-[0_0_12px_rgba(123,97,255,0.1)]'
                  : 'border-border text-muted hover:border-accent-purple/50 hover:text-white'
              }`}
            >
              {playerBName}
            </button>
          </div>

          {/* Amount */}
          <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Wager Amount (USDC)</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`px-3 py-1.5 rounded border text-xs font-semibold transition-all ${
                  amount === String(p)
                    ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                    : 'border-border text-muted hover:border-accent-cyan/50'
                }`}
              >
                ${p}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            max="20"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$1 – $20"
            className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan mb-4"
          />

          {error && (
            <div className="mb-3 flex items-start gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {!connected ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-muted text-xs mb-1">Connect your wallet to place a side wager</p>
              <WalletMultiButton className="!bg-accent-cyan hover:!bg-accent-cyan/80 !text-space-900 !rounded !text-sm !font-semibold" />
            </div>
          ) : (
            <button
              onClick={handlePlaceWager}
              disabled={!canSubmit}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Placing wager...</>
              ) : (
                <><DollarSign className="w-4 h-4" /> Place Wager{amountNum > 0 ? ` $${amountNum.toFixed(2)}` : ''}</>
              )}
            </button>
          )}

          <p className="text-[10px] text-muted mt-2 text-center">
            {pool?.rake ?? 5}% rake deducted from winning payouts. Wagers lock when match starts.
          </p>
        </>
      )}
    </div>
  )
}
