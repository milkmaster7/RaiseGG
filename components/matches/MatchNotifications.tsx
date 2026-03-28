'use client'

/**
 * MatchNotifications
 *
 * Listens for real-time Supabase changes on matches owned by the current player.
 * Shows a toast when:
 *   - Someone joins their open match (status: open → locked)
 *   - Their match is resolved (locked → completed)
 *   - Their match is cancelled
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { X, Zap, CheckCircle, XCircle } from 'lucide-react'

type Toast = {
  id:      string
  type:    'join' | 'win' | 'loss' | 'cancel'
  message: string
  matchId: string
}

const ICONS = {
  join:   <Zap className="w-4 h-4 text-accent-cyan" />,
  win:    <CheckCircle className="w-4 h-4 text-green-400" />,
  loss:   <XCircle className="w-4 h-4 text-red-400" />,
  cancel: <XCircle className="w-4 h-4 text-muted" />,
}

const COLORS = {
  join:   'border-accent-cyan/40 bg-space-800',
  win:    'border-green-500/40 bg-space-800',
  loss:   'border-red-500/40 bg-space-800',
  cancel: 'border-border bg-space-800',
}

export function MatchNotifications() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [toasts, setToasts]     = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000)
  }, [])

  // Get current player ID
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.player?.id) setPlayerId(d.player.id) })
      .catch(() => {})
  }, [])

  // Subscribe to match changes
  useEffect(() => {
    if (!playerId) return

    const channel = supabase
      .channel(`match-notifications-${playerId}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'matches',
        filter: `player_a_id=eq.${playerId}`,
      }, (payload) => {
        const match = payload.new as any
        const prev  = payload.old as any

        if (prev.status === 'open' && match.status === 'locked') {
          addToast({ type: 'join', message: 'Someone joined your match! Get ready to play.', matchId: match.id })
        } else if (['locked', 'live'].includes(prev.status) && match.status === 'completed') {
          if (match.winner_id === playerId) {
            addToast({ type: 'win', message: 'You won! Payout has been credited to your balance.', matchId: match.id })
          } else {
            addToast({ type: 'loss', message: 'Match over. Better luck next time.', matchId: match.id })
          }
        } else if (match.status === 'cancelled') {
          addToast({ type: 'cancel', message: 'Your match was cancelled. Stake refunded.', matchId: match.id })
        }
      })
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'matches',
        filter: `player_b_id=eq.${playerId}`,
      }, (payload) => {
        const match = payload.new as any
        if (match.status === 'completed') {
          if (match.winner_id === playerId) {
            addToast({ type: 'win', message: 'You won! Payout has been credited to your balance.', matchId: match.id })
          } else {
            addToast({ type: 'loss', message: 'Match over. Better luck next time.', matchId: match.id })
          }
        } else if (match.status === 'cancelled') {
          addToast({ type: 'cancel', message: 'Match was cancelled. Stake refunded.', matchId: match.id })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [playerId, addToast])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-start gap-3 p-4 rounded border shadow-lg animate-fade-in ${COLORS[t.type]}`}>
          <div className="flex-shrink-0 mt-0.5">{ICONS[t.type]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-semibold leading-snug">{t.message}</div>
            <Link
              href={t.type === 'join' ? `/play?join=${t.matchId}` : '/dashboard/matches'}
              className="text-xs text-accent-purple hover:underline mt-1 inline-block"
            >
              {t.type === 'join' ? 'View lobby →' : 'Match history →'}
            </Link>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="flex-shrink-0 text-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
