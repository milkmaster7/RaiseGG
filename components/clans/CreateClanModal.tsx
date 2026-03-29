'use client'

import { useState } from 'react'
import { X, Shield } from 'lucide-react'

const GAMES = [
  { value: 'cs2', label: 'CS2' },
  { value: 'dota2', label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
  { value: 'all', label: 'All Games' },
]

const REGIONS = ['EU', 'NA', 'CIS', 'SEA', 'SA', 'OCE']

export default function CreateClanModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    tag: '',
    description: '',
    game_focus: 'cs2',
    region: 'EU',
    invite_only: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.tag.trim()) return

    const tagClean = form.tag.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (tagClean.length < 3 || tagClean.length > 5) {
      setError('Tag must be 3-5 uppercase characters')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/clans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tag: tagClean }),
      })
      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to create clan')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl bg-space-900 border border-border p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-purple" />
            </div>
            <h2 className="text-xl font-orbitron font-bold text-white">Create Clan</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-space-800 text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Clan Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={30}
              required
              placeholder="e.g. Shadow Wolves"
              className="w-full px-4 py-2.5 rounded-lg bg-space-800 border border-border text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent-cyan"
            />
          </div>

          {/* Tag */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Tag (3-5 chars)</label>
            <input
              type="text"
              value={form.tag}
              onChange={e => setForm(f => ({ ...f, tag: e.target.value.toUpperCase().slice(0, 5) }))}
              maxLength={5}
              required
              placeholder="e.g. SHW"
              className="w-full px-4 py-2.5 rounded-lg bg-space-800 border border-border text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent-cyan uppercase font-mono tracking-wider"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              maxLength={500}
              placeholder="Tell people about your clan..."
              className="w-full px-4 py-2.5 rounded-lg bg-space-800 border border-border text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent-cyan resize-none"
            />
          </div>

          {/* Game + Region row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Game Focus</label>
              <select
                value={form.game_focus}
                onChange={e => setForm(f => ({ ...f, game_focus: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-space-800 border border-border text-white text-sm focus:outline-none focus:border-accent-cyan"
              >
                {GAMES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Region</label>
              <select
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-space-800 border border-border text-white text-sm focus:outline-none focus:border-accent-cyan"
              >
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Invite only toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, invite_only: !f.invite_only }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.invite_only ? 'bg-accent-purple' : 'bg-space-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.invite_only ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-muted">Invite Only (players must apply to join)</span>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.tag.trim()}
            className="w-full py-3 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Clan'}
          </button>
        </form>
      </div>
    </div>
  )
}
