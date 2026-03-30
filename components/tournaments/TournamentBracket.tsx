'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getRoundName, type Game, GAME_CONFIG } from '@/lib/tournaments'
import { Trophy } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

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
  bracketSize: number
  initialMatches: BracketMatch[]
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TournamentBracket({ tournamentId, game, totalRounds, bracketSize, initialMatches }: Props) {
  const [matches, setMatches] = useState<BracketMatch[]>(initialMatches)
  const gc = GAME_CONFIG[game]

  // Real-time updates
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`bracket-visual-${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${tournamentId}` },
        async () => {
          try {
            const res = await fetch(`/api/tournaments/${tournamentId}`)
            if (res.ok) {
              const data = await res.json()
              if (data.matches) setMatches(data.matches)
            }
          } catch (_) {
            // silently ignore fetch errors
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId])

  // Group matches by round
  const rounds: BracketMatch[][] = []
  for (let r = 0; r < totalRounds; r++) {
    rounds.push(
      matches
        .filter(m => m.round === r)
        .sort((a, b) => a.position - b.position)
    )
  }

  // Fill empty slots for rounds without matches yet
  for (let r = 0; r < totalRounds; r++) {
    const expectedCount = bracketSize / Math.pow(2, r + 1)
    if (rounds[r].length < expectedCount) {
      const existing = rounds[r]
      const filled: BracketMatch[] = []
      for (let p = 0; p < expectedCount; p++) {
        const found = existing.find(m => m.position === p)
        if (found) {
          filled.push(found)
        } else {
          filled.push({
            id: `placeholder-${r}-${p}`,
            round: r,
            position: p,
            player_a_id: null,
            player_b_id: null,
            score_a: null,
            score_b: null,
            winner_id: null,
            player_a: null,
            player_b: null,
          })
        }
      }
      rounds[r] = filled
    }
  }

  // Find current round (first round with unfinished matches)
  const currentRound = rounds.findIndex(roundMatches =>
    roundMatches.some(m => m.winner_id === null && (m.player_a_id !== null || m.player_b_id !== null))
  )

  // Find champion
  const finalMatch = rounds[totalRounds - 1]?.[0]
  const champion = finalMatch?.winner_id
    ? (finalMatch.winner_id === finalMatch.player_a_id ? finalMatch.player_a : finalMatch.player_b)
    : null

  return (
    <div className="space-y-4">
      {/* Champion banner */}
      {champion && (
        <div className="flex items-center justify-center gap-3 py-3 rounded-lg bg-accent-gold/10 border border-accent-gold/30">
          <Trophy className="w-5 h-5 text-accent-gold" />
          <span className="font-orbitron text-sm font-bold text-accent-gold">
            Champion: {champion.username}
          </span>
          <Trophy className="w-5 h-5 text-accent-gold" />
        </div>
      )}

      {/* Bracket */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div
          className="bracket-container"
          style={{
            display: 'flex',
            gap: 0,
            minWidth: `${totalRounds * 260}px`,
          }}
        >
          {rounds.map((roundMatches, roundIdx) => {
            const isCurrentRound = roundIdx === currentRound
            const roundName = getRoundName(roundIdx, totalRounds)
            // Each successive round's match cards need more vertical spacing
            // to align with the connector lines
            const matchSpacing = Math.pow(2, roundIdx)

            return (
              <div
                key={roundIdx}
                className="flex flex-col"
                style={{ minWidth: '240px', flex: '0 0 240px' }}
              >
                {/* Round header */}
                <div
                  className={`text-center text-xs font-bold font-orbitron mb-4 pb-2 border-b ${
                    isCurrentRound
                      ? `${gc.textColor} border-current`
                      : 'text-muted border-border'
                  }`}
                >
                  {roundName}
                  {isCurrentRound && (
                    <span className="ml-2 inline-flex w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  )}
                </div>

                {/* Match cards with connectors */}
                <div className="flex flex-col justify-around flex-1 relative">
                  {roundMatches.map((match, matchIdx) => {
                    const isPlaceholder = match.id.startsWith('placeholder-')
                    return (
                      <div
                        key={match.id}
                        className="flex items-center"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {/* Connector line from previous round */}
                        {roundIdx > 0 && (
                          <div
                            className="w-5 flex-shrink-0"
                            style={{
                              borderTop: '2px solid #2a2d4f',
                            }}
                          />
                        )}

                        {/* Match card */}
                        <div className="flex-1 min-w-0">
                          <MatchCard
                            match={match}
                            gameColor={gc.color}
                            isPlaceholder={isPlaceholder}
                            isFinal={roundIdx === totalRounds - 1}
                          />
                        </div>

                        {/* Connector line to next round */}
                        {roundIdx < totalRounds - 1 && (
                          <div className="w-5 flex-shrink-0 relative h-full">
                            {/* Horizontal line out */}
                            <div
                              className="absolute top-1/2"
                              style={{
                                left: 0,
                                right: 0,
                                borderTop: '2px solid #2a2d4f',
                              }}
                            />
                            {/* Vertical connector */}
                            {matchIdx % 2 === 0 ? (
                              <div
                                className="absolute"
                                style={{
                                  right: 0,
                                  top: '50%',
                                  bottom: 0,
                                  borderRight: '2px solid #2a2d4f',
                                }}
                              />
                            ) : (
                              <div
                                className="absolute"
                                style={{
                                  right: 0,
                                  top: 0,
                                  bottom: '50%',
                                  borderRight: '2px solid #2a2d4f',
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Match Card ─────────────────────────────────────────────────────────────

function MatchCard({
  match,
  gameColor,
  isPlaceholder,
  isFinal,
}: {
  match: BracketMatch
  gameColor: string
  isPlaceholder: boolean
  isFinal: boolean
}) {
  const hasWinner = match.winner_id !== null

  return (
    <div
      className={`rounded-lg overflow-hidden my-1 transition-all ${
        isFinal && hasWinner
          ? 'border-2 border-accent-gold/50 shadow-[0_0_12px_rgba(255,200,0,0.2)]'
          : isPlaceholder
          ? 'border border-border/30 opacity-40'
          : hasWinner
          ? 'border border-border/80'
          : 'border border-border'
      }`}
    >
      <PlayerRow
        name={match.player_a?.username ?? null}
        avatarUrl={match.player_a?.avatar_url ?? null}
        playerId={match.player_a_id}
        score={match.score_a}
        isWinner={hasWinner && match.winner_id === match.player_a_id}
        isLoser={hasWinner && match.winner_id !== match.player_a_id && match.player_a_id !== null}
        gameColor={gameColor}
        position="top"
      />
      <div className="border-t border-border/30" />
      <PlayerRow
        name={match.player_b?.username ?? null}
        avatarUrl={match.player_b?.avatar_url ?? null}
        playerId={match.player_b_id}
        score={match.score_b}
        isWinner={hasWinner && match.winner_id === match.player_b_id}
        isLoser={hasWinner && match.winner_id !== match.player_b_id && match.player_b_id !== null}
        gameColor={gameColor}
        position="bottom"
      />
    </div>
  )
}

// ─── Player Row ─────────────────────────────────────────────────────────────

function PlayerRow({
  name,
  avatarUrl,
  playerId,
  score,
  isWinner,
  isLoser,
  gameColor,
  position,
}: {
  name: string | null
  avatarUrl: string | null
  playerId: string | null
  score: number | null
  isWinner: boolean
  isLoser: boolean
  gameColor: string
  position: 'top' | 'bottom'
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
        isWinner
          ? 'bg-green-500/10'
          : isLoser
          ? 'bg-space-900/50 opacity-50'
          : 'bg-space-800'
      }`}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name ?? 'Player'}
          className="w-5 h-5 rounded-full flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className={`w-5 h-5 rounded-full flex-shrink-0 ${
          playerId ? 'bg-space-600' : 'bg-space-700'
        }`} />
      )}

      {/* Name */}
      <span
        className={`truncate flex-1 min-w-0 ${
          isWinner
            ? 'text-white font-bold'
            : name
            ? 'text-gray-300'
            : 'text-gray-600 italic'
        }`}
      >
        {name ?? (playerId ? 'Unknown' : 'TBD')}
      </span>

      {/* Score */}
      <span
        className="font-orbitron font-bold ml-auto flex-shrink-0 tabular-nums"
        style={isWinner ? { color: gameColor } : undefined}
      >
        {score !== null ? score : '-'}
      </span>
    </div>
  )
}
