'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Shield, Users, Trophy, Crown, Star, Settings, LogOut, Trash2, UserPlus, UserMinus, ArrowUp } from 'lucide-react'

type ClanMember = {
  player_id: string
  role: 'leader' | 'officer' | 'member'
  joined_at: string
  username: string
  elo: number
  games_played: number
}

type ClanDetail = {
  id: string
  name: string
  tag: string
  description: string
  game_focus: string
  region: string
  invite_only: boolean
  created_at: string
  leader_name: string
  member_count: number
  avg_elo: number
  total_wins: number
  clan_rank: number
  members: ClanMember[]
  my_role: 'leader' | 'officer' | 'member' | null
  my_pending: boolean
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock', all: 'All Games' }

export default function ClanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clanId = params.id as string

  const [clan, setClan] = useState<ClanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'roster' | 'matches' | 'leaderboard' | 'settings'>('roster')
  const [actionLoading, setActionLoading] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editInviteOnly, setEditInviteOnly] = useState(false)

  const fetchClan = useCallback(async () => {
    try {
      const res = await fetch(`/api/clans/${clanId}`)
      if (!res.ok) return
      const data = await res.json()
      setClan(data.clan)
      setEditDesc(data.clan.description ?? '')
      setEditInviteOnly(data.clan.invite_only ?? false)
    } finally {
      setLoading(false)
    }
  }, [clanId])

  useEffect(() => { fetchClan() }, [fetchClan])

  async function doAction(action: string, body: Record<string, unknown> = {}) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/clans/${clanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      })
      if (res.ok) await fetchClan()
      else {
        const err = await res.json()
        alert(err.error ?? 'Action failed')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function disbandClan() {
    if (!confirm('Are you sure you want to disband this clan? This cannot be undone.')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/clans/${clanId}`, { method: 'DELETE' })
      if (res.ok) router.push('/clans')
    } finally {
      setActionLoading(false)
    }
  }

  async function saveSettings() {
    await doAction('update', { description: editDesc, invite_only: editInviteOnly })
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-64 rounded-lg bg-space-800 border border-border animate-pulse" />
      </div>
    )
  }

  if (!clan) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-muted mx-auto mb-4" />
        <p className="text-xl text-white font-semibold">Clan not found</p>
      </div>
    )
  }

  const roleIcon = (role: string) => {
    if (role === 'leader') return <Crown className="w-4 h-4 text-yellow-400" />
    if (role === 'officer') return <Star className="w-4 h-4 text-accent-cyan" />
    return null
  }

  const tabs = [
    { key: 'roster', label: 'Roster', icon: Users },
    { key: 'matches', label: 'Matches', icon: Trophy },
    { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    ...(clan.my_role === 'leader' ? [{ key: 'settings', label: 'Settings', icon: Settings }] : []),
  ] as const

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="rounded-xl bg-space-800 border border-border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Logo initial */}
          <div className="w-20 h-20 rounded-xl bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center text-3xl font-orbitron font-bold text-accent-purple shrink-0">
            {clan.name[0].toUpperCase()}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-white">{clan.name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                [{clan.tag}]
              </span>
              {clan.invite_only && (
                <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                  Invite Only
                </span>
              )}
            </div>
            <p className="text-sm text-muted mb-2">{clan.description || 'No description set.'}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
              <span>Leader: <span className="text-white">{clan.leader_name}</span></span>
              <span>Game: <span className="text-white">{GAME_LABELS[clan.game_focus] ?? clan.game_focus}</span></span>
              <span>Region: <span className="text-white">{clan.region}</span></span>
              <span>Created {new Date(clan.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action button */}
          <div className="shrink-0 flex flex-col gap-2">
            {clan.my_role ? (
              clan.my_role !== 'leader' && (
                <button
                  onClick={() => doAction('leave')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" /> Leave Clan
                </button>
              )
            ) : clan.my_pending ? (
              <span className="px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-sm font-medium">
                Application Pending
              </span>
            ) : (
              <button
                onClick={() => doAction('join')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {clan.invite_only ? 'Apply to Join' : 'Join Clan'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          {[
            { label: 'Members', value: clan.member_count },
            { label: 'Avg ELO', value: clan.avg_elo },
            { label: 'Total Wins', value: clan.total_wins },
            { label: 'Clan Rank', value: clan.clan_rank > 0 ? `#${clan.clan_rank}` : 'Unranked' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-orbitron font-bold text-white">{s.value}</p>
              <p className="text-xs text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border pb-px">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-accent-cyan text-white'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'roster' && (
        <div className="rounded-xl bg-space-800 border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">ELO</th>
                <th className="px-4 py-3 text-right">Games</th>
                {(clan.my_role === 'leader' || clan.my_role === 'officer') && (
                  <th className="px-4 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {clan.members.map(m => (
                <tr key={m.player_id} className="border-b border-border/50 hover:bg-space-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-space-700 flex items-center justify-center text-sm font-bold text-white">
                        {m.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-white font-medium">{m.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {roleIcon(m.role)}
                      <span className="text-sm text-muted capitalize">{m.role}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono text-accent-cyan">{m.elo}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-muted">{m.games_played}</td>
                  {(clan.my_role === 'leader' || clan.my_role === 'officer') && (
                    <td className="px-4 py-3 text-right">
                      {m.role !== 'leader' && (
                        <div className="flex items-center justify-end gap-1">
                          {clan.my_role === 'leader' && m.role === 'member' && (
                            <button
                              onClick={() => doAction('promote', { player_id: m.player_id })}
                              disabled={actionLoading}
                              className="p-1.5 rounded hover:bg-accent-cyan/10 text-muted hover:text-accent-cyan transition-colors"
                              title="Promote to Officer"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => doAction('kick', { player_id: m.player_id })}
                            disabled={actionLoading}
                            className="p-1.5 rounded hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
                            title="Kick"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'matches' && (
        <div className="rounded-xl bg-space-800 border border-border p-8 text-center">
          <Trophy className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted">Clan matches coming soon</p>
          <p className="text-xs text-muted/60 mt-1">5v5 clan wars will be available when the tournament system launches.</p>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="rounded-xl bg-space-800 border border-border p-8 text-center">
          <Trophy className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted">Clan leaderboard coming soon</p>
          <p className="text-xs text-muted/60 mt-1">Compete in clan matches to earn a ranking.</p>
        </div>
      )}

      {tab === 'settings' && clan.my_role === 'leader' && (
        <div className="rounded-xl bg-space-800 border border-border p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Description</label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-lg bg-space-900 border border-border text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent-cyan resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditInviteOnly(!editInviteOnly)}
              className={`relative w-11 h-6 rounded-full transition-colors ${editInviteOnly ? 'bg-accent-purple' : 'bg-space-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${editInviteOnly ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-muted">Invite Only</span>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button
              onClick={saveSettings}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              onClick={disbandClan}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Disband Clan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
