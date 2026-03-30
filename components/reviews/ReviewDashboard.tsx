'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, CheckCircle, XCircle, HelpCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Player {
  id: string
  username: string
  avatar_url: string | null
}

interface PendingMatch {
  id: string
  game: string
  format: string
  stake_amount: number
  currency: string
  status: string
  dispute_reason: string | null
  created_at: string
  player_a: Player
  player_b: Player
}

interface PastReview {
  id: string
  verdict: string
  notes: string | null
  created_at: string
  match: {
    id: string
    game: string
    stake_amount: number
    currency: string
    status: string
  }
}

type Verdict = 'valid' | 'invalid' | 'inconclusive'

const GAME_LABELS: Record<string, string> = {
  cs2: 'CS2',
  dota2: 'Dota 2',
  deadlock: 'Deadlock',
}

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  valid: { label: 'Valid Match', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30', icon: CheckCircle },
  invalid: { label: 'Invalid Match', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30', icon: XCircle },
  inconclusive: { label: 'Inconclusive', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30', icon: HelpCircle },
}

export default function ReviewDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingMatch[]>([])
  const [history, setHistory] = useState<PastReview[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Per-match review state
  const [activeMatch, setActiveMatch] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews')
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load reviews')
        return
      }
      const data = await res.json()
      setPending(data.pending ?? [])
      setHistory(data.history ?? [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  async function handleSubmit(matchId: string) {
    if (!verdict) return
    setSubmitting(true)
    setSubmitSuccess(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, verdict, notes }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit review')
        return
      }

      setSubmitSuccess(matchId)
      setActiveMatch(null)
      setVerdict(null)
      setNotes('')
      // Refresh
      await fetchReviews()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error && pending.length === 0) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Pending: <span className="text-white font-semibold">{pending.length}</span></span>
        </div>
        <div className="text-gray-400">
          Reviewed: <span className="text-white font-semibold">{history.length}</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Pending reviews */}
      {pending.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
          <ShieldCheck className="w-8 h-8 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No pending disputes to review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((match) => (
            <div
              key={match.id}
              className={`rounded-lg border bg-gray-800/50 p-4 transition-colors ${
                activeMatch === match.id ? 'border-accent-cyan/40' : 'border-gray-700'
              }`}
            >
              {/* Match header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                    {GAME_LABELS[match.game] ?? match.game}
                  </span>
                  <span className="text-sm text-white font-semibold">
                    ${match.stake_amount} {match.currency.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{match.format}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(match.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Players */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {match.player_a?.avatar_url ? (
                      <img src={match.player_a.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-400">{match.player_a?.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-sm text-white">{match.player_a?.username ?? 'Unknown'}</span>
                </div>
                <span className="text-xs text-gray-500 font-bold">VS</span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-sm text-white">{match.player_b?.username ?? 'Unknown'}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {match.player_b?.avatar_url ? (
                      <img src={match.player_b.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-400">{match.player_b?.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dispute reason */}
              {match.dispute_reason && (
                <div className="mb-3 px-3 py-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
                  <span className="font-semibold">Dispute reason:</span> {match.dispute_reason}
                </div>
              )}

              {/* Success flash */}
              {submitSuccess === match.id && (
                <div className="mb-3 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-semibold">
                  Review submitted!
                </div>
              )}

              {/* Review form */}
              {activeMatch === match.id ? (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-700">
                  {/* Verdict buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(VERDICT_CONFIG) as [Verdict, typeof VERDICT_CONFIG['valid']][]).map(([v, conf]) => {
                      const Icon = conf.icon
                      return (
                        <button
                          key={v}
                          onClick={() => setVerdict(v)}
                          className={`py-2.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
                            verdict === v
                              ? `${conf.bgColor} ${conf.color}`
                              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {conf.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Notes */}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes about your review..."
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan/50 resize-none"
                  />

                  {/* Submit */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubmit(match.id)}
                      disabled={!verdict || submitting}
                      className="flex-1 py-2 rounded bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 text-sm font-semibold hover:bg-accent-cyan/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Submit Review
                    </button>
                    <button
                      onClick={() => { setActiveMatch(null); setVerdict(null); setNotes('') }}
                      className="px-4 py-2 rounded bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setActiveMatch(match.id); setVerdict(null); setNotes('') }}
                  className="w-full py-2 rounded bg-gray-700/50 text-gray-300 text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Review This Match
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review history */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-3"
          >
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Past Reviews ({history.length})
          </button>

          {showHistory && (
            <div className="space-y-2">
              {history.map((review) => {
                const conf = VERDICT_CONFIG[review.verdict as Verdict]
                const Icon = conf?.icon ?? HelpCircle
                return (
                  <div
                    key={review.id}
                    className="rounded-lg border border-gray-700 bg-gray-800/30 p-3 flex items-center gap-3"
                  >
                    <Icon className={`w-4 h-4 ${conf?.color ?? 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-semibold ${conf?.color ?? 'text-gray-400'}`}>
                          {conf?.label ?? review.verdict}
                        </span>
                        <span className="text-xs text-gray-500">
                          {GAME_LABELS[review.match?.game] ?? review.match?.game} &middot; ${review.match?.stake_amount} {review.match?.currency?.toUpperCase()}
                        </span>
                      </div>
                      {review.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{review.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
