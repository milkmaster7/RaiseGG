'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Search, X, Loader2, Trophy, Swords, Clock, Users, ChevronRight, Check, ShieldCheck, Info } from 'lucide-react'

type Game = 'cs2' | 'dota2' | 'deadlock'
type Currency = 'usdc' | 'usdt'

interface Opponent {
  id: string
  username: string
  avatar_url: string | null
  elo: number
  winRate: number
}

const GAME_CONFIG: Record<Game, { label: string; color: string; bgColor: string; borderColor: string; img: string }> = {
  cs2: { label: 'CS2', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/40', img: '/games/cs2.jpg' },
  dota2: { label: 'Dota 2', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/40', img: '/games/dota2.jpg' },
  deadlock: { label: 'Deadlock', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/40', img: '/games/deadlock.jpg' },
}

const STAKE_PRESETS = [5, 10, 25, 50, 100]

export function AutoQueue() {
  const [game, setGame] = useState<Game>('cs2')
  const [stakeAmount, setStakeAmount] = useState(10)
  const [currency, setCurrency] = useState<Currency>('usdc')
  const [status, setStatus] = useState<'idle' | 'searching' | 'matched' | 'accepting'>('idle')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [showVerifiedTooltip, setShowVerifiedTooltip] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Queue info
  const [queueSize, setQueueSize] = useState(0)
  const [estimatedWait, setEstimatedWait] = useState(120)
  const [elo, setElo] = useState(1000)
  const [elapsed, setElapsed] = useState(0)

  // Match info
  const [matchId, setMatchId] = useState<string | null>(null)
  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const [acceptCountdown, setAcceptCountdown] = useState(30)

  // Poll queue status every 3 seconds while searching
  useEffect(() => {
    if (status !== 'searching') return

    const poll = async () => {
      try {
        const res = await fetch('/api/matchmaking/queue')
        const data = await res.json()

        if (data.status === 'matched') {
          setStatus('matched')
          setMatchId(data.matchId)
          setOpponent(data.opponent)
          setAcceptCountdown(30)
        } else if (data.status === 'searching') {
          setQueueSize(data.queueSize ?? 0)
          setEstimatedWait(data.estimatedWait ?? 120)
          setElo(data.elo ?? 1000)
        } else if (data.status === 'idle') {
          // Was removed from queue externally
          setStatus('idle')
        }
      } catch (_) {
        // silent fail on poll
      }
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [status])

  // Elapsed timer while searching
  useEffect(() => {
    if (status !== 'searching') { setElapsed(0); return }
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [status])

  // Accept countdown
  useEffect(() => {
    if (status !== 'matched') return
    if (acceptCountdown <= 0) {
      // Timeout — decline and go back to searching
      handleDecline()
      return
    }
    const timeout = setTimeout(() => setAcceptCountdown(c => c - 1), 1000)
    return () => clearTimeout(timeout)
  }, [status, acceptCountdown])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  async function handleFindMatch() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/matchmaking/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, stakeAmount, currency, verified: verifiedOnly }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join queue')
        return
      }

      if (data.status === 'matched') {
        setMatchId(data.matchId)
        setOpponent(data.opponent)
        setStatus('matched')
        setAcceptCountdown(30)
      } else {
        setQueueSize(data.queueSize ?? 1)
        setEstimatedWait(data.estimatedWait ?? 120)
        setElo(data.elo ?? 1000)
        setStatus('searching')
      }
    } catch (_) {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    await fetch('/api/matchmaking/queue', { method: 'DELETE' })
    setStatus('idle')
  }

  function handleAccept() {
    if (matchId) {
      window.location.href = `/play?join=${matchId}`
    }
  }

  async function handleDecline() {
    // Leave the match queue entry and go back to searching
    await fetch('/api/matchmaking/queue', { method: 'DELETE' })
    setStatus('idle')
    setOpponent(null)
    setMatchId(null)
  }

  const gameConf = GAME_CONFIG[game]

  // Match Found state
  if (status === 'matched' && opponent) {
    return (
      <div className="card border-emerald-500/40 bg-emerald-500/5 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 font-orbitron text-sm font-bold mb-3 animate-pulse">
            <Swords className="w-4 h-4" /> MATCH FOUND!
          </div>
        </div>

        {/* Opponent Card */}
        <div className="card bg-gray-800/80 border-gray-600 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
              {opponent.avatar_url ? (
                <img src={opponent.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gray-400">{opponent.username[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="font-orbitron font-bold text-white text-lg">{opponent.username}</div>
              <div className="flex items-center gap-3 text-sm text-muted mt-1">
                <span>ELO: <span className="text-white font-semibold">{opponent.elo}</span></span>
                <span>Win Rate: <span className="text-white font-semibold">{opponent.winRate}%</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Accept Countdown */}
        <div className="text-center mb-4">
          <div className="text-sm text-muted mb-1">Accept within</div>
          <div className={`font-orbitron text-3xl font-black ${acceptCountdown <= 10 ? 'text-red-400' : 'text-white'}`}>
            {acceptCountdown}s
          </div>
        </div>

        {/* Accept / Decline */}
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 py-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-orbitron font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" /> Accept
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 py-3 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 font-orbitron font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" /> Decline
          </button>
        </div>
      </div>
    )
  }

  // Searching state
  if (status === 'searching') {
    return (
      <div className={`card ${gameConf.borderColor} max-w-lg mx-auto text-center py-8`}>
        {/* Pulsing animation */}
        <div className="relative w-20 h-20 mx-auto mb-5">
          <div className={`absolute inset-0 rounded-full ${gameConf.bgColor} animate-ping opacity-30`} />
          <div className={`absolute inset-2 rounded-full ${gameConf.bgColor} animate-pulse`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className={`w-8 h-8 ${gameConf.color}`} />
          </div>
        </div>

        <div className="font-orbitron text-xl font-bold text-white mb-1">Searching for opponent...</div>
        <div className={`text-sm ${gameConf.color} mb-2`}>{gameConf.label} &middot; ${stakeAmount} {currency.toUpperCase()}</div>
        {verifiedOnly && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 mb-2">
            <ShieldCheck className="w-3 h-3" /> Verified Only
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <Clock className="w-4 h-4 text-muted mx-auto mb-1" />
            <div className="font-orbitron text-lg text-white">{formatTime(elapsed)}</div>
            <div className="text-xs text-muted">Elapsed</div>
          </div>
          <div className="text-center">
            <Users className="w-4 h-4 text-muted mx-auto mb-1" />
            <div className="font-orbitron text-lg text-white">{queueSize}</div>
            <div className="text-xs text-muted">In Queue</div>
          </div>
          <div className="text-center">
            <Trophy className="w-4 h-4 text-muted mx-auto mb-1" />
            <div className="font-orbitron text-lg text-white">{elo}</div>
            <div className="text-xs text-muted">Your ELO</div>
          </div>
        </div>

        <div className="text-sm text-muted mb-6">
          Estimated wait: ~{formatTime(estimatedWait)}
        </div>

        <button
          onClick={handleCancel}
          className="px-8 py-2.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors inline-flex items-center gap-2"
        >
          <X className="w-4 h-4" /> Cancel Search
        </button>
      </div>
    )
  }

  // Idle — game selection + stake setup
  return (
    <div className="max-w-lg mx-auto">
      {/* Game Selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(Object.entries(GAME_CONFIG) as [Game, typeof GAME_CONFIG['cs2']][]).map(([key, conf]) => (
          <button
            key={key}
            onClick={() => setGame(key)}
            className={`relative rounded-lg overflow-hidden border-2 transition-all ${
              game === key
                ? `${conf.borderColor} ring-2 ring-offset-2 ring-offset-gray-900 ${conf.borderColor.replace('border-', 'ring-')}`
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="aspect-video bg-gray-800 flex items-center justify-center">
              <span className={`font-orbitron font-bold text-lg ${game === key ? conf.color : 'text-gray-400'}`}>
                {conf.label}
              </span>
            </div>
            {game === key && (
              <div className={`absolute top-2 right-2 w-5 h-5 rounded-full ${conf.bgColor} flex items-center justify-center`}>
                <Check className={`w-3 h-3 ${conf.color}`} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Stake Amount */}
      <div className="card mb-4">
        <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-3 block">Stake Amount</label>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {STAKE_PRESETS.map(amount => (
            <button
              key={amount}
              onClick={() => setStakeAmount(amount)}
              className={`py-2.5 rounded text-sm font-semibold transition-colors ${
                stakeAmount === amount
                  ? `${gameConf.bgColor} ${gameConf.color} border ${gameConf.borderColor}`
                  : 'bg-gray-800 text-muted border border-gray-700 hover:border-gray-500'
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Custom:</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={stakeAmount}
            onChange={e => setStakeAmount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50"
          />
        </div>
      </div>

      {/* Currency */}
      <div className="card mb-6">
        <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-3 block">Currency</label>
        <div className="grid grid-cols-2 gap-2">
          {(['usdc', 'usdt'] as Currency[]).map(c => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`py-2.5 rounded text-sm font-bold uppercase transition-colors ${
                currency === c
                  ? `${gameConf.bgColor} ${gameConf.color} border ${gameConf.borderColor}`
                  : 'bg-gray-800 text-muted border border-gray-700 hover:border-gray-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Verified Queue Toggle */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${verifiedOnly ? 'text-emerald-400' : 'text-gray-500'}`} />
            <span className="text-sm font-semibold text-gray-200">Verified Queue</span>
            {verifiedOnly && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Verified Only
              </span>
            )}
            <div className="relative">
              <button
                onMouseEnter={() => setShowVerifiedTooltip(true)}
                onMouseLeave={() => setShowVerifiedTooltip(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showVerifiedTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded bg-gray-900 border border-gray-600 text-xs text-gray-300 shadow-lg z-20">
                  Only players with linked FACEIT or Leetify accounts. Higher trust, competitive matches.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-r border-b border-gray-600 rotate-45 -mt-1" />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              verifiedOnly ? 'bg-emerald-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                verifiedOnly ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Find Match Button */}
      <button
        onClick={handleFindMatch}
        disabled={submitting}
        className={`w-full py-4 rounded-lg font-orbitron font-bold text-lg text-white transition-all flex items-center justify-center gap-3 ${
          submitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
        } ${
          game === 'cs2' ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400' :
          game === 'dota2' ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400' :
          'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400'
        }`}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Searching...
          </>
        ) : (
          <>
            <Swords className="w-5 h-5" /> Find Match
          </>
        )}
      </button>
    </div>
  )
}
