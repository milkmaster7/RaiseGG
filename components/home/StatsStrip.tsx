'use client'

import { useState, useEffect } from 'react'
import { Shield, Zap, Trophy, Users } from 'lucide-react'

interface Stats {
  total_matches_played: number
  total_prize_money_usd: number
  active_players: number
}

export function StatsStrip() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/public/stats')
        const json = await res.json()
        setStats(json.data?.overview ?? null)
      } catch {
        // silent
      }
    }
    load()
  }, [])

  const players = stats?.active_players ?? 0
  const matches = stats?.total_matches_played ?? 0
  const prize = stats?.total_prize_money_usd ?? 0

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="card py-6">
          <Users className="w-6 h-6 text-accent-cyan mx-auto mb-3" />
          <div className="font-orbitron text-2xl font-bold text-white">
            {players > 0 ? players.toLocaleString() : '—'}
          </div>
          <p className="text-xs text-muted mt-1">Registered Players</p>
        </div>
        <div className="card py-6">
          <Trophy className="w-6 h-6 text-accent-cyan mx-auto mb-3" />
          <div className="font-orbitron text-2xl font-bold text-white">
            {matches > 0 ? matches.toLocaleString() : '—'}
          </div>
          <p className="text-xs text-muted mt-1">Matches Played</p>
        </div>
        <div className="card py-6">
          <Zap className="w-6 h-6 text-accent-cyan mx-auto mb-3" />
          <div className="font-orbitron text-2xl font-bold text-white">
            {prize > 0 ? `$${prize.toLocaleString()}` : '—'}
          </div>
          <p className="text-xs text-muted mt-1">Total Prize Pool</p>
        </div>
        <div className="card py-6">
          <Shield className="w-6 h-6 text-accent-cyan mx-auto mb-3" />
          <div className="font-orbitron text-sm font-bold text-white">Solana Escrow</div>
          <p className="text-xs text-muted mt-1">On-chain, trustless</p>
        </div>
      </div>
    </section>
  )
}
