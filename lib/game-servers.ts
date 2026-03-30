// CS2 Dedicated Server Management
// Manages a pool of game servers for stake matches

import { createServiceClient } from './supabase'

export interface GameServer {
  id: string
  ip: string
  port: number
  rcon_password: string
  region: 'eu-west' | 'eu-east' | 'tr' | 'cis'
  status: 'available' | 'in_use' | 'offline' | 'maintenance'
  current_match_id: string | null
  last_heartbeat: string
  provider: string // e.g. 'dathost', 'gportal', 'custom'
  hostname: string
  gotv_port: number | null
}

export const SERVER_REGIONS: Record<string, { label: string; countries: string[] }> = {
  'eu-west': { label: 'EU West (Frankfurt)', countries: ['germany', 'netherlands', 'poland', 'czech', 'austria', 'switzerland'] },
  'eu-east': { label: 'EU East (Bucharest)', countries: ['romania', 'bulgaria', 'serbia', 'hungary', 'croatia', 'slovenia', 'bosnia', 'montenegro', 'albania', 'kosovo', 'north-macedonia', 'greece'] },
  'tr': { label: 'Turkey (Istanbul)', countries: ['turkey', 'cyprus'] },
  'cis': { label: 'CIS (Tbilisi)', countries: ['georgia', 'armenia', 'azerbaijan', 'ukraine', 'russia', 'kazakhstan', 'uzbekistan'] },
}

// Find best region for a player based on country
export function getBestRegion(country: string): string {
  for (const [region, config] of Object.entries(SERVER_REGIONS)) {
    if (config.countries.includes(country.toLowerCase())) return region
  }
  return 'eu-west' // default
}

// Get an available server in the preferred region
export async function allocateServer(matchId: string, preferredRegion: string): Promise<GameServer | null> {
  const supabase = createServiceClient()

  // Try preferred region first
  let { data: server } = await supabase
    .from('game_servers')
    .select('*')
    .eq('status', 'available')
    .eq('region', preferredRegion)
    .order('last_heartbeat', { ascending: false })
    .limit(1)
    .single()

  // Fallback to any available server
  if (!server) {
    const { data: fallback } = await supabase
      .from('game_servers')
      .select('*')
      .eq('status', 'available')
      .order('last_heartbeat', { ascending: false })
      .limit(1)
      .single()
    server = fallback
  }

  if (!server) return null

  // Reserve it
  await supabase
    .from('game_servers')
    .update({
      status: 'in_use',
      current_match_id: matchId,
    })
    .eq('id', server.id)
    .eq('status', 'available') // optimistic lock

  return server
}

// Release server back to pool
export async function releaseServer(matchId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('game_servers')
    .update({
      status: 'available',
      current_match_id: null,
    })
    .eq('current_match_id', matchId)
}

// Get server status for a match
export async function getMatchServer(matchId: string): Promise<GameServer | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('game_servers')
    .select('*')
    .eq('current_match_id', matchId)
    .single()
  return data
}

// Get all servers with status
export async function getAllServers(): Promise<GameServer[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('game_servers')
    .select('*')
    .order('region')
  return data ?? []
}

// Server heartbeat — called by game servers to report they're alive
export async function serverHeartbeat(serverId: string, playerCount: number): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('game_servers')
    .update({
      last_heartbeat: new Date().toISOString(),
      player_count: playerCount,
    })
    .eq('id', serverId)
}

// Generate connect string for CS2
export function getConnectString(server: GameServer, password?: string): string {
  const pw = password ? `;password ${password}` : ''
  return `connect ${server.ip}:${server.port}${pw}`
}

// Generate GOTV spectate string
export function getGotvString(server: GameServer): string | null {
  if (!server.gotv_port) return null
  return `connect ${server.ip}:${server.gotv_port}`
}
