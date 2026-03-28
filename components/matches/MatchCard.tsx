'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, Zap, Link2, Lock } from 'lucide-react'
import { useState } from 'react'
import { TierBadge, Badge } from '@/components/ui/Badge'
import { CancelMatchButton } from '@/components/matches/CancelMatchButton'
import { getStakeRarity, RARITY_STYLES } from '@/lib/rarity'
import type { Match } from '@/types'

const GAME_LABELS = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
const STATUS_CONFIG = {
  open:      { label: 'Open',      variant: 'green'  as const },
  locked:    { label: 'Locked',    variant: 'cyan'   as const },
  live:      { label: 'Live',      variant: 'cyan'   as const },
  completed: { label: 'Completed', variant: 'gray'   as const },
  cancelled: { label: 'Cancelled', variant: 'red'    as const },
  disputed:  { label: 'Disputed',  variant: 'red'    as const },
}

interface MatchCardProps {
  match: Match
  showJoin?: boolean
  onJoin?: (match: Match) => void
  currentPlayerId?: string | null
}

export function MatchCard({ match, showJoin = false, onJoin, currentPlayerId }: MatchCardProps) {
  const status = STATUS_CONFIG[match.status]
  const rarity = getStakeRarity(match.stake_amount)
  const rarityStyle = RARITY_STYLES[rarity]
  const [copied, setCopied] = useState(false)

  function copyInviteLink() {
    const url = `${window.location.origin}/play?join=${match.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={`relative card-hover flex items-center justify-between gap-4 border-2 ${rarityStyle.border} shadow-lg ${rarityStyle.glow}`}>
      {/* Rarity badge — top-right corner */}
      <span
        className="absolute top-1.5 right-2 text-[10px] font-orbitron font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{ color: rarityStyle.color, background: `${rarityStyle.color}18`, border: `1px solid ${rarityStyle.color}40` }}
      >
        {rarityStyle.label}
      </span>

      {/* Game + format + region */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-shrink-0">
          <Badge variant="cyan">{GAME_LABELS[match.game]}</Badge>
        </div>
        <Badge variant="gray">{match.format}</Badge>
        {match.region && (
          <span className="text-[10px] font-mono text-muted border border-border rounded px-1.5 py-0.5 flex-shrink-0">
            {match.region}
          </span>
        )}
        {match.has_password && (
          <Lock className="w-3 h-3 text-muted flex-shrink-0" title="Password protected" />
        )}
      </div>

      {/* Players */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {match.player_a && (
          <div className="flex items-center gap-2 min-w-0">
            {match.player_a.avatar_url && (
              <Image
                src={match.player_a.avatar_url}
                alt={match.player_a.username}
                width={24}
                height={24}
                className="rounded-full flex-shrink-0"
              />
            )}
            <Link
              href={`/profile/${match.player_a.username}`}
              className="text-sm text-white hover:text-accent-cyan transition-colors truncate"
            >
              {match.player_a.username}
            </Link>
            <TierBadge elo={match.player_a[`${match.game}_elo` as keyof typeof match.player_a] as number ?? 1000} />
          </div>
        )}

        {match.player_b ? (
          <>
            <span className="text-muted text-xs flex-shrink-0">vs</span>
            <div className="flex items-center gap-2 min-w-0">
              {match.player_b.avatar_url && (
                <Image
                  src={match.player_b.avatar_url}
                  alt={match.player_b.username}
                  width={24}
                  height={24}
                  className="rounded-full flex-shrink-0"
                />
              )}
              <Link
                href={`/profile/${match.player_b.username}`}
                className="text-sm text-white hover:text-accent-cyan transition-colors truncate"
              >
                {match.player_b.username}
              </Link>
            </div>
          </>
        ) : (
          <span className="text-muted text-xs italic">Waiting for opponent</span>
        )}
      </div>

      {/* Stake */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Zap className="w-3.5 h-3.5 text-accent-cyan" />
        <span className="font-orbitron font-bold text-sm text-accent-cyan">
          ${match.stake_amount.toFixed(2)}
        </span>
        <span className="text-xs text-muted uppercase">{match.currency ?? 'usdc'}</span>
      </div>

      {/* Status + action */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={status.variant}>{status.label}</Badge>
        {showJoin && match.status === 'open' && (
          <>
            {currentPlayerId === match.player_a_id ? (
              <CancelMatchButton matchId={match.id} />
            ) : (
              <button
                onClick={() => onJoin?.(match)}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Join
              </button>
            )}
            <button
              onClick={copyInviteLink}
              title="Copy invite link"
              className="flex items-center gap-1 px-2 py-1.5 rounded border border-border bg-space-800 hover:border-accent-cyan/50 text-muted hover:text-accent-cyan transition-all text-xs"
            >
              <Link2 className="w-3 h-3" />
              {copied ? 'Copied!' : 'Invite'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
