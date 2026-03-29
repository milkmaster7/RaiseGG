'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Shield, Trophy, Search } from 'lucide-react'

type Team = {
  id: string
  name: string
  tag: string
  game: string
  captain_id: string
  elo: number
  recruiting: boolean
  role?: string
  members?: { count: number }[]
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

export function TeamsPageInner() {
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [browseTeams, setBrowseTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'my' | 'browse' | 'create'>('my')
  const [createForm, setCreateForm] = useState({ name: '', tag: '', game: 'cs2' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then(r => r.ok ? r.json() : { teams: [] }),
      fetch('/api/teams?browse=true').then(r => r.json()),
    ]).then(([mine, browse]) => {
      setMyTeams(mine.teams ?? [])
      setBrowseTeams(browse.teams ?? [])
      setLoading(false)
    })
  }, [])

  async function createTeam() {
    if (!createForm.name.trim() || !createForm.tag.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      if (res.ok) {
        const data = await res.json()
        setMyTeams(prev => [...prev, { ...data.team, role: 'captain' }])
        setTab('my')
        setCreateForm({ name: '', tag: '', game: 'cs2' })
      }
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="card animate-pulse h-48" />

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-space-800 rounded p-1">
        {[
          { key: 'my' as const, label: 'My Teams' },
          { key: 'browse' as const, label: 'Browse' },
          { key: 'create' as const, label: 'Create Team' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-muted hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* My Teams */}
      {tab === 'my' && (
        <div className="space-y-2">
          {myTeams.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted mb-2">You're not on any teams yet.</p>
              <button onClick={() => setTab('create')} className="text-accent-cyan text-sm hover:text-accent-cyan-glow transition-colors">
                Create a team →
              </button>
            </div>
          ) : myTeams.map(team => (
            <div key={team.id} className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center flex-shrink-0">
                <span className="font-orbitron font-bold text-accent-cyan text-sm">{team.tag}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">{team.name}</div>
                <div className="text-xs text-muted">{GAME_LABELS[team.game] ?? team.game} · {team.role === 'captain' ? 'Captain' : 'Member'}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-orbitron text-sm font-bold text-accent-cyan">{team.elo}</div>
                <div className="text-xs text-muted">ELO</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Browse Teams */}
      {tab === 'browse' && (
        <div className="space-y-2">
          {browseTeams.length === 0 ? (
            <div className="card text-center py-12">
              <Search className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted">No teams recruiting right now.</p>
            </div>
          ) : browseTeams.map(team => (
            <div key={team.id} className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center flex-shrink-0">
                <span className="font-orbitron font-bold text-accent-purple text-sm">{team.tag}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">{team.name}</div>
                <div className="text-xs text-muted">
                  {GAME_LABELS[team.game] ?? team.game} · {team.members?.[0]?.count ?? 1}/5 members
                  {team.recruiting && <span className="text-green-400 ml-2">Recruiting</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-orbitron text-sm font-bold text-accent-cyan">{team.elo}</div>
                <div className="text-xs text-muted">ELO</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team */}
      {tab === 'create' && (
        <div className="card max-w-md">
          <h2 className="font-orbitron text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-accent-cyan" /> Create Team
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-1 block">Team Name</label>
              <input
                type="text"
                placeholder="e.g. Shadow Strikers"
                value={createForm.name}
                onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-1 block">Tag (max 5 chars)</label>
              <input
                type="text"
                placeholder="e.g. SHDW"
                maxLength={5}
                value={createForm.tag}
                onChange={e => setCreateForm(prev => ({ ...prev, tag: e.target.value.toUpperCase() }))}
                className="w-full bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider font-semibold mb-1 block">Game</label>
              <select
                value={createForm.game}
                onChange={e => setCreateForm(prev => ({ ...prev, game: e.target.value }))}
                className="w-full bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
              >
                <option value="cs2">CS2</option>
                <option value="dota2">Dota 2</option>
                <option value="deadlock">Deadlock</option>
              </select>
            </div>
            <button onClick={createTeam} disabled={creating} className="btn-primary w-full py-3 text-sm">
              {creating ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
