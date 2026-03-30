'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Swords, Trophy, BookOpen, Loader2, LogIn, LogOut, Gamepad2, MapPin, Crown } from 'lucide-react'
import { GAME_LABELS } from '@/lib/hubs'
import type { Game } from '@/types'

type Member = {
  hub_id: string
  player_id: string
  hub_elo: number
  wins: number
  losses: number
  joined_at: string
  username: string
  avatar_url: string | null
  country: string | null
}

type HubData = {
  id: string
  slug: string
  name: string
  game: Game
  description: string
  rules: string
  region: string
  min_elo: number
  max_elo: number
  owner_id: string
  member_count: number
  match_count: number
  is_active: boolean
  created_at: string
}

type MatchData = {
  id: string
  game: string
  format: string
  status: string
  stake_amount: number
  stake_currency: string
  creator_name: string
  opponent_name: string | null
  winner_name: string | null
  map: string | null
  created_at: string
  resolved_at: string | null
}

type Tab = 'leaderboard' | 'matches' | 'rules' | 'members'

const STATUS_COLORS: Record<string, string> = {
  open: 'text-green-400 bg-green-400/10 border-green-400/30',
  locked: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  live: 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30',
  completed: 'text-muted bg-space-800 border-border',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/30',
  disputed: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
}

export default function HubDetailClient({ slug }: { slug: string }) {
  const [hub, setHub] = useState<HubData | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [leaderboard, setLeaderboard] = useState<Member[]>([])
  const [matches, setMatches] = useState<MatchData[]>([])
  const [tab, setTab] = useState<Tab>('leaderboard')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [isMember, setIsMember] = useState(false)

  const fetchHub = useCallback(async () => {
    try {
      const res = await fetch(`/api/hubs/${slug}`)
      if (!res.ok) return
      const data = await res.json()
      setHub(data.hub)
      setMembers(data.members ?? [])
      setLeaderboard(data.leaderboard ?? [])
    } finally {
      setLoading(false)
    }
  }, [slug])

  const fetchMatches = useCallback(async () => {
    const res = await fetch(`/api/hubs/${slug}/matches`)
    if (!res.ok) return
    const data = await res.json()
    setMatches(data.matches ?? [])
  }, [slug])

  useEffect(() => {
    fetchHub()
  }, [fetchHub])

  useEffect(() => {
    if (tab === 'matches' && matches.length === 0) {
      fetchMatches()
    }
  }, [tab, matches.length, fetchMatches])

  async function handleJoinLeave() {
    setJoining(true)
    try {
      const res = await fetch(`/api/hubs/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isMember ? 'leave' : 'join' }),
      })
      if (res.ok) {
        setIsMember(!isMember)
        fetchHub()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Action failed')
      }
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent-cyan animate-spin" />
      </div>
    )
  }

  if (!hub) {
    return (
      <div className="text-center py-20">
        <p className="text-muted text-sm">Hub not found.</p>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: typeof Trophy }[] = [
    { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { key: 'matches', label: 'Matches', icon: Swords },
    { key: 'rules', label: 'Rules', icon: BookOpen },
    { key: 'members', label: 'Members', icon: Users },
  ]

  return (
    <div>
      {/* Hub banner */}
      <div className="rounded-xl bg-space-800 border border-border p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-2xl font-orbitron font-bold text-accent-cyan shrink-0 shadow-glow-sm">
            {hub.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-orbitron text-2xl font-black text-white mb-1">{hub.name}</h1>
            <p className="text-sm text-muted mb-3">{hub.description}</p>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-accent-cyan border border-accent-cyan/30 bg-accent-cyan/10">
                <Gamepad2 className="w-3 h-3" />
                {GAME_LABELS[hub.game]}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-muted border border-border bg-space-900">
                <MapPin className="w-3 h-3" />
                {hub.region}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Users className="w-3.5 h-3.5" />
                {hub.member_count} members
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Swords className="w-3.5 h-3.5" />
                {hub.match_count} matches
              </span>
              <span className="text-xs text-muted">
                ELO {hub.min_elo} — {hub.max_elo}
              </span>
            </div>
          </div>

          {/* Join / Leave button */}
          <button
            onClick={handleJoinLeave}
            disabled={joining}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
              isMember
                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                : 'bg-accent-cyan text-space-950 font-bold hover:bg-accent-cyan/80 shadow-glow-sm'
            }`}
          >
            {isMember ? (
              <>
                <LogOut className="w-4 h-4" />
                Leave
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Join Hub
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-accent-cyan text-accent-cyan'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} ownerId={hub.owner_id} />}
      {tab === 'matches' && <MatchesTab matches={matches} />}
      {tab === 'rules' && <RulesTab rules={hub.rules} />}
      {tab === 'members' && <MembersTab members={members} ownerId={hub.owner_id} />}
    </div>
  )
}

function LeaderboardTab({ leaderboard, ownerId }: { leaderboard: Member[]; ownerId: string }) {
  if (leaderboard.length === 0) {
    return <p className="text-muted text-sm text-center py-10">No players yet. Join and start playing!</p>
  }

  return (
    <div className="rounded-xl bg-space-800 border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted uppercase tracking-wide">
            <th className="text-left px-4 py-3 w-12">#</th>
            <th className="text-left px-4 py-3">Player</th>
            <th className="text-right px-4 py-3">ELO</th>
            <th className="text-right px-4 py-3">W</th>
            <th className="text-right px-4 py-3">L</th>
            <th className="text-right px-4 py-3">Win%</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((m, i) => {
            const total = m.wins + m.losses
            const winRate = total > 0 ? Math.round((m.wins / total) * 100) : 0
            const isOwner = m.player_id === ownerId
            return (
              <tr key={m.player_id} className="border-b border-border/50 hover:bg-space-900/50 transition-colors">
                <td className="px-4 py-3 text-muted font-medium">
                  {i < 3 ? (
                    <span className={i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : 'text-amber-600'}>
                      {i + 1}
                    </span>
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-space-900 border border-border flex items-center justify-center text-xs text-muted">
                        {m.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-white font-medium">{m.username}</span>
                    {isOwner && <Crown className="w-3.5 h-3.5 text-yellow-400" aria-label="Hub Owner" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-accent-cyan">{m.hub_elo}</td>
                <td className="px-4 py-3 text-right text-green-400">{m.wins}</td>
                <td className="px-4 py-3 text-right text-red-400">{m.losses}</td>
                <td className="px-4 py-3 text-right text-muted">{winRate}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MatchesTab({ matches }: { matches: MatchData[] }) {
  if (matches.length === 0) {
    return <p className="text-muted text-sm text-center py-10">No matches played in this hub yet.</p>
  }

  return (
    <div className="space-y-2">
      {matches.map(m => (
        <div key={m.id} className="rounded-lg bg-space-800 border border-border p-4 flex items-center gap-4">
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[m.status] ?? STATUS_COLORS.completed}`}>
            {m.status}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white">
              <span className="font-medium">{m.creator_name}</span>
              <span className="text-muted mx-1">vs</span>
              <span className="font-medium">{m.opponent_name ?? '...'}</span>
            </div>
            <div className="text-xs text-muted mt-0.5">
              {m.format} &middot; {m.stake_amount} {m.stake_currency?.toUpperCase()}
              {m.map && <> &middot; {m.map}</>}
            </div>
          </div>
          {m.winner_name && (
            <span className="text-xs text-green-400 font-medium">
              Winner: {m.winner_name}
            </span>
          )}
          <span className="text-xs text-muted whitespace-nowrap">
            {new Date(m.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function RulesTab({ rules }: { rules: string }) {
  if (!rules.trim()) {
    return <p className="text-muted text-sm text-center py-10">No rules specified for this hub.</p>
  }

  return (
    <div className="rounded-xl bg-space-800 border border-border p-6">
      <h3 className="font-orbitron text-lg font-bold text-white mb-4">Hub Rules</h3>
      <div className="prose prose-sm prose-invert max-w-none">
        {rules.split('\n').map((line, i) => (
          <p key={i} className="text-sm text-muted mb-2 last:mb-0">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

function MembersTab({ members, ownerId }: { members: Member[]; ownerId: string }) {
  if (members.length === 0) {
    return <p className="text-muted text-sm text-center py-10">No members yet.</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map(m => {
        const total = m.wins + m.losses
        const winRate = total > 0 ? Math.round((m.wins / total) * 100) : 0
        const isOwner = m.player_id === ownerId
        return (
          <div key={m.player_id} className="rounded-lg bg-space-800 border border-border p-4 flex items-center gap-3">
            {m.avatar_url ? (
              <img src={m.avatar_url} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-space-900 border border-border flex items-center justify-center text-sm text-muted font-bold">
                {m.username[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-white font-medium truncate">{m.username}</span>
                {isOwner && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" aria-label="Owner" />}
              </div>
              <div className="text-xs text-muted mt-0.5">
                <span className="text-accent-cyan font-mono">{m.hub_elo}</span>
                {' '}&middot; {m.wins}W {m.losses}L ({winRate}%)
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
