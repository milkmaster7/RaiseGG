'use client'

import Link from 'next/link'
import { Trophy, Users, Clock, DollarSign } from 'lucide-react'
import { GAME_CONFIG, type Game } from '@/lib/tournaments'
import { TournamentCountdown } from './TournamentCountdown'

export interface TournamentCardData {
  id: string
  name: string
  game: string
  format: string
  entryFee: number
  prizePool: number
  maxPlayers: number
  registeredCount: number
  startsAt: string
  status: string
}

export function TournamentCard({ tournament: t }: { tournament: TournamentCardData }) {
  const gc = GAME_CONFIG[t.game as Game] ?? GAME_CONFIG.cs2
  const isLive = t.status === 'in_progress' || t.status === 'live'
  const isCompleted = t.status === 'completed'
  const isRegistration = t.status === 'registration' || t.status === 'upcoming'

  return (
    <div className={`card hover:border-accent-cyan/30 transition-all group`}>
      {/* Game badge + status */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${gc.bgColor} ${gc.textColor} ${gc.borderColor} border`}>
          {gc.label}
        </span>
        {isLive && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        )}
        {isCompleted && (
          <span className="text-xs text-muted font-medium">Completed</span>
        )}
      </div>

      {/* Name */}
      <h3 className="font-orbitron text-sm font-bold text-white mb-3 group-hover:text-accent-cyan transition-colors">
        {t.name}
      </h3>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1.5 text-muted">
          <DollarSign className="w-3.5 h-3.5" />
          <span>{t.entryFee === 0 ? 'Free' : `$${t.entryFee} USDC`}</span>
        </div>
        <div className="flex items-center gap-1.5 text-accent-gold">
          <Trophy className="w-3.5 h-3.5" />
          <span>${t.prizePool.toFixed(0)} Pool</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted">
          <Users className="w-3.5 h-3.5" />
          <span>{t.registeredCount}/{t.maxPlayers} players</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted">
          <Clock className="w-3.5 h-3.5" />
          <TournamentCountdown startsAt={t.startsAt} isLive={isLive} isCompleted={isCompleted} />
        </div>
      </div>

      {/* Player fill bar */}
      <div className="w-full h-1.5 rounded-full bg-space-600 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-cyan transition-all"
          style={{ width: `${Math.min(100, (t.registeredCount / t.maxPlayers) * 100)}%` }}
        />
      </div>

      {/* CTA */}
      <Link
        href={`/tournaments/${t.id}`}
        className={`block text-center text-sm font-semibold py-2.5 rounded-lg transition-all ${
          isRegistration
            ? 'btn-primary !py-2.5'
            : 'btn-secondary !py-2.5'
        }`}
      >
        {isRegistration ? 'Register' : isLive ? 'View Bracket' : 'View Results'}
      </Link>
    </div>
  )
}
