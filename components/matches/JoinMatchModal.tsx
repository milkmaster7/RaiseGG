'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'
import { X, Zap, Loader2, Lock, TrendingUp, TrendingDown, Map } from 'lucide-react'
import { solanaJoinMatch } from '@/lib/escrow'
import type { StakeCurrency } from '@/lib/escrow'
import type { Match } from '@/types'
import { RivalryCard } from '@/components/matches/RivalryCard'
import { calculateEloPreview } from '@/lib/elo'

interface Props {
  match: Match
  playerId: string
  playerElo?: number
  onClose: () => void
}

export function JoinMatchModal({ match, playerId, playerElo, onClose }: Props) {
  const router = useRouter()
  const { connection } = useConnection()
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet()

  const [step, setStep]       = useState<'confirm' | 'submitting' | 'done'>('confirm')
  const [error, setError]     = useState<string | null>(null)
  const [password, setPassword] = useState('')

  const payout = match.stake_amount * 2 * 0.9
  const rake   = match.stake_amount * 2 * 0.1

  // ELO preview calculation
  const opponentElo = match.player_a?.[`${match.game}_elo` as keyof typeof match.player_a] as number | undefined
  const eloPreview = (playerElo && opponentElo)
    ? calculateEloPreview(playerElo, opponentElo)
    : null

  async function handleJoin() {
    if (!connected || !publicKey || !signTransaction || !signAllTransactions) return
    if (match.has_password && !password) {
      setError('This match is password-protected. Enter the password to join.')
      return
    }
    setStep('submitting')
    setError(null)

    try {
      const wallet = { publicKey, signTransaction, signAllTransactions }
      const { txSignature } = await solanaJoinMatch(connection, wallet, match.id, (match.currency ?? 'usdc') as StakeCurrency)

      const res = await fetch('/api/matches/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, playerBId: playerId, joinTx: txSignature, password }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to join match')
      }

      setStep('done')
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 1200)
    } catch (e: any) {
      setError(e?.message ?? 'Transaction failed')
      setStep('confirm')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="card w-full max-w-sm">

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-orbitron font-bold text-white text-lg">Join Match</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-white font-semibold mb-1">Joined!</p>
            <p className="text-muted text-sm">Match is now locked. Good luck!</p>
          </div>
        ) : (
          <>
            <div className="card bg-space-700 mb-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Game</span>
                <span className="text-white font-semibold uppercase">{match.game}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Format</span>
                <span className="text-white font-semibold">{match.format}</span>
              </div>
              {match.region && (
                <div className="flex justify-between">
                  <span className="text-muted">Server</span>
                  <span className="text-accent-cyan font-semibold">
                    {match.region === 'istanbul' || match.region === 'tr' || match.region === 'turkey'
                      ? '\ud83c\uddf9\ud83c\uddf7 Istanbul'
                      : match.region === 'caucasus' || match.region === 'ge'
                      ? '\ud83c\uddec\ud83c\uddea Caucasus'
                      : match.region === 'balkans'
                      ? '\ud83c\udde7\ud83c\uddec Balkans'
                      : match.region}
                  </span>
                </div>
              )}
              {/* Map info (CS2) */}
              {match.game === 'cs2' && (match as any).map_mode && (
                <div className="flex justify-between">
                  <span className="text-muted flex items-center gap-1"><Map className="w-3 h-3" /> Map</span>
                  <span className="text-white font-semibold">
                    {(match as any).map_mode === 'pick' && (match as any).selected_map
                      ? (match as any).selected_map.charAt(0).toUpperCase() + (match as any).selected_map.slice(1)
                      : (match as any).map_mode === 'veto'
                      ? 'Map Veto'
                      : 'Random'}
                  </span>
                </div>
              )}
              {match.game === 'cs2' && (match as any).map_mode === 'veto' && (
                <div className="bg-accent-purple/10 border border-accent-purple/20 rounded px-3 py-1.5">
                  <p className="text-[10px] text-accent-purple font-medium">Map veto will begin after both players join</p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Opponent</span>
                <span className="text-white font-semibold">{match.player_a?.username ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Currency</span>
                <span className="text-white font-bold uppercase">{match.currency ?? 'USDC'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Your stake</span>
                <span className="text-accent-cyan font-orbitron font-bold">${match.stake_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted">If you win</span>
                <span className="text-green-400 font-orbitron font-bold">+${payout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Platform rake</span>
                <span className="text-muted">${rake.toFixed(2)}</span>
              </div>
            </div>

            {/* ELO Change Preview */}
            {eloPreview && (
              <div className="card bg-space-700 mb-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-2">ELO Preview</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 flex-1 bg-green-500/10 border border-green-500/20 rounded px-3 py-2">
                    <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted">Win</p>
                      <p className="font-orbitron font-bold text-green-400">+{eloPreview.win}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                    <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted">Loss</p>
                      <p className="font-orbitron font-bold text-red-400">{eloPreview.loss}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rivalry history */}
            {match.player_a && (
              <div className="mb-4">
                <RivalryCard
                  opponentId={match.player_a.id}
                  opponentUsername={match.player_a.username}
                  opponentAvatar={match.player_a.avatar_url}
                  currentPlayerId={playerId}
                />
              </div>
            )}

            {/* Password field if match is protected */}
            {match.has_password && (
              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-xs text-muted uppercase tracking-wider mb-2">
                  <Lock className="w-3 h-3" /> Match Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter match password…"
                  className="w-full bg-space-800 border border-accent-cyan/30 rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan"
                />
              </div>
            )}

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            {!connected ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-muted text-sm mb-1">Connect your Solana wallet to stake</p>
                <WalletMultiButton className="!bg-accent-cyan hover:!bg-accent-cyan/80 !text-space-900 !rounded !text-sm !font-semibold" />
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={step === 'submitting'}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 'submitting' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</>
                ) : (
                  <><Zap className="w-4 h-4" /> Stake & Join — ${match.stake_amount.toFixed(2)}</>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
