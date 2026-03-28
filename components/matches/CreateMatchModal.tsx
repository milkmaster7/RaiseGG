'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'
import { X, Zap, Loader2, Copy, CheckCircle } from 'lucide-react'
import { solanaCreateMatch, type StakeCurrency } from '@/lib/escrow'
import type { Game, MatchFormat } from '@/types'

const GAMES: { value: Game; label: string; badge?: string }[] = [
  { value: 'cs2',      label: 'CS2',      badge: 'Most Popular' },
  { value: 'dota2',    label: 'Dota 2'   },
  { value: 'deadlock', label: 'Deadlock', badge: 'Coming Soon' },
]

const FORMATS: { value: MatchFormat; label: string }[] = [
  { value: '1v1', label: '1v1' },
  { value: '5v5', label: '5v5' },
]

const STAKE_PRESETS = [5, 10, 25, 50, 100]

interface Props {
  playerId: string
  onClose: () => void
}

export function CreateMatchModal({ playerId, onClose }: Props) {
  const router = useRouter()
  const { connection } = useConnection()
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet()

  const [game, setGame]         = useState<Game>('cs2')
  const [format, setFormat]     = useState<MatchFormat>('1v1')
  const [stake, setStake]       = useState('')
  const [currency, setCurrency] = useState<StakeCurrency>('usdc')
  const [step, setStep]         = useState<'form' | 'confirm' | 'submitting' | 'done'>('form')
  const [error, setError]       = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  const stakeNum = parseFloat(stake)
  const valid = connected && stakeNum > 0 && game !== 'deadlock'

  async function handleCreate() {
    if (!valid || !publicKey || !signTransaction || !signAllTransactions) return
    setStep('submitting')
    setError(null)

    try {
      const matchId = crypto.randomUUID()
      const authority = process.env.NEXT_PUBLIC_TREASURY_SOL ?? ''

      const wallet = { publicKey, signTransaction, signAllTransactions }
      const { vaultPda, txSignature } = await solanaCreateMatch(
        connection,
        wallet,
        matchId,
        stakeNum,
        authority,
        currency
      )

      // Register match in DB — use same UUID so Solana PDA matches DB primary key
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          playerAId:   playerId,
          game,
          format,
          stakeAmount: stakeNum,
          currency,
          vaultPda,
          createTx:    txSignature,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to register match')
      }

      const match = await res.json()
      setCreatedId(match.id)
      setStep('done')
    } catch (e: any) {
      setError(e?.message ?? 'Transaction failed')
      setStep('form')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="card w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-orbitron font-bold text-white text-lg">Create Match</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-white font-semibold mb-1">Match Created!</p>
            <p className="text-muted text-sm mb-5">Share this link so your opponent can join directly.</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/play?join=${createdId}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="flex items-center gap-2 mx-auto text-sm px-4 py-2 rounded border border-accent-purple/40 bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 transition-all"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
            <button
              onClick={() => { onClose(); router.push(`/play?join=${createdId}`); router.refresh() }}
              className="mt-3 text-xs text-muted hover:text-white transition-colors"
            >
              Go to lobby →
            </button>
          </div>
        ) : (
          <>
            {/* Game */}
            <div className="mb-5">
              <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Game</label>
              <div className="grid grid-cols-3 gap-2">
                {GAMES.map((g) => (
                  <button
                    key={g.value}
                    disabled={g.value === 'deadlock'}
                    onClick={() => setGame(g.value)}
                    className={`relative py-2 px-3 rounded border text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      game === g.value
                        ? 'border-accent-purple bg-accent-purple/10 text-white'
                        : 'border-border text-muted hover:border-accent-purple/50'
                    }`}
                  >
                    {g.label}
                    {g.badge && (
                      <span className="absolute -top-2 -right-2 text-[9px] bg-accent-purple text-white px-1 rounded leading-tight">
                        {g.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="mb-5">
              <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Format</label>
              <div className="flex gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`flex-1 py-2 rounded border text-sm font-semibold transition-all ${
                      format === f.value
                        ? 'border-accent-purple bg-accent-purple/10 text-white'
                        : 'border-border text-muted hover:border-accent-purple/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div className="mb-5">
              <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Currency</label>
              <div className="flex gap-2">
                {(['usdc', 'usdt'] as StakeCurrency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`flex-1 py-2 rounded border text-sm font-bold uppercase tracking-wider transition-all ${
                      currency === c
                        ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                        : 'border-border text-muted hover:border-accent-cyan/50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Stake */}
            <div className="mb-6">
              <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Stake ({currency.toUpperCase()})</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {STAKE_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setStake(String(p))}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold transition-all ${
                      stake === String(p)
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
                step="1"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="Custom amount…"
                className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-purple"
              />
              {stakeNum > 0 && (
                <p className="text-xs text-muted mt-1.5">
                  You stake <span className="text-white">${stakeNum.toFixed(2)}</span> · Winner takes <span className="text-green-400">${(stakeNum * 2 * 0.9).toFixed(2)}</span> · Rake <span className="text-muted">${(stakeNum * 2 * 0.1).toFixed(2)}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            {!connected ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-muted text-sm mb-1">Connect your Solana wallet to stake</p>
                <WalletMultiButton className="!bg-accent-purple hover:!bg-accent-purple/80 !rounded !text-sm !font-semibold" />
              </div>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!valid || step === 'submitting'}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 'submitting' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating match…</>
                ) : (
                  <><Zap className="w-4 h-4" /> Create & Stake ${stakeNum > 0 ? stakeNum.toFixed(2) : '0.00'}</>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
