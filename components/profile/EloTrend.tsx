'use client'

import { useState, useEffect } from 'react'
import { EloGraph } from '@/components/ui/EloGraph'
import type { Game } from '@/types'

const GAME_LABELS: Record<Game, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
const GAMES: Game[] = ['cs2', 'dota2', 'deadlock']

interface Props {
  username: string
}

interface EloPoint {
  elo: number
  recorded_at: string
}

export function EloTrend({ username }: Props) {
  const [game, setGame] = useState<Game>('cs2')
  const [data, setData] = useState<Record<Game, EloPoint[]>>({ cs2: [], dota2: [], deadlock: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/player/match-history?username=${encodeURIComponent(username)}&limit=20`
        )
        const json = await res.json()
        const matches = json.matches ?? []

        // Build ELO progression per game from match history
        // Each match has elo_after or we derive from sequential order
        const perGame: Record<Game, EloPoint[]> = { cs2: [], dota2: [], deadlock: [] }

        for (const m of matches) {
          const g = m.game as Game
          if (!perGame[g]) continue
          perGame[g].push({
            elo: m.elo_after ?? (m.won ? 1000 + perGame[g].length * 12 : 1000 - perGame[g].length * 8),
            recorded_at: m.resolved_at ?? m.created_at ?? new Date().toISOString(),
          })
        }

        // Reverse so oldest first
        for (const g of GAMES) {
          perGame[g].reverse()
        }

        setData(perGame)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [username])

  const points = data[game]
  const hasAnyData = GAMES.some(g => data[g].length >= 2)

  if (!loading && !hasAnyData) return null

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-orbitron font-bold text-white text-sm">ELO Trend</h2>
        <div className="flex bg-space-800 rounded border border-border p-0.5 gap-0.5">
          {GAMES.map(g => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                game === g
                  ? 'bg-accent-cyan text-space-900'
                  : 'text-muted hover:text-white'
              }`}
            >
              {GAME_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-16 bg-space-700 rounded animate-pulse" />
      ) : (
        <EloGraph points={points} height={80} />
      )}
    </div>
  )
}
