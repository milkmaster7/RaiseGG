'use client'

import { useState } from 'react'
import { Link2, Copy, Check, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ChallengeLinkProps {
  /** Default game for the challenge */
  defaultGame?: 'cs2' | 'dota2' | 'deadlock'
}

export function ChallengeLink({ defaultGame = 'cs2' }: ChallengeLinkProps) {
  const [open, setOpen] = useState(false)
  const [game, setGame] = useState(defaultGame)
  const [stakeAmount, setStakeAmount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    link: string
    shareText: string
    telegramUrl: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/challenge-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, stakeAmount, currency: 'usdc' }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/api/auth/steam'
          return
        }
        throw new Error(data.error ?? 'Failed to create challenge')
      }

      setResult({
        link: data.link,
        shareText: data.shareText,
        telegramUrl: data.telegramUrl,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = result.link
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function shareMessage(): string {
    return `I challenge you to a $${stakeAmount} ${game.toUpperCase()} stake match on RaiseGG! Join here:`
  }

  function twitterUrl(): string {
    if (!result) return '#'
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(result.link)}&text=${encodeURIComponent(shareMessage())}`
  }

  function whatsappUrl(): string {
    if (!result) return '#'
    return `https://wa.me/?text=${encodeURIComponent(shareMessage() + ' ' + result.link)}`
  }

  function telegramUrl(): string {
    if (!result) return '#'
    return `https://t.me/share/url?url=${encodeURIComponent(result.link)}&text=${encodeURIComponent(shareMessage())}`
  }

  function handleClose() {
    setOpen(false)
    setResult(null)
    setError('')
    setCopied(false)
  }

  return (
    <>
      <Button
        variant="secondary"
        className="flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Link2 className="w-4 h-4" />
        Challenge a Friend
      </Button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="card max-w-md w-full relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-orbitron font-bold text-white text-lg mb-1">
              Challenge a Friend
            </h3>
            <p className="text-muted text-sm mb-6">
              Generate a shareable link. Your friend clicks it and joins the match.
            </p>

            {!result ? (
              <>
                {/* Game selector */}
                <div className="mb-4">
                  <label className="text-muted text-xs uppercase tracking-wider mb-2 block">Game</label>
                  <div className="flex bg-space-800 rounded border border-border p-1 gap-1">
                    {(['cs2', 'dota2', 'deadlock'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGame(g)}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                          game === g
                            ? 'bg-accent-cyan text-space-900'
                            : 'text-muted hover:text-white'
                        }`}
                      >
                        {g === 'cs2' ? 'CS2' : g === 'dota2' ? 'Dota 2' : 'Deadlock'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stake amount */}
                <div className="mb-6">
                  <label className="text-muted text-xs uppercase tracking-wider mb-2 block">Stake Amount (USDC)</label>
                  <div className="flex gap-2 mb-2">
                    {[1, 5, 10, 25, 50].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setStakeAmount(amt)}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-all border ${
                          stakeAmount === amt
                            ? 'bg-accent-cyan text-space-900 border-accent-cyan'
                            : 'border-border text-muted hover:text-white hover:border-space-600'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-space-800 border border-space-700 rounded px-3 py-2 text-white text-sm focus:border-accent-cyan focus:outline-none transition-colors"
                    placeholder="Custom amount"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm mb-4">{error}</div>
                )}

                <Button
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleCreate}
                  loading={loading}
                >
                  <Link2 className="w-4 h-4" />
                  Generate Challenge Link
                </Button>
              </>
            ) : (
              <>
                {/* Link display */}
                <div className="mb-4">
                  <label className="text-muted text-xs uppercase tracking-wider mb-2 block">Your Challenge Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={result.link}
                      className="flex-1 bg-space-800 border border-space-700 rounded px-3 py-2.5 text-accent-cyan text-sm font-mono focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className={`shrink-0 p-2.5 rounded border transition-all ${
                        copied
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-space-800 border-space-700 text-muted hover:text-white hover:border-accent-cyan'
                      }`}
                      title="Copy link"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-muted text-xs mt-2">Link expires in 24 hours.</p>
                </div>

                {/* Share buttons */}
                <div className="mb-4">
                  <label className="text-muted text-xs uppercase tracking-wider mb-2 block">Share</label>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={telegramUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Telegram
                    </a>
                    <a
                      href={twitterUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-space-800 border border-space-700 hover:border-accent-cyan text-white text-sm font-semibold transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      Twitter / X
                    </a>
                    <a
                      href={whatsappUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-[#25D366] hover:bg-[#1da851] text-white text-sm font-semibold transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                    <button
                      onClick={handleCopy}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-space-800 border border-space-700 hover:border-accent-cyan text-white text-sm font-semibold transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleClose}
                >
                  Done
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
