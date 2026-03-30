'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, Trophy, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface TreasuryTransaction {
  id: string
  type: 'war_win' | 'war_loss' | 'deposit' | 'withdrawal'
  amount: number
  description: string
  created_at: string
}

interface TreasuryData {
  balance: number
  totalWon: number
  totalMatches: number
  winRate: number
  transactions: TreasuryTransaction[]
}

interface Props {
  clanId: string
}

export default function ClanTreasury({ clanId }: Props) {
  const [data, setData] = useState<TreasuryData>({
    balance: 0,
    totalWon: 0,
    totalMatches: 0,
    winRate: 0,
    transactions: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchTreasury = useCallback(async () => {
    try {
      // Fetch clan war history to compute treasury stats
      const res = await fetch('/api/clan-wars')
      if (!res.ok) return
      const warData = await res.json()
      const wars = warData.wars ?? []

      const clanWars = wars.filter(
        (w: { clan_a_id: string; clan_b_id: string; status: string }) =>
          (w.clan_a_id === clanId || w.clan_b_id === clanId) && w.status === 'completed'
      )

      const wins = clanWars.filter((w: { winner_clan_id: string }) => w.winner_clan_id === clanId)
      const totalMatches = clanWars.length
      const winRate = totalMatches > 0 ? Math.round((wins.length / totalMatches) * 100) : 0

      // Simulate treasury from war results (in production, read from clan.treasury_balance)
      const totalWon = wins.length * 10 // placeholder per-war earning
      const balance = totalWon * 0.1 // 10% pooled to treasury

      const transactions: TreasuryTransaction[] = clanWars.map((w: {
        id: string
        winner_clan_id: string
        clan_a_name: string
        clan_b_name: string
        clan_a_id: string
        completed_at: string
        scheduled_at: string
      }) => {
        const won = w.winner_clan_id === clanId
        const opponent = w.clan_a_id === clanId ? w.clan_b_name : w.clan_a_name
        return {
          id: w.id,
          type: won ? 'war_win' as const : 'war_loss' as const,
          amount: won ? 10 : 0,
          description: `${won ? 'Won' : 'Lost'} vs ${opponent}`,
          created_at: w.completed_at ?? w.scheduled_at,
        }
      })

      setData({ balance, totalWon, totalMatches, winRate, transactions })
    } finally {
      setLoading(false)
    }
  }, [clanId])

  useEffect(() => {
    fetchTreasury()
  }, [fetchTreasury])

  if (loading) {
    return <div className="h-64 rounded-xl bg-space-800 border border-border animate-pulse" />
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Treasury Balance',
            value: `$${data.balance.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/30',
          },
          {
            label: 'Total Won',
            value: `$${data.totalWon.toFixed(2)}`,
            icon: TrendingUp,
            color: 'text-accent-cyan',
            bg: 'bg-accent-cyan/10',
            border: 'border-accent-cyan/30',
          },
          {
            label: 'Total Matches',
            value: data.totalMatches.toString(),
            icon: Trophy,
            color: 'text-accent-purple',
            bg: 'bg-accent-purple/10',
            border: 'border-accent-purple/30',
          },
          {
            label: 'Win Rate',
            value: `${data.winRate}%`,
            icon: TrendingUp,
            color: data.winRate >= 50 ? 'text-green-400' : 'text-red-400',
            bg: data.winRate >= 50 ? 'bg-green-500/10' : 'bg-red-500/10',
            border: data.winRate >= 50 ? 'border-green-500/30' : 'border-red-500/30',
          },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`rounded-xl ${stat.bg} border ${stat.border} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted">{stat.label}</span>
              </div>
              <p className={`text-xl font-orbitron font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Info card */}
      <div className="rounded-xl bg-space-800 border border-border p-4">
        <p className="text-xs text-muted">
          The clan treasury pools <span className="text-white font-medium">10%</span> of all clan war winnings.
          Treasury funds can be used for future clan features like custom banners and tournament entries.
        </p>
      </div>

      {/* Transaction History */}
      <div className="rounded-xl bg-space-800 border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-white">Transaction History</h3>
        </div>

        {data.transactions.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign className="w-8 h-8 text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted">No transactions yet</p>
            <p className="text-xs text-muted/60 mt-1">Win clan wars to build your treasury</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.transactions.map(tx => {
              const isPositive = tx.type === 'war_win' || tx.type === 'deposit'
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-space-700/30 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {isPositive ? (
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{tx.description}</p>
                    <p className="text-[10px] text-muted">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`text-sm font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}${tx.amount.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
