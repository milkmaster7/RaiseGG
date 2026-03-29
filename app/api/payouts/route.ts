import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export async function GET() {
  const db = createServiceClient()

  // Last 20 win payouts with player info and match game
  const { data: recentWins } = await db
    .from('transactions')
    .select('id, amount, created_at, player:players!player_id(username), match:matches!match_id(game)')
    .eq('type', 'win')
    .order('created_at', { ascending: false })
    .limit(20)

  const payouts = (recentWins ?? []).map((tx: any) => ({
    id: tx.id,
    username: tx.player?.username ?? 'Player',
    amount: tx.amount,
    game: tx.match?.game ?? 'cs2',
    timeAgo: timeAgo(tx.created_at),
  }))

  // 24h total
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: dayData } = await db
    .from('transactions')
    .select('amount')
    .eq('type', 'win')
    .gte('created_at', dayAgo)

  const total24h = (dayData ?? []).reduce((sum: number, tx: any) => sum + (tx.amount ?? 0), 0)

  // All-time total
  const { data: allTimeData } = await db
    .from('transactions')
    .select('amount')
    .eq('type', 'win')

  const totalAllTime = (allTimeData ?? []).reduce((sum: number, tx: any) => sum + (tx.amount ?? 0), 0)

  return NextResponse.json({ payouts, total24h, totalAllTime }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}
