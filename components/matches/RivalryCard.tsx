'use client'

import { useState, useEffect } from 'react'
import { Swords, Trophy, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface RivalryData {
  opponent_id: string
  opponent_username: string
  opponent_avatar: string | null
  total_matches: number
  wins: number
  losses: number
  last_played: string
}

interface RivalryCardProps {
  opponentId: string
  opponentUsername: string
  opponentAvatar?: string | null
  currentPlayerId: string
}

export function RivalryCard({ opponentId, opponentUsername, opponentAvatar, currentPlayerId }: RivalryCardProps) {
  const [rivalry, setRivalry] = useState<RivalryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentPlayerId || !opponentId || currentPlayerId === opponentId) {
      setLoading(false)
      return
    }
    fetch(`/api/rivalry?player=${currentPlayerId}&opponent=${opponentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.total_matches > 0) setRivalry(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentPlayerId, opponentId])

  if (loading || !rivalry || rivalry.total_matches === 0) return null

  const winRate = Math.round((rivalry.wins / rivalry.total_matches) * 100)
  const isWinning = rivalry.wins > rivalry.losses
  const isTied = rivalry.wins === rivalry.losses

  return (
    <div className="card border-accent-purple/30 bg-gradient-to-r from-space-800 to-accent-purple/5">
      <div className="flex items-center gap-3 mb-3">
        <Swords className="w-5 h-5 text-accent-purple-glow" />
        <h3 className="font-orbitron text-sm font-bold text-accent-purple-glow uppercase tracking-wider">
          Rivalry
        </h3>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {opponentAvatar && (
            <Image
              src={opponentAvatar}
              alt={opponentUsername}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div>
            <p className="text-sm text-white">
              You&apos;ve played{' '}
              <Link href={`/profile/${opponentUsername}`} className="text-accent-cyan hover:text-accent-cyan-glow transition-colors font-semibold">
                {opponentUsername}
              </Link>{' '}
              <span className="font-orbitron font-bold text-accent-purple-glow">{rivalry.total_matches}</span>{' '}
              {rivalry.total_matches === 1 ? 'time' : 'times'}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs">
                <span className="text-green-400 font-bold">{rivalry.wins}W</span>
                {' - '}
                <span className="text-red-400 font-bold">{rivalry.losses}L</span>
              </span>
              <span className="text-xs text-muted">
                {winRate}% win rate
              </span>
              {isWinning && (
                <span className="badge-green text-[10px]">
                  <TrendingUp className="w-2.5 h-2.5" /> Ahead
                </span>
              )}
              {!isWinning && !isTied && (
                <span className="badge-red text-[10px]">
                  <Trophy className="w-2.5 h-2.5" /> Behind
                </span>
              )}
              {isTied && (
                <span className="badge-cyan text-[10px]">
                  <Swords className="w-2.5 h-2.5" /> Even
                </span>
              )}
            </div>
          </div>
        </div>

        <Link
          href={`/play?opponent=${opponentId}`}
          className="btn-primary text-xs py-1.5 px-4 flex-shrink-0"
        >
          Rematch
        </Link>
      </div>
    </div>
  )
}
