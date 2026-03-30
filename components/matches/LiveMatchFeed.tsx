'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MatchCard } from './MatchCard'
import type { Match } from '@/types'

export function LiveMatchFeed() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    async function fetchMatches() {
      const { data } = await supabase
        .from('matches')
        .select('*, player_a:players!player_a_id(id,username,avatar_url,cs2_elo,dota2_elo,deadlock_elo,country), player_b:players!player_b_id(id,username,avatar_url,cs2_elo,dota2_elo,deadlock_elo,country)')
        .in('status', ['open', 'locked', 'live'])
        .order('created_at', { ascending: false })
        .limit(10)

      setMatches((data as Match[]) ?? [])
      setLoading(false)
    }

    fetchMatches()

    // Real-time subscription via Supabase
    const channel = supabase
      .channel('live-matches')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
      }, () => {
        fetchMatches()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-16 animate-pulse bg-space-700" />
        ))}
      </div>
    )
  }

  // Show simulated activity when no real matches exist
  if (matches.length === 0) {
    return <SimulatedMatches />
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  )
}

// ─── Simulated matches when no real activity ─────────────────────────────────

const FAKE_PLAYERS = [
  { name: 'kara_yılan', country: 'TR', elo: 1340 },
  { name: 'deagle_ace', country: 'GE', elo: 1180 },
  { name: 'b1t_fan99', country: 'UA', elo: 1520 },
  { name: 'софт_аим', country: 'RU', elo: 1290 },
  { name: 'clutch_bey', country: 'TR', elo: 1410 },
  { name: 'navi_dream', country: 'KZ', elo: 1050 },
  { name: 'раш_б', country: 'RU', elo: 1200 },
  { name: 'aimbot_ali', country: 'AZ', elo: 1150 },
  { name: 'headshot_iv', country: 'BG', elo: 1330 },
  { name: 'spray_ctrl', country: 'RS', elo: 1270 },
  { name: 'dota_king77', country: 'GE', elo: 1460 },
  { name: 'mid_or_feed', country: 'TR', elo: 1100 },
  { name: 'invoker_god', country: 'AM', elo: 1380 },
  { name: 'carry_pls', country: 'RO', elo: 1220 },
  { name: 'sniper_gg', country: 'PL', elo: 1310 },
  { name: 'deadlock_1', country: 'TR', elo: 1090 },
]

const FLAGS: Record<string, string> = {
  TR: '\ud83c\uddf9\ud83c\uddf7', GE: '\ud83c\uddec\ud83c\uddea', UA: '\ud83c\uddfa\ud83c\udde6',
  RU: '\ud83c\uddf7\ud83c\uddfa', KZ: '\ud83c\uddf0\ud83c\uddff', AZ: '\ud83c\udde6\ud83c\uddff',
  BG: '\ud83c\udde7\ud83c\uddec', RS: '\ud83c\uddf7\ud83c\uddf8', AM: '\ud83c\udde6\ud83c\uddf2',
  RO: '\ud83c\uddf7\ud83c\uddf4', PL: '\ud83c\uddf5\ud83c\uddf1',
}

const GAMES_SIM = ['CS2', 'Dota 2', 'Deadlock'] as const
const STAKES = [2, 5, 5, 10, 10, 20]
const STATUSES_SIM = ['open', 'live', 'live', 'open', 'locked'] as const
const STATUS_COLORS: Record<string, string> = {
  open: 'text-emerald-400', live: 'text-accent-cyan', locked: 'text-yellow-400',
}

function getTierLabel(elo: number) {
  if (elo >= 1500) return { label: 'Diamond', color: 'text-blue-400' }
  if (elo >= 1300) return { label: 'Platinum', color: 'text-gray-300' }
  if (elo >= 1100) return { label: 'Gold', color: 'text-amber-400' }
  return { label: 'Silver', color: 'text-gray-400' }
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function SimulatedMatches() {
  // Generate deterministic-ish matches based on current 5-minute window
  const window5m = Math.floor(Date.now() / 300000)
  const count = 3 + Math.floor(seededRandom(window5m) * 4) // 3-6 matches

  const simulated = Array.from({ length: count }).map((_, i) => {
    const seed = window5m * 100 + i
    const p1 = FAKE_PLAYERS[Math.floor(seededRandom(seed) * FAKE_PLAYERS.length)]
    const p2idx = Math.floor(seededRandom(seed + 1) * FAKE_PLAYERS.length)
    const p2 = FAKE_PLAYERS[p2idx === FAKE_PLAYERS.indexOf(p1) ? (p2idx + 1) % FAKE_PLAYERS.length : p2idx]
    const game = GAMES_SIM[Math.floor(seededRandom(seed + 2) * GAMES_SIM.length)]
    const stake = STAKES[Math.floor(seededRandom(seed + 3) * STAKES.length)]
    const status = STATUSES_SIM[Math.floor(seededRandom(seed + 4) * STATUSES_SIM.length)]
    const minsAgo = Math.floor(seededRandom(seed + 5) * 12) + 1

    return { p1, p2: status === 'open' ? null : p2, game, stake, status, minsAgo, id: `sim-${seed}` }
  })

  return (
    <div className="space-y-3">
      {simulated.map((m) => {
        const tier1 = getTierLabel(m.p1.elo)
        const tier2 = m.p2 ? getTierLabel(m.p2.elo) : null
        return (
          <a key={m.id} href="/play" className="card-hover group block">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Players */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span>{FLAGS[m.p1.country] ?? ''}</span>
                  <span className="text-white font-semibold text-sm truncate">{m.p1.name}</span>
                  <span className={`text-xs ${tier1.color}`}>{tier1.label}</span>
                </div>
                <span className="text-muted text-xs">vs</span>
                {m.p2 ? (
                  <div className="flex items-center gap-2">
                    <span>{FLAGS[m.p2.country] ?? ''}</span>
                    <span className="text-white font-semibold text-sm truncate">{m.p2.name}</span>
                    <span className={`text-xs ${tier2!.color}`}>{tier2!.label}</span>
                  </div>
                ) : (
                  <span className="text-muted text-sm italic">Waiting for opponent...</span>
                )}
              </div>

              {/* Right: Game, Stake, Status */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="badge-cyan text-xs">{m.game}</span>
                <span className="font-orbitron font-bold text-accent-cyan text-sm">${m.stake}</span>
                <div className="flex items-center gap-1.5">
                  {m.status === 'live' && <span className="live-dot" />}
                  <span className={`text-xs font-semibold uppercase ${STATUS_COLORS[m.status]}`}>
                    {m.status}
                  </span>
                </div>
                <span className="text-xs text-muted">{m.minsAgo}m ago</span>
              </div>
            </div>
          </a>
        )
      })}
      <div className="text-center pt-2">
        <a href="/play" className="btn-primary text-sm px-6 py-2 inline-block">
          Create a Match
        </a>
      </div>
    </div>
  )
}
