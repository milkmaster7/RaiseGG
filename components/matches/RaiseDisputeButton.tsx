'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react'

interface Props {
  matchId: string
  status: string
}

export function RaiseDisputeButton({ matchId, status }: Props) {
  const router = useRouter()
  const [open, setOpen]             = useState(false)
  const [reason, setReason]         = useState('')
  const [evidence, setEvidence]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [done, setDone]             = useState(false)

  if (!['locked', 'live', 'completed'].includes(status)) return null

  async function handleSubmit() {
    if (reason.trim().length < 20) {
      setError('Please provide more detail (min 20 characters)')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, reason: reason.trim(), evidence: evidence.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to raise dispute')
      setDone(true)
      setTimeout(() => { setOpen(false); router.refresh() }, 2500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-yellow-400 hover:text-white font-semibold transition-colors"
      >
        Dispute
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="card w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <h2 className="font-orbitron font-bold text-white text-base">Raise a Dispute</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {done ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                <p className="text-white font-semibold">Dispute submitted</p>
                <p className="text-muted text-sm mt-1">Our team will review within 24 hours.</p>
              </div>
            ) : (
              <>
                <p className="text-muted text-sm mb-4">
                  Describe the issue. Our team reviews all disputes within 24 hours.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider block mb-1">Reason *</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="Explain what happened (min 20 characters)…"
                      className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-yellow-400 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider block mb-1">Evidence (optional)</label>
                    <input
                      type="text"
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      placeholder="Screenshot URL, match link, etc."
                      className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 mt-3">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || reason.trim().length < 20}
                  className="w-full mt-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Dispute'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
