'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import HubCard from '@/components/hubs/HubCard'
import { GAME_FILTERS, REGIONS } from '@/lib/hubs'
import type { Hub } from '@/lib/hubs'

export default function HubsClient() {
  const [hubs, setHubs] = useState<Hub[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [game, setGame] = useState('all')
  const [region, setRegion] = useState('All')
  const [showCreate, setShowCreate] = useState(false)

  const fetchHubs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (game !== 'all') params.set('game', game)
    if (region !== 'All') params.set('region', region)

    try {
      const res = await fetch(`/api/hubs?${params}`)
      const data = await res.json()
      setHubs(data.hubs ?? [])
    } catch {
      setHubs([])
    } finally {
      setLoading(false)
    }
  }, [search, game, region])

  useEffect(() => {
    const timer = setTimeout(fetchHubs, 300)
    return () => clearTimeout(timer)
  }, [fetchHubs])

  return (
    <div>
      {/* Search + Create */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search hubs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded bg-space-800 border border-border text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/80 transition-colors shadow-glow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Hub
        </button>
      </div>

      {/* Game filter tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {GAME_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setGame(f.value)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              game === f.value
                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                : 'text-muted hover:text-white hover:bg-space-800 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Region filter */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {REGIONS.map(r => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              region === r
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                : 'text-muted hover:text-white hover:bg-space-800 border border-transparent'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Hub grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-accent-cyan animate-spin" />
        </div>
      ) : hubs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted text-sm">No hubs found. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hubs.map(hub => (
            <HubCard
              key={hub.id}
              slug={hub.slug}
              name={hub.name}
              game={hub.game}
              description={hub.description}
              region={hub.region}
              min_elo={hub.min_elo}
              max_elo={hub.max_elo}
              member_count={hub.member_count}
              match_count={hub.match_count}
            />
          ))}
        </div>
      )}

      {/* Create Hub Modal */}
      {showCreate && (
        <CreateHubModal onClose={() => setShowCreate(false)} onCreated={fetchHubs} />
      )}
    </div>
  )
}

function CreateHubModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [gameVal, setGameVal] = useState('cs2')
  const [regionVal, setRegionVal] = useState('Europe')
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState('')
  const [minElo, setMinElo] = useState(0)
  const [maxElo, setMaxElo] = useState(5000)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/hubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          game: gameVal,
          region: regionVal,
          description,
          rules,
          min_elo: minElo,
          max_elo: maxElo,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create hub')
        return
      }

      onCreated()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-space-900 border border-border rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-orbitron text-xl font-bold text-white mb-4">Create Hub</h2>

        {error && (
          <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Hub Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              required
              className="w-full px-3 py-2 rounded bg-space-800 border border-border text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50"
              placeholder="e.g. Turkish CS2 Hub"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Game</label>
              <select
                value={gameVal}
                onChange={e => setGameVal(e.target.value)}
                className="w-full px-3 py-2 rounded bg-space-800 border border-border text-sm text-white focus:outline-none focus:border-accent-cyan/50"
              >
                <option value="cs2">CS2</option>
                <option value="dota2">Dota 2</option>
                <option value="deadlock">Deadlock</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Region</label>
              <select
                value={regionVal}
                onChange={e => setRegionVal(e.target.value)}
                className="w-full px-3 py-2 rounded bg-space-800 border border-border text-sm text-white focus:outline-none focus:border-accent-cyan/50"
              >
                {REGIONS.filter(r => r !== 'All').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full px-3 py-2 rounded bg-space-800 border border-border text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 resize-none"
              placeholder="What makes your hub unique?"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Rules</label>
            <textarea
              value={rules}
              onChange={e => setRules(e.target.value)}
              maxLength={5000}
              rows={4}
              className="w-full px-3 py-2 rounded bg-space-800 border border-border text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 resize-none"
              placeholder="Hub rules (one per line)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Min ELO</label>
              <input
                type="number"
                value={minElo}
                onChange={e => setMinElo(parseInt(e.target.value) || 0)}
                min={0}
                max={5000}
                className="w-full px-3 py-2 rounded bg-space-800 border border-border text-sm text-white focus:outline-none focus:border-accent-cyan/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Max ELO</label>
              <input
                type="number"
                value={maxElo}
                onChange={e => setMaxElo(parseInt(e.target.value) || 5000)}
                min={0}
                max={5000}
                className="w-full px-3 py-2 rounded bg-space-800 border border-border text-sm text-white focus:outline-none focus:border-accent-cyan/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded bg-accent-cyan text-space-950 text-sm font-bold hover:bg-accent-cyan/80 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Hub'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded bg-space-800 border border-border text-sm text-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
