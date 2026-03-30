'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Zap, Loader2, Copy, CheckCircle, Lock, Wifi, AlertTriangle } from 'lucide-react'
import { solanaCreateMatch, type StakeCurrency } from '@/lib/escrow'
import { usePing } from '@/hooks/usePing'
import type { Game, MatchFormat, MatchType } from '@/types'

const GAMES: { value: Game; label: string; badge?: string }[] = [
  { value: 'cs2',      label: 'CS2',      badge: 'Most Popular' },
  { value: 'dota2',    label: 'Dota 2'   },
  { value: 'deadlock', label: 'Deadlock', badge: 'Coming Soon' },
]

const FORMATS: { value: MatchFormat; label: string }[] = [
  { value: '1v1', label: '1v1' },
  { value: '5v5', label: '5v5' },
]

const MATCH_TYPES: { value: MatchType; label: string; teamSize: number }[] = [
  { value: '1v1', label: '1v1', teamSize: 1 },
  { value: '2v2', label: '2v2', teamSize: 2 },
  { value: '5v5', label: '5v5', teamSize: 5 },
]

const REGIONS = [
  { value: 'EU',  label: 'EU',  flag: '🇪🇺' },
  { value: 'TR',  label: 'TR',  flag: '🇹🇷' },
  { value: 'GE',  label: 'GE',  flag: '🇬🇪' },
  { value: 'KZ',  label: 'KZ',  flag: '🇰🇿' },
  { value: 'RU',  label: 'RU',  flag: '🇷🇺' },
]

const STAKE_PRESETS = [5, 10, 25, 50, 100]

type MapMode = 'pick' | 'veto' | 'random'

const CS2_MAPS = [
  { id: 'mirage',   name: 'Mirage' },
  { id: 'dust2',    name: 'Dust II' },
  { id: 'inferno',  name: 'Inferno' },
  { id: 'nuke',     name: 'Nuke' },
  { id: 'anubis',   name: 'Anubis' },
  { id: 'vertigo',  name: 'Vertigo' },
  { id: 'ancient',  name: 'Ancient' },
]

interface Props {
  playerId: string
  onClose: () => void
  challengedPlayerId?: string
  challengedUsername?: string
}

