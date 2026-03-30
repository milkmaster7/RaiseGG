'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

const GAME_OPTIONS = [
  { value: 'cs2', label: 'CS2' },
  { value: 'dota2', label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
]

export default function StreamerApplicationForm() {
  const [form, setForm] = useState({
    twitch_username: '',
    avg_viewers: '',
    games: [] as string[],
    email: '',
    why: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const toggleGame = (game: string) => {
    setForm(f => ({
      ...f,
      games: f.games.includes(game)
        ? f.games.filter(g => g !== game)
        : [...f.games, game],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.twitch_username || !form.avg_viewers || form.games.length === 0 || !form.email) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/streamers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twitch_username: form.twitch_username,
          avg_viewers: parseInt(form.avg_viewers),
          games: form.games,
          email: form.email,
          why: form.why,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="card max-w-lg mx-auto text-center">
        <div className="w-14 h-14 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-green-400" />
        </div>
        <h3 className="font-orbitron text-lg font-bold text-white mb-2">Application Submitted!</h3>
        <p className="text-muted text-sm mb-4">
          We will review your application within 48 hours. Check your email for a confirmation.
        </p>
        <Link href="/" className="btn-secondary inline-block">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-lg mx-auto space-y-5">
      {/* Twitch Username */}
      <div>
        <label className="block text-sm text-muted mb-1.5 font-medium">Twitch Username</label>
        <input
          type="text"
          className="input"
          placeholder="your_twitch_name"
          value={form.twitch_username}
          onChange={e => setForm(f => ({ ...f, twitch_username: e.target.value }))}
          required
        />
      </div>

      {/* Average Viewers */}
      <div>
        <label className="block text-sm text-muted mb-1.5 font-medium">Average Concurrent Viewers</label>
        <input
          type="number"
          className="input"
          placeholder="50"
          min="1"
          value={form.avg_viewers}
          onChange={e => setForm(f => ({ ...f, avg_viewers: e.target.value }))}
          required
        />
        <p className="text-xs text-muted mt-1">Minimum 50 average viewers required.</p>
      </div>

      {/* Games */}
      <div>
        <label className="block text-sm text-muted mb-1.5 font-medium">Games You Stream</label>
        <div className="flex flex-wrap gap-2">
          {GAME_OPTIONS.map(g => (
            <button
              key={g.value}
              type="button"
              onClick={() => toggleGame(g.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                form.games.includes(g.value)
                  ? 'bg-accent-cyan/20 border-accent-cyan/50 text-accent-cyan'
                  : 'bg-space-900/50 border-border text-muted hover:border-accent-cyan/30'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {form.games.length === 0 && (
          <p className="text-xs text-muted mt-1">Select at least one game.</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm text-muted mb-1.5 font-medium">Email Address</label>
        <input
          type="email"
          className="input"
          placeholder="you@example.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
        />
        <p className="text-xs text-muted mt-1">We will send approval notifications here.</p>
      </div>

      {/* Why */}
      <div>
        <label className="block text-sm text-muted mb-1.5 font-medium">Why do you want to partner with RaiseGG?</label>
        <textarea
          className="input min-h-[100px] resize-y"
          placeholder="Tell us about your stream, community, and how you'd promote RaiseGG..."
          value={form.why}
          onChange={e => setForm(f => ({ ...f, why: e.target.value }))}
          rows={4}
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !form.twitch_username || !form.avg_viewers || form.games.length === 0 || !form.email}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  )
}
