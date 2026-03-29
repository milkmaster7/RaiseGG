'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getRoundName, type Game, GAME_CONFIG } from '@/lib/tournaments'

interface BracketMatch {
  id: string
  round: number
  position: number
  player_a_id: string | null
  player_b_id: string | null
  score_a: number | null
  score_b: number | null
  winner_id: string | null
  player_a?: { username: string; avatar_url: string | null } | null
  player_b?: { username: string; avatar_url: string | null } | null
}

interface Props {
  tournamentId: string
  game: Game
  totalRounds: number
  initialMatches: BracketMatch[]
}

export function BracketView({ tournamentId, game, totalRounds, initialMatches }: Props) {
  const [matches, setMatches] = useState<BracketMatch[]>(initialMatches)
  const gc = GAME_CONFIG[game]

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`bracket-${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${tournamentId}` },
        async () => {
          // Refetch all matches on any change
          const res = await fetch(`/api/tournaments/${tournamentId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.matches) setMatches(data.matches)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId])

  // Group by round
  const rounds: BracketMatch[][] = []
  for (let r = 0; r < totalRounds; r++) {
    rounds.push(
      matches
        .filter(m => m.round === r)
        .sort((a, b) => a.position - b.position)
    )
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-fit">
        {rounds.map((roundMatches, roundIdx) => (
          <div key={roundIdx} className="flex flex-col min-w-[220px]">
            {/* Round header */}
            <div className={`text-center text-xs font-bold font-orbitron mb-3 ${gc.textColor}`}>
              {getRoundName(roundIdx, totalRounds)}
            </div>

            {/* Matches in this round */}
            <div
              className="flex flex-col justify-around flex-1 gap-2"
              style={{ minHeight: roundIdx === 0 ? undefined : `${roundMatches.length * 100}px` }}
            >
              {roundMatches.map((match) => (
                <MatchBox key={match.id} match={match} gameColor={gc.color} />
              ))}
              {roundMatches.length === 0 && (
                <div className="flex items-center justify-center h-20 text-muted text-xs">
                  TBD
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MatchBox({ match, gameColor }: { match: BracketMatch; gameColor: string }) {
  const hasWinner = match.winner_id !== null

  return (
    <div className="bg-space-800 border border-border rounded-lg overflow-hidden">
      <PlayerSlot
        name={match.player_a?.username ?? null}
        playerId={match.player_a_id}
        score={match.score_a}
        isWinner={hasWinner && match.winner_id === match.player_a_id}
        isLoser={hasWinner && match.winner_id !== match.player_a_id}
        gameColor={gameColor}
      />
      <div className="border-t border-border/50" />
      <PlayerSlot
        name={match.player_b?.username ?? null}
        playerId={match.player_b_id}
        score={match.score_b}
        isWinner={hasWinner && match.winner_id === match.player_b_id}
        isLoser={hasWinner && match.winner_id !== match.player_b_id}
        gameColor={gameColor}
      />
    </div>
  )
}

function PlayerSlot({
  name,
  playerId,
  score,
  isWinner,
  isLoser,
  gameColor,
}: {
  name: string | null
  playerId: string | null
  score: number | null
  isWinner: boolean
  isLoser: boolean
  gameColor: string
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 text-xs transition-colors ${
        isWinner
          ? 'bg-green-500/10'
          : isLoser
          ? 'opacity-50'
          : ''
      }`}
    >
      <span className={`truncate max-w-[140px] ${isWinner ? 'text-white font-bold' : name ? 'text-gray-300' : 'text-gray-600'}`}>
        {name ?? (playerId ? 'Unknown' : 'TBD')}
      </span>
      <span
        className="font-orbitron font-bold ml-2"
        style={isWinner ? { color: gameColor } : undefined}
      >
        {score !== null ? score : '-'}
      </span>
    </div>
  )
}
