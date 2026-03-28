'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, X } from 'lucide-react'

interface Props {
  matchId: string
  game: string
  playerId: string
}

export function SubmitResultButton({ matchId, game, playerId }: Props) {
  const router = useRouter()
  const [open, setOpen]             = useState(false)
  const [matchUrl, setMatchUrl]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [result, setResult]         = useState<{ won: boolean; payout: number } | null>(null)

  if (game !== 'dota2') return null

  // Extract match ID from Dotabuff/OpenDota URL or raw number
  function parseMatchId(input: string): string {
    const clean = input.trim()
    // https://www.dotabuff.com/matches/1234567890
    // https://www.opendota.com/matches/1234567890
    const urlMatch = clean.match(/\/matches\/(\d+)/)
    if (urlMatch) return urlMatch[1]
    // raw numeric ID
    if (/^\d+$/.test(clean)) return clean
    return clean
  }

  async function handleSubmit() {
    const externalMatchId = parseMatchId(matchUrl)
    if (!externalMatchId) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/matches/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, externalMatchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Resolution failed')
      setResult({ won: data.winnerId === playerId, payout: data.payout })
      setTimeout(() => { setOpen(false); router.refresh() }, 2000)
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
        className="text-xs text-accent-purple hover:text-white font-semibold transition-colors"
      >
        Submit Result
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="card w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-orbitron font-bold text-white text-base">Submit Dota 2 Result</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {result ? (
              <div className="text-center py-6">
                <CheckCircle className={`w-12 h-12 mx-auto mb-3 ${result.won ? 'text-green-400' : 'text-muted'}`} />
                <p className="text-white font-semibold">{result.won ? 'You won!' : 'Match resolved.'}</p>
                <p className="text-muted text-sm mt-1">
                  {result.won ? `+$${result.payout.toFixed(2)} USDC credited` : 'Better luck next time.'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-muted text-sm mb-4">
                  Paste your Dotabuff/OpenDota match URL or just the match ID.
                </p>
                <input
                  type="text"
                  value={matchUrl}
                  onChange={(e) => setMatchUrl(e.target.value)}
                  placeholder="dotabuff.com/matches/... or match ID"
                  className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-purple mb-3"
                />
                {error && (
                  <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2 mb-3">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !matchUrl.trim()}
                  className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify & Resolve'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