export function CreateMatchModal({ playerId, onClose, challengedPlayerId, challengedUsername }: Props) {
  const router = useRouter()
  const { connection } = useConnection()
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet()

  const [game, setGame]           = useState<Game>('cs2')
  const [format, setFormat]       = useState<MatchFormat>('1v1')
  const [matchType, setMatchType] = useState<MatchType>('1v1')
  const [teamName, setTeamName]   = useState('')
  const [region, setRegion]       = useState('EU')
  const [stake, setStake]         = useState('')
  const [currency, setCurrency]   = useState<StakeCurrency>('usdc')
  const [password, setPassword]   = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [mapMode, setMapMode]     = useState<MapMode>('random')
  const [pickedMap, setPickedMap] = useState<string | null>(null)
  const [step, setStep]           = useState<'form' | 'confirm' | 'submitting' | 'done'>('form')
  const [error, setError]         = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)
  const [lossStreak, setLossStreak]             = useState(0)
  const [lossWarningDismissed, setLossWarningDismissed] = useState(false)

  // Fetch recent loss streak
  useEffect(() => {
    async function checkLossStreak() {
      try {
        const res = await fetch(`/api/matches?player_id=${playerId}&status=completed&limit=10`)
        if (!res.ok) return
        const recentMatches = await res.json()
        if (!Array.isArray(recentMatches)) return
        const today = new Date().toISOString().slice(0, 10)
        let streak = 0
        for (const m of recentMatches) {
          const matchDate = (m.completed_at ?? m.updated_at ?? m.created_at ?? '').slice(0, 10)
          if (matchDate !== today) break
          if (m.winner_id && m.winner_id !== playerId) {
            streak++
          } else {
            break
          }
        }
        setLossStreak(streak)
      } catch {}
    }
    checkLossStreak()
  }, [playerId])

  const pings = usePing()
  const stakeNum = parseFloat(stake)
  const teamSize = MATCH_TYPES.find(t => t.value === matchType)?.teamSize ?? 1
  const isTeamMatch = matchType !== '1v1'
  const totalStake = stakeNum * teamSize
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

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          playerAId:          playerId,
          game,
          format,
          matchType,
          teamName:           isTeamMatch && teamName ? teamName : undefined,
          stakeAmount:        stakeNum,
          currency,
          vaultPda,
          createTx:           txSignature,
          region,
          mapMode:            game === 'cs2' ? mapMode : undefined,
          selectedMap:        game === 'cs2' && mapMode === 'pick' ? pickedMap : undefined,
          invitePassword:     usePassword && password ? password : undefined,
          challengedPlayerId: challengedPlayerId ?? undefined,
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
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-orbitron font-bold text-white text-lg">
            {challengedUsername ? `Challenge ${challengedUsername}` : 'Create Match'}
          </h2>
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
            <p className="text-muted text-sm mb-5">
              {challengedUsername
                ? `Share this link with ${challengedUsername} — only they can join.`
                : 'Share this link so your opponent can join directly.'}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/play?join=${createdId}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="flex items-center gap-2 mx-auto text-sm px-4 py-2 rounded border border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 transition-all"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
            {usePassword && password && (
              <p className="text-xs text-muted mt-3">Password: <span className="text-white font-mono">{password}</span></p>
            )}
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
                        ? 'border-accent-cyan bg-accent-cyan/10 text-white'
                        : 'border-border text-muted hover:border-accent-cyan/50'
                    }`}
                  >
                    {g.label}
                    {g.badge && (
                      <span className="absolute -top-2 -right-2 text-[9px] bg-accent-cyan text-space-900 px-1 rounded leading-tight font-bold">
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
                        ? 'border-accent-cyan bg-accent-cyan/10 text-white'
                        : 'border-border text-muted hover:border-accent-cyan/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Match Type */}
            <div className="mb-5">
              <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Match Type</label>
              <div className="flex gap-2">
                {MATCH_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setMatchType(t.value)}
                    className={`flex-1 py-2 rounded border text-sm font-semibold transition-all ${
                      matchType === t.value
                        ? 'border-accent-purple bg-accent-purple/10 text-white'
                        : 'border-border text-muted hover:border-accent-purple/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {isTeamMatch && (
                <p className="text-[10px] text-muted mt-1.5">
                  Each player stakes the amount below. Winner team splits the pot.
                </p>
              )}
            </div>

            {/* Team Name (team matches only) */}
            {isTeamMatch && (
              <div className="mb-5">
                <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name..."
                  maxLength={32}
                  className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-purple"
                />
              </div>
            )}

            {/* Region */}
            <div className="mb-5">
              <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Server Region</label>
              <div className="flex gap-2 flex-wrap">
                {REGIONS.map((r) => {
                  const ms = pings[r.value]
                  const pingColor = ms === null ? 'text-muted' : ms < 60 ? 'text-green-400' : ms < 120 ? 'text-yellow-400' : 'text-red-400'
                  return (
                    <button
                      key={r.value}
                      onClick={() => setRegion(r.value)}
                      className={`flex flex-col items-center px-3 py-2 rounded border text-sm font-semibold transition-all ${
                        region === r.value
                          ? 'border-accent-cyan bg-accent-cyan/10 text-white'
                          : 'border-border text-muted hover:border-accent-cyan/50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">{r.flag} {r.label}</span>
                      <span className={`text-[10px] font-mono mt-0.5 flex items-center gap-0.5 ${pingColor}`}>
                        <Wifi className="w-2.5 h-2.5" />
                        {ms === null ? '…' : ms >= 999 ? 'n/a' : `${ms}ms`}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Map Selection (CS2 only) */}
            {game === 'cs2' && (
              <div className="mb-5">
                <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Map Selection</label>
                <div className="flex gap-2 mb-2">
                  {([
                    { value: 'pick' as MapMode, label: 'Map Pick' },
                    { value: 'veto' as MapMode, label: 'Map Veto' },
                    { value: 'random' as MapMode, label: 'Random' },
                  ]).map(m => (
                    <button
                      key={m.value}
                      onClick={() => { setMapMode(m.value); if (m.value !== 'pick') setPickedMap(null) }}
                      className={`flex-1 py-2 rounded border text-xs font-semibold transition-all ${
                        mapMode === m.value
                          ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                          : 'border-border text-muted hover:border-accent-cyan/50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {mapMode === 'pick' && (
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {CS2_MAPS.map(map => (
                      <button
                        key={map.id}
                        onClick={() => setPickedMap(map.id)}
                        className={`py-2 px-1 rounded border text-xs font-semibold transition-all ${
                          pickedMap === map.id
                            ? 'border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                            : 'border-border text-muted hover:border-accent-cyan/30 hover:text-white'
                        }`}
                      >
                        {map.name}
                      </button>
                    ))}
                  </div>
                )}
                {mapMode === 'veto' && (
                  <p className="text-[10px] text-muted mt-1">Alternating bans after both players join. Last map standing is played.</p>
                )}
                {mapMode === 'random' && (
                  <p className="text-[10px] text-muted mt-1">A random map will be selected when the match locks.</p>
                )}
              </div>
            )}

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
            <div className="mb-5">
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
                className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan"
              />
              {stakeNum > 0 && (
                <div className="text-xs text-muted mt-1.5 space-y-0.5">
                  <p>
                    You stake <span className="text-white">${stakeNum.toFixed(2)}</span>
                    {isTeamMatch && (
                      <> · Total pot: <span className="text-accent-purple">${(totalStake * 2).toFixed(2)}</span> ({teamSize}v{teamSize})</>
                    )}
                  </p>
                  <p>
                    {isTeamMatch ? (
                      <>Winner team splits <span className="text-green-400">${(totalStake * 2 * 0.9).toFixed(2)}</span> · Rake <span className="text-muted">${(totalStake * 2 * 0.1).toFixed(2)}</span></>
                    ) : (
                      <>Winner takes <span className="text-green-400">${(stakeNum * 2 * 0.9).toFixed(2)}</span> · Rake <span className="text-muted">${(stakeNum * 2 * 0.1).toFixed(2)}</span></>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Password (optional) */}
            <div className="mb-6">
              <button
                onClick={() => { setUsePassword(!usePassword); setPassword('') }}
                className="flex items-center gap-2 text-xs text-muted hover:text-accent-cyan transition-colors mb-2"
              >
                <Lock className="w-3.5 h-3.5" />
                {usePassword ? 'Remove password (make public)' : 'Add match password (private lobby)'}
              </button>
              {usePassword && (
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set password for this match…"
                  className="w-full bg-space-800 border border-accent-cyan/30 rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan"
                />
              )}
            </div>

            {/* Loss streak warning */}
            {lossStreak >= 3 && !lossWarningDismissed && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-200">
                    You&apos;ve had a tough run ({lossStreak} losses in a row). Consider taking a break or playing a practice match.
                  </p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setLossWarningDismissed(true)}
                    className="px-3 py-1.5 rounded border border-yellow-500/40 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/10 transition-all"
                  >
                    Continue Anyway
                  </button>
                  <Link
                    href="/play?mode=practice"
                    className="px-3 py-1.5 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-all"
                  >
                    Practice Instead
                  </Link>
                </div>
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
