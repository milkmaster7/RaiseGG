'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Dispute {
  id: string
  reason: string
  created_at: string
  raised_by: { username: string } | null
  match: {
    id: string
    game: string
    stake_amount: number
    player_a_id: string
    player_b_id: string
    player_a_username: string
    player_b_username: string
  } | null
}

interface Props {
  dispute: Dispute
}

export function DisputeCard({ dispute }: Props) {
  const router = useRouter()
  const [open, setOpen]             = useState(false)
  const [resolution, setResolution] = useState('')
  const [winnerId, setWinnerId]     = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function submit(action: 'resolve' | 'cancel') {
    if (!resolution.trim()) { setError('Resolution note is required'); return }
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, string> = { resolution, action }
      if (action === 'resolve' && winnerId) body.winnerId = winnerId
      const res = await fetch(`/api/disputes/${dispute.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="card flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">{dispute.raised_by?.username ?? '—'}</div>
          <div className="text-xs text-muted mb-1">
            {dispute.match?.game?.toUpperCase()} · ${dispute.match?.stake_amount}
          </div>
          <div className="text-xs text-muted line-clamp-2">{dispute.reason}</div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0 text-xs">
          <span className="text-muted">{new Date(dispute.created_at).toLocaleDateString()}</span>
          <button
            onClick={() => setOpen(true)}
            className="text-xs bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded font-semibold transition-colors"
          >
            Resolve
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-orbitron font-bold text-white text-base">Resolve Dispute</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Match info */}
            <div className="bg-space-800 rounded border border-border p-3 mb-4 text-sm">
              <div className="text-muted text-xs mb-1">Match</div>
              <div className="text-white font-semibold">
                {dispute.match?.player_a_username} vs {dispute.match?.player_b_username}
              </div>
              <div className="text-muted text-xs mt-0.5">
                {dispute.match?.game?.toUpperCase()} · ${dispute.match?.stake_amount} stake
              </div>
              <div className="text-muted text-xs mt-2 leading-relaxed">{dispute.reason}</div>
            </div>

            {/* Winner override (optional) */}
            {dispute.match && (
              <div className="mb-4">
                <div className="text-xs text-muted mb-2">Override winner (optional — leave blank to just close)</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWinnerId(winnerId === dispute.match!.player_a_id ? '' : dispute.match!.player_a_id)}
                    className={`flex-1 text-xs py-2 px-3 rounded border transition-colors ${
                      winnerId === dispute.match.player_a_id
                        ? 'bg-green-500/20 border-green-500/40 text-green-400'
                        : 'bg-space-800 border-border text-muted hover:text-white'
                    }`}
                  >
                    {dispute.match.player_a_username}
                  </button>
                  <button
                    onClick={() => setWinnerId(winnerId === dispute.match!.player_b_id ? '' : dispute.match!.player_b_id)}
                    className={`flex-1 text-xs py-2 px-3 rounded border transition-colors ${
                      winnerId === dispute.match.player_b_id
                        ? 'bg-green-500/20 border-green-500/40 text-green-400'
                        : 'bg-space-800 border-border text-muted hover:text-white'
                    }`}
                  >
                    {dispute.match.player_b_username}
                  </button>
                </div>
                {winnerId && (
                  <p className="text-xs text-green-400 mt-1">
                    Will credit ${(dispute.match.stake_amount * 2 * 0.9).toFixed(2)} USDC to {
                      winnerId === dispute.match.player_a_id ? dispute.match.player_a_username : dispute.match.player_b_username
                    }
                  </p>
                )}
              </div>
            )}

            {/* Resolution note */}
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Admin resolution note (required)…"
              rows={3}
              className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-purple mb-3 resize-none"
            />

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 mb-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => submit('resolve')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold py-2 rounded transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Resolve
              </button>
              <button
                onClick={() => submit('cancel')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-space-800 hover:bg-space-700 border border-border text-muted hover:text-white text-sm font-semibold py-2 rounded transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
