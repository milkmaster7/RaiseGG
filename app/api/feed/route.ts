import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const [{ data: matches }, { data: newPlayers }] = await Promise.all([
    supabase.from('matches')
      .select('id, game, stake_amount, currency, resolved_at, winner:players!winner_id(username), player_a:players!player_a_id(username), player_b:players!player_b_id(username)')
      .eq('status', 'completed')
      .gte('resolved_at', since)
      .order('resolved_at', { ascending: false })
      .limit(30),
    supabase.from('players')
      .select('username, country, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  type FeedItem =
    | { type: 'match_won'; winner: string; loser: string; game: string; amount: number; currency: string; time: string }
    | { type: 'new_player'; username: string; country: string | null; time: string }

  const feed: FeedItem[] = []

  for (const m of matches ?? []) {
    if (!m.winner || !m.player_a || !m.player_b) continue
    const winner = (m.winner as any).username
    const loser = (m.player_a as any).username === winner ? (m.player_b as any).username : (m.player_a as any).username
    feed.push({ type: 'match_won', winner, loser, game: m.game, amount: m.stake_amount, currency: m.currency ?? 'usdc', time: m.resolved_at })
  }
  for (const p of newPlayers ?? []) {
    feed.push({ type: 'new_player', username: p.username, country: p.country, time: p.created_at })
  }

  feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return NextResponse.json({ feed: feed.slice(0, 30) })
}
