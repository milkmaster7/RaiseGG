'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, Check, Lock } from 'lucide-react'

interface Props {
  tournamentId: string
  entryFee: number
  maxPlayers: number
  registeredCount: number
  status: string
  startsAt: string
}

export function RegisterButton({ tournamentId, entryFee, maxPlayers, registeredCount, status }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'registered' | 'error'>('idle')
  const [error, setError] = useState('')
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  const isFull = registeredCount >= maxPlayers
  const isOpen = status === 'registration' || status === 'upcoming'
  const canAfford = balance !== null && balance >= entryFee

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/player')
        if (!res.ok) return
        const data = await res.json()
        setPlayerId(data.player?.id ?? null)
        setBalance(Number(data.player?.usdc_balance ?? 0))
      } catch (_) {}

      // Check if already registered
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}`)
        if (!res.ok) return
        const data = await res.json()
        const me = data.registrations?.find((r: any) => r.player_id === playerId)
        if (me) setIsRegistered(true)
      } catch (_) {}
    }
    check()
  }, [tournamentId, playerId])

  async function handleRegister() {
    setState('loading')
    setError('')

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Registration failed')
      }

      setState('registered')
      setIsRegistered(true)
    } catch (err: any) {
      setState('error')
      setError(err.message)
    }
  }

  // Already registered
  if (isRegistered || state === 'registered') {
    return (
      <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 font-semibold text-sm cursor-default">
        <Check className="w-4 h-4" />
        Registered
      </button>
    )
  }

  // Tournament not open
  if (!isOpen) {
    return (
      <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-space-700 text-muted font-semibold text-sm cursor-not-allowed">
        <Lock className="w-4 h-4" />
        Registration Closed
      </button>
    )
  }

  // Full
  if (isFull) {
    return (
      <button disabled className="w-full py-3 rounded-lg bg-space-700 text-muted font-semibold text-sm cursor-not-allowed">
        Tournament Full
      </button>
    )
  }

  // Not logged in
  if (playerId === null && balance === null) {
    return (
      <a href="/api/auth/steam" className="block w-full text-center py-3 rounded-lg btn-primary text-sm">
        Sign in to Register
      </a>
    )
  }

  // Insufficient balance
  if (!canAfford && entryFee > 0) {
    return (
      <div>
        <button disabled className="w-full py-3 rounded-lg bg-space-700 text-muted font-semibold text-sm cursor-not-allowed">
          Insufficient Balance (${balance?.toFixed(2)} USDC)
        </button>
        <a href="/dashboard" className="block text-center text-xs text-accent-cyan mt-2 hover:underline">
          Deposit USDC
        </a>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleRegister}
        disabled={state === 'loading'}
        className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2"
      >
        {state === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : null}
        {entryFee === 0 ? 'Register — Free Entry' : `Register — $${entryFee} USDC`}
      </button>
      {state === 'error' && error && (
        <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  )
}
