'use client'

import { useState, useEffect, useCallback } from 'react'
import { Swords, Shield, Trophy, Clock, AlertCircle } from 'lucide-react'
import { WAR_FORMAT, MIN_MEMBERS } from '@/lib/clan-wars'

type ClanWar = {
  id: string
  clan_a_id: string
  clan_b_id: string
  clan_a_name: string
  clan_a_tag: string
  clan_b_name: string
  clan_b_tag: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  winner_clan_id: string | null
  score_a: number
  score_b: number
  scheduled_at: string
  completed_at: string | null
}

interface ClanWarsProps {
  clanId: string
  memberCount: number
  myRole: 'leader' | 'officer' | 'member' | null
}

export default function ClanWars({ clanId, memberCount, myRole }: ClanWarsProps) {
  const [wars, setWars] = useState<ClanWar[]>([])
  const [registered, setRegistered] = useState(false)
  const [weekStart, setWeekStart] = useState('')
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  const fetchWars = useCallback(async () => {
    try {
      const res = await fetch('/api/clan-wars')
      if (!res.ok) return
      const data = await res.json()
      setWars(data.wars ?? [])
      setRegistered(data.registered ?? false)
      setWeekStart(data.weekStart ?? '')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWars()
  }, [fetchWars])

  async function registerForWar() {
    setRegistering(true)
    setError('')
    try {
      const res = await fetch('/api/clan-wars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        setRegistered(true)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to register')
      }
    } finally {
      setRegistering(false)
    }
  }

  const canRegister = (myRole === 'leader' || myRole === 'officer') && memberCount >= MIN_MEMBERS
  const upcoming = wars.filter(w => w.status === 'scheduled')
  const live = wars.filter(w => w.status === 'live')
  const past = wars.filter(w => w.status === 'completed' || w.status === 'cancelled')

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      live: 'bg-green-500/10 text-green-400 border-green-500/30',
      completed: 'bg-muted/10 text-muted border-border',
      cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[status] ?? styles.completed}`}>
        {status}
      </span>
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return <div className="h-48 rounded-lg bg-space-800 border border-border animate-pulse" />
  }

  return (
    <div className="space-y-6">
      {/* Registration card */}
      <div className="rounded-xl bg-space-800 border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Swords className="w-5 h-5 text-accent-cyan" />
          <h3 className="text-lg font-orbitron font-bold text-white">Weekly Clan Wars</h3>
        </div>
        <p className="text-sm text-muted mb-4">
          {WAR_FORMAT} every Saturday at 18:00 UTC. Register your clan to be matched against opponents of similar skill.
        </p>

        {memberCount < MIN_MEMBERS ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Your clan needs {MIN_MEMBERS}+ members to participate ({memberCount} currently)
          </div>
        ) : registered ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
            <Shield className="w-4 h-4 shrink-0" />
            Registered for this week&apos;s war (week of {weekStart})
          </div>
        ) : canRegister ? (
          <button
            onClick={registerForWar}
            disabled={registering}
            className="px-5 py-2.5 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {registering ? 'Registering...' : 'Register for This Week'}
          </button>
        ) : myRole ? (
          <p className="text-sm text-muted">Only leaders and officers can register for clan wars.</p>
        ) : (
          <p className="text-sm text-muted">Join this clan to participate in wars.</p>
        )}

        {error && (
          <p className="text-sm text-red-400 mt-3">{error}</p>
        )}
      </div>

      {/* Live wars */}
      {live.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Wars
          </h3>
          <div className="space-y-3">
            {live.map(w => (
              <WarCard key={w.id} war={w} clanId={clanId} formatDate={formatDate} statusBadge={statusBadge} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming wars */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted" />
            Upcoming
          </h3>
          <div className="space-y-3">
            {upcoming.map(w => (
              <WarCard key={w.id} war={w} clanId={clanId} formatDate={formatDate} statusBadge={statusBadge} />
            ))}
          </div>
        </div>
      )}

      {/* Past wars */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-muted" />
            Past Wars
          </h3>
          <div className="space-y-3">
            {past.map(w => (
              <WarCard key={w.id} war={w} clanId={clanId} formatDate={formatDate} statusBadge={statusBadge} />
            ))}
          </div>
        </div>
      )}

      {wars.length === 0 && (
        <div className="rounded-xl bg-space-800 border border-border p-8 text-center">
          <Swords className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">No war history yet</p>
          <p className="text-xs text-muted/60 mt-1">Register for this week&apos;s war to get started!</p>
        </div>
      )}
    </div>
  )
}

function WarCard({
  war,
  clanId,
  formatDate,
  statusBadge,
}: {
  war: ClanWar
  clanId: string
  formatDate: (iso: string) => string
  statusBadge: (status: string) => React.ReactNode
}) {
  const isA = war.clan_a_id === clanId
  const won = war.winner_clan_id === clanId

  return (
    <div className="rounded-lg bg-space-700/40 border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted">{formatDate(war.scheduled_at)}</span>
        {statusBadge(war.status)}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <p className={`text-sm font-bold ${isA ? 'text-accent-cyan' : 'text-white'}`}>
            [{war.clan_a_tag}] {war.clan_a_name}
          </p>
        </div>
        <div className="px-4">
          {war.status === 'completed' ? (
            <span className="text-lg font-orbitron font-bold text-white">
              {war.score_a} - {war.score_b}
            </span>
          ) : (
            <span className="text-sm font-bold text-muted">VS</span>
          )}
        </div>
        <div className="text-center flex-1">
          <p className={`text-sm font-bold ${!isA ? 'text-accent-cyan' : 'text-white'}`}>
            [{war.clan_b_tag}] {war.clan_b_name}
          </p>
        </div>
      </div>
      {war.status === 'completed' && (
        <p className={`text-xs text-center mt-2 font-medium ${won ? 'text-green-400' : 'text-red-400'}`}>
          {won ? 'Victory!' : 'Defeat'}
        </p>
      )}
    </div>
  )
}
