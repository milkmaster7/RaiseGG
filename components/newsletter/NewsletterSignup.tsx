'use client'

import { useState } from 'react'

interface Props {
  compact?: boolean
}

export function NewsletterSignup({ compact }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong.')
        return
      }

      setStatus('success')
      setEmail('')
    } catch (_) {
      setStatus('error')
      setErrorMsg('Network error. Try again.')
    }
  }

  if (compact) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-muted mb-2 font-medium">Weekly highlights</p>
        {status === 'success' ? (
          <p className="text-xs text-accent-cyan font-medium">You&apos;re in!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-1.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="flex-1 min-w-0 bg-space-800 border border-border rounded px-2 py-1.5 text-xs text-white placeholder:text-muted focus:border-accent-cyan focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 rounded px-2.5 py-1.5 text-xs font-medium hover:bg-accent-cyan/30 transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? '...' : 'Go'}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
        )}
      </div>
    )
  }

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="card bg-space-800 border border-border rounded-lg p-8 text-center">
        <h3 className="font-orbitron text-2xl font-bold text-white mb-2">
          Stay in the <span className="text-accent-cyan">Loop</span>
        </h3>
        <p className="text-muted text-sm mb-6 max-w-md mx-auto">
          Weekly highlights: top players, new cosmetics, tournament results
        </p>

        {status === 'success' ? (
          <p className="text-accent-cyan font-orbitron font-bold text-lg">
            You&apos;re in!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 bg-space-900 border border-border rounded px-4 py-3 text-sm text-white placeholder:text-muted focus:border-accent-cyan focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-primary px-6 py-3 text-sm font-medium disabled:opacity-50"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-red-400 text-sm mt-3">{errorMsg}</p>
        )}

        <p className="text-xs text-muted mt-4">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}
