'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

interface MatchEntry {
  id: string
  game: string
  stake_amount: number
  currency: string
  won: boolean
  opponent: { username: string; avatar_url: string | null } | null
  resolved_at: string
  elo_change?: number
  map?: string
}

interface Props {
  username: string
}

export function MatchHistory({ username }: Props) {
  const [matches, setMatches] = useState<MatchEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    const setter = pageNum === 0 ? setLoading : setLoadingMore
    setter(true)
    try {
      const res = await fetch(`/api/player/match-history?username=${encodeURIComponent(username)}&page=${pageNum}`)
      const data = await res.json()
      if (!data.error) {
        setMatches(prev => append ? [...prev, ...data.matches] : data.matches)
        setHasMore(data.hasMore)
        setTotal(data.total)
      }
    } catch (_) {
      // silently fail
    } finally {
      setter(false)
    }
  }, [username])

  useEffect(() => {
    fetchPage(0, false)
  }, [fetchPage])

  function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPage(nextPage, true)
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-space-700 rounded w-40" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-space-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="card text-center py-12 text-muted">
        No completed matches yet.
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-orbitron text-xl font-bold text-white">Match History</h2>
        <span className="text-xs text-muted">{total} total matches</span>
      </div>

      <div className="space-y-2">
        {matches.map(m => {
          const date = new Date(m.resolved_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          const payout = m.won ? Number(m.stake_amount) * 2 * 0.9 : 0
          const net = m.won ? payout - Number(m.stake_amount) : -Number(m.stake_amount)

          return (
            <div
              key={m.id}
              className={`card flex items-center justify-between gap-3 border-l-2 ${
                m.won ? 'border-l-green-500' : 'border-l-red-500'
              }`}
            >
              {/* Left: opponent */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {m.opponent?.avatar_url ? (
                  <Image
                    src={m.opponent.avatar_url}
                    alt={m.opponent.username}
                    width={32}
                    height={32}
                    className="rounded-full flex-shrink-0 border border-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-space-700 border border-border flex-shrink-0 flex items-center justify-center text-xs text-muted">
                    ?
                  </div>
                )}
                <div className="min-w-0">
                  {m.opponent ? (
                    <Link
                      href={`/profile/${m.opponent.username}`}
                      className="text-sm text-white hover:text-accent-cyan transition-colors truncate block"
                    >
                      vs {m.opponent.username}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">Unknown</span>
                  )}
                  <div className="text-[10px] text-muted">{date}</div>
                </div>
              </div>

              {/* Center: game + map + elo */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <span className="text-[10px] font-orbitron uppercase tracking-wider px-2 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                  {GAME_LABELS[m.game] ?? m.game}
                </span>
                {m.map && (
                  <span className="text-[10px] text-muted">{m.map}</span>
                )}
                {m.elo_change != null && m.elo_change !== 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      m.elo_change > 0
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {m.elo_change > 0 ? '+' : ''}{m.elo_change} ELO
                  </span>
                )}
              </div>

              {/* Right: stake + result */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs text-muted">Stake</div>
                  <div className="text-sm text-white font-medium">
                    ${Number(m.stake_amount).toFixed(2)}
                  </div>
                </div>
                <div className="text-right min-w-[60px]">
                  <div
                    className={`text-sm font-orbitron font-bold ${
                      m.won ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {m.won ? 'WIN' : 'LOSS'}
                  </div>
                  <div
                    className={`text-xs font-mono ${
                      net >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {net >= 0 ? '+' : ''}{net.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-primary text-sm py-2 px-6 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
