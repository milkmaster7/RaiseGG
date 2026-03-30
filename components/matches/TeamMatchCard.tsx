'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Zap, Users, Lock, Link2, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge, TierBadge } from '@/components/ui/Badge'
import { MatchTimer } from '@/components/matches/MatchTimer'
import { getStakeRarity, RARITY_STYLES } from '@/lib/rarity'
import type { Match, Player } from '@/types'

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
const MATCH_TYPE_SIZES: Record<string, number> = { '1v1': 1, '2v2': 2, '5v5': 5 }

const STATUS_CONFIG = {
  open:      { label: 'Open',      variant: 'green'  as const },
  locked:    { label: 'Locked',    variant: 'cyan'   as const },
  live:      { label: 'Live',      variant: 'cyan'   as const },
  completed: { label: 'Completed', variant: 'gray'   as const },
  cancelled: { label: 'Cancelled', variant: 'red'    as const },
  disputed:  { label: 'Disputed',  variant: 'red'    as const },
}

interface TeamMatchCardProps {
  match: Match
  currentPlayerId?: string | null
  onJoinTeam?: (match: Match, team: 'a' | 'b') => void
  teamPlayers?: {
    teamA: (Player | null)[]
    teamB: (Player | null)[]
  }
}

function PlayerSlot({ player, game }: { player: Player | null; game: string }) {
  if (!player) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="w-6 h-6 rounded-full bg-space-700 border border-border border-dashed flex items-center justify-center">
          <span className="text-muted text-[10px]">?</span>
        </div>
        <span className="text-xs text-muted italic">Open slot</span>
      </div>
    )
  }

  const eloKey = `${game}_elo` as keyof Player
  const elo = (player[eloKey] as number) ?? 1000

  return (
    <div className="flex items-center gap-2 py-1">
      {player.avatar_url ? (
        <Image
          src={player.avatar_url}
          alt={player.username}
          width={24}
          height={24}
          className="rounded-full flex-shrink-0"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-space-700 border border-accent-cyan/30 flex items-center justify-center">
          <span className="text-accent-cyan text-[10px] font-bold">{player.username[0]?.toUpperCase()}</span>
        </div>
      )}
      <Link
        href={`/profile/${player.username}`}
        className="text-xs text-white hover:text-accent-cyan transition-colors truncate"
      >
        {player.username}
      </Link>
      <TierBadge elo={elo} />
    </div>
  )
}

