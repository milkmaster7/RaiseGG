'use client'

import { useState } from 'react'

export function TournamentNotifyForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/tournament-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setEmail('')
    } catch (_) {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return <p className="text-green-400 text-sm font-semibold">You're on the list. We'll email you when tournaments go live.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-primary px-4 py-2.5 text-sm whitespace-nowrap disabled:opacity-50"
      >
        {status === 'loading' ? 'Saving...' : 'Notify Me'}
      </button>
      {status === 'error' && <p className="text-red-400 text-xs mt-1">Something went wrong. Try again.</p>}
    </form>
  )
}
