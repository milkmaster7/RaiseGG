import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/matches/live — list all currently active/locked matches for spectating
export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, game, format, stake_amount, status, created_at, is_team_match, team_size,
      player_a:players!player_a_id(id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, country),
      player_b:players!player_b_id(id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, country)
    `)
    .in('status', ['locked', 'live'])
    .order('stake_amount', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get GOTV info for matches with assigned servers
  const matchIds = (data ?? []).map(m => m.id)
  const { data: servers } = await supabase
    .from('game_servers')
    .select('current_match_id, ip, gotv_port, hostname')
    .in('current_match_id', matchIds)

  const serverMap = new Map((servers ?? []).map(s => [s.current_match_id, s]))

  const enriched = (data ?? []).map(m => {
    const server = serverMap.get(m.id)
    return {
      ...m,
      spectate: server?.gotv_port ? {
        gotvConnect: `connect ${server.ip}:${server.gotv_port}`,
        serverName: server.hostname,
      } : null,
    }
  })

  return NextResponse.json(enriched)
}
