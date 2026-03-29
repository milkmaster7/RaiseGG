'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Shield, Gamepad2 } from 'lucide-react'

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

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock', all: 'All Games' }

export default function ClanCard({ clan, onJoined }: { clan: Clan; onJoined?: () => void }) {
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  async function handleJoin(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setJoining(true)
    try {
      const res = await fetch(`/api/clans/${clan.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      })
      if (res.ok) {
        setJoined(true)
        onJoined?.()
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed to join')
      }
    } finally {
      setJoining(false)
    }
  }

  return (
    <Link
      href={`/clans/${clan.id}`}
      className="block rounded-xl bg-space-800 border border-border p-5 hover:border-accent-purple/40 hover:shadow-[0_0_20px_rgba(123,97,255,0.1)] transition-all group"
    >
      <div className="flex items-start gap-4 mb-4">
        {/* Logo initial */}
        <div className="w-12 h-12 rounded-lg bg-accent-purple/20 border border-accent-purple/30 flex items-center justify-center text-xl font-orbitron font-bold text-accent-purple shrink-0 group-hover:shadow-[0_0_12px_rgba(123,97,255,0.3)] transition-shadow">
          {clan.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white truncate">{clan.name}</h3>
            <span className="text-xs text-accent-purple font-bold">[{clan.tag}]</span>
          </div>
          <p className="text-xs text-muted mt-0.5 line-clamp-1">{clan.description || 'No description'}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted mb-4">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {clan.member_count} members
        </span>
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" />
          {clan.avg_elo} ELO
        </span>
        <span className="flex items-center gap-1">
          <Gamepad2 className="w-3.5 h-3.5" />
          {GAME_LABELS[clan.game_focus] ?? clan.game_focus}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{clan.region}</span>
        {joined ? (
          <span className="px-3 py-1.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
            {clan.invite_only ? 'Applied!' : 'Joined!'}
          </span>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
              clan.invite_only
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20'
                : 'bg-accent-purple/10 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/20'
            }`}
          >
            {clan.invite_only ? 'Apply' : 'Join'}
          </button>
        )}
      </div>
    </Link>
  )
}