export function TeamMatchCard({ match, currentPlayerId, onJoinTeam, teamPlayers }: TeamMatchCardProps) {
  const status = STATUS_CONFIG[match.status]
  const rarity = getStakeRarity(match.stake_amount)
  const rarityStyle = RARITY_STYLES[rarity]
  const [copied, setCopied] = useState(false)

  const matchType = match.match_type ?? '5v5'
  const teamSize = MATCH_TYPE_SIZES[matchType] ?? 5
  const teamAPlayers = match.team_a_players ?? []
  const teamBPlayers = match.team_b_players ?? []
  const teamAFilled = teamAPlayers.length
  const teamBFilled = teamBPlayers.length

  const isInTeamA = currentPlayerId ? teamAPlayers.includes(currentPlayerId) : false
  const isInTeamB = currentPlayerId ? teamBPlayers.includes(currentPlayerId) : false
  const alreadyJoined = isInTeamA || isInTeamB
  const teamAFull = teamAFilled >= teamSize
  const teamBFull = teamBFilled >= teamSize

  const totalPot = match.stake_amount * teamSize * 2
  const winnerPayout = totalPot * 0.9

  // Build player slot arrays — fill with resolved players or null for empty slots
  const teamASlotsData = teamPlayers?.teamA ?? Array.from({ length: teamSize }, (_, i) =>
    i < teamAFilled ? null : null
  )
  const teamBSlotsData = teamPlayers?.teamB ?? Array.from({ length: teamSize }, (_, i) =>
    i < teamBFilled ? null : null
  )

  // Pad to teamSize
  const teamASlots = [...teamASlotsData]
  while (teamASlots.length < teamSize) teamASlots.push(null)
  const teamBSlots = [...teamBSlotsData]
  while (teamBSlots.length < teamSize) teamBSlots.push(null)

  function copyInviteLink() {
    const url = `${window.location.origin}/play?join=${match.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={`relative card border-2 ${rarityStyle.border} shadow-lg ${rarityStyle.glow}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="cyan">{GAME_LABELS[match.game] ?? match.game}</Badge>
          <Badge variant="gray">{matchType}</Badge>
          <Badge variant={status.variant}>{status.label}</Badge>
          {match.has_password && <Lock className="w-3 h-3 text-muted" />}
        </div>
        <div className="flex items-center gap-2">
          <MatchTimer match={match} />
          <span
            className="text-[10px] font-orbitron font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: rarityStyle.color, background: `${rarityStyle.color}18`, border: `1px solid ${rarityStyle.color}40` }}
          >
            {rarityStyle.label}
          </span>
        </div>
      </div>

      {/* Stake info */}
      <div className="flex items-center justify-center gap-3 mb-4 py-2 bg-space-800/50 rounded border border-border">
        <Zap className="w-4 h-4 text-accent-cyan" />
        <span className="text-xs text-muted">Per player:</span>
        <span className="font-orbitron font-bold text-accent-cyan">${match.stake_amount.toFixed(2)}</span>
        <span className="text-muted text-xs">|</span>
        <span className="text-xs text-muted">Pot:</span>
        <span className="font-orbitron font-bold text-green-400">${totalPot.toFixed(2)}</span>
        <span className="text-xs text-muted uppercase">{match.currency ?? 'usdc'}</span>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        {/* Team A */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="text-xs font-semibold text-accent-cyan">
                {match.team_a_name || 'Team A'}
              </span>
            </div>
            <span className="text-[10px] text-muted">{teamAFilled}/{teamSize}</span>
          </div>
          <div className="space-y-0.5 pl-1 border-l-2 border-accent-cyan/20">
            {teamASlots.map((player, i) => (
              <PlayerSlot key={`a-${i}`} player={player} game={match.game} />
            ))}
          </div>
          {match.status === 'open' && !alreadyJoined && !teamAFull && onJoinTeam && (
            <button
              onClick={() => onJoinTeam(match, 'a')}
              className="w-full text-xs py-1.5 rounded border border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan hover:bg-accent-cyan/15 transition-all"
            >
              Join Team A
            </button>
          )}
        </div>

        {/* Team B */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-accent-purple" />
              <span className="text-xs font-semibold text-accent-purple">
                {match.team_b_name || 'Team B'}
              </span>
            </div>
            <span className="text-[10px] text-muted">{teamBFilled}/{teamSize}</span>
          </div>
          <div className="space-y-0.5 pl-1 border-l-2 border-accent-purple/20">
            {teamBSlots.map((player, i) => (
              <PlayerSlot key={`b-${i}`} player={player} game={match.game} />
            ))}
          </div>
          {match.status === 'open' && !alreadyJoined && !teamBFull && onJoinTeam && (
            <button
              onClick={() => onJoinTeam(match, 'b')}
              className="w-full text-xs py-1.5 rounded border border-accent-purple/30 bg-accent-purple/5 text-accent-purple hover:bg-accent-purple/15 transition-all"
            >
              Join Team B
            </button>
          )}
        </div>
      </div>

      {/* Footer: winner payout + invite link */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <span className="text-[10px] text-muted">
          Winner team splits <span className="text-green-400 font-semibold">${winnerPayout.toFixed(2)}</span>
        </span>
        <button
          onClick={copyInviteLink}
          className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-space-800 hover:border-accent-cyan/50 text-muted hover:text-accent-cyan transition-all text-xs"
        >
          {copied ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Link2 className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Invite'}
        </button>
      </div>
    </div>
  )
}
