'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, Search, Globe, Gamepad2 } from 'lucide-react'
import ClanCard from '@/components/clans/ClanCard'
import CreateClanModal from '@/components/clans/CreateClanModal'

type Clan = {
  id: string
  name: string
  tag: string
  description: string
  game_focus: string
  region: string
  invite_only: boolean
  member_count: number
  avg_elo: number
  created_at: string
}

const GAMES = ['All', 'CS2', 'Dota2', 'Deadlock']
const REGIONS = ['All', 'EU', 'NA', 'CIS', 'SEA', 'SA', 'OCE']

export default function ClansPage() {
  const [clans, setClans] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [gameFilter, setGameFilter] = useState('All')
  const [regionFilter, setRegionFilter] = useState('All')

  async function fetchClans() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (gameFilter !== 'All') params.set('game', gameFilter.toLowerCase())
      if (regionFilter !== 'All') params.set('region', regionFilter)
      const res = await fetch(`/api/clans?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClans(data.clans ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClans()
  }, [gameFilter, regionFilter])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchClans()
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-purple/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Clan System
          </div>
          <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-white mb-4">
            Clans
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto mb-8">
            Build your organization, compete as a unit, and climb the clan leaderboard together.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Clan
          </button>
        </div>
      </section>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search clans..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-space-800 border border-border text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent-cyan"
              />
            </div>
          </form>

          {/* Game filter */}
          <div className="flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4 text-muted" />
            {GAMES.map(g => (
              <button
                key={g}
                onClick={() => setGameFilter(g)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  gameFilter === g
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                    : 'bg-space-800 text-muted border border-border hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Region filter */}
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-muted" />
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 rounded text-xs font-medium bg-space-800 text-muted border border-border focus:outline-none focus:border-accent-cyan"
            >
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clan grid */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 rounded-lg bg-space-800 border border-border animate-pulse" />
            ))}
          </div>
        ) : clans.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted text-lg">No clans found</p>
            <p className="text-sm text-muted/60 mt-1">Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clans.map(clan => (
              <ClanCard key={clan.id} clan={clan} onJoined={fetchClans} />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateClanModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchClans() }}
        />
      )}
    </div>
  )
}
