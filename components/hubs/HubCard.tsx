'use client'

import Link from 'next/link'
import { Users, Swords, Gamepad2, MapPin } from 'lucide-react'
import { GAME_LABELS } from '@/lib/hubs'
import type { Game } from '@/types'

type HubCardProps = {
  slug: string
  name: string
  game: Game
  description: string
  region: string
  min_elo: number
  max_elo: number
  member_count: number
  match_count: number
}

const GAME_COLORS: Record<Game, string> = {
  cs2: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10',
  dota2: 'text-red-400 border-red-400/30 bg-red-400/10',
  deadlock: 'text-accent-purple border-accent-purple/30 bg-accent-purple/10',
}

export default function HubCard({ slug, name, game, description, region, min_elo, max_elo, member_count, match_count }: HubCardProps) {
  return (
    <Link
      href={`/hubs/${slug}`}
      className="block rounded-xl bg-space-800 border border-border p-5 hover:border-accent-cyan/40 hover:shadow-[0_0_20px_rgba(0,229,255,0.1)] transition-all group"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-3">
        <div className="w-12 h-12 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-xl font-orbitron font-bold text-accent-cyan shrink-0 group-hover:shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-shadow">
          {name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate group-hover:text-accent-cyan transition-colors">
            {name}
          </h3>
          <p className="text-xs text-muted mt-0.5 line-clamp-2">{description || 'No description'}</p>
        </div>
      </div>

      {/* Game + Region badges */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${GAME_COLORS[game]}`}>
          <Gamepad2 className="w-3 h-3" />
          {GAME_LABELS[game]}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-muted border border-border bg-space-900">
          <MapPin className="w-3 h-3" />
          {region}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted mb-3">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {member_count} members
        </span>
        <span className="flex items-center gap-1">
          <Swords className="w-3.5 h-3.5" />
          {match_count} matches
        </span>
      </div>

      {/* ELO range */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          ELO {min_elo} — {max_elo}
        </span>
        <span className="px-3 py-1 rounded text-xs font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 group-hover:bg-accent-cyan/20 transition-colors">
          View Hub
        </span>
      </div>
    </Link>
  )
}
