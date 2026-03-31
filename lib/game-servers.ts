// CS2 Dedicated Server Management
// Manages a pool of game servers for stake matches
// DatHost API integration for automatic server start/stop

import { createServiceClient } from './supabase'

const DATHOST_EMAIL = process.env.DATHOST_EMAIL ?? ''
const DATHOST_PASSWORD = process.env.DATHOST_PASSWORD ?? ''
const DATHOST_BASE = 'https://dathost.net/api/0.1'

function dathostHeaders(): HeadersInit {
  return {
    Authorization: 'Basic ' + Buffer.from(`${DATHOST_EMAIL}:${DATHOST_PASSWORD}`).toString('base64'),
  }
}

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

// ── DatHost API ──

export interface DatHostServer {
  id: string
  name: string
  ip: string
  raw_ip: string
  on: boolean
  booting: boolean
  server_error: string
  location: string
  players_online: number
  ports: { game: number; gotv: number | null }
  cs2_settings: {
    slots: number
    rcon: string
    password: string
    mapgroup_start_map: string
    game_mode: string
  }
}

export async function dathostListServers(): Promise<DatHostServer[]> {
  const r = await fetch(`${DATHOST_BASE}/game-servers`, { headers: dathostHeaders() })
  if (!r.ok) return []
  return r.json()
}

export async function dathostGetServer(serverId: string): Promise<DatHostServer | null> {
  const r = await fetch(`${DATHOST_BASE}/game-servers/${serverId}`, { headers: dathostHeaders() })
  if (!r.ok) return null
  return r.json()
}

export async function dathostStartServer(serverId: string): Promise<boolean> {
  const r = await fetch(`${DATHOST_BASE}/game-servers/${serverId}/start`, {
    method: 'POST',
    headers: dathostHeaders(),
  })
  return r.ok
}

export async function dathostStopServer(serverId: string): Promise<boolean> {
  const r = await fetch(`${DATHOST_BASE}/game-servers/${serverId}/stop`, {
    method: 'POST',
    headers: dathostHeaders(),
  })
  return r.ok
}

export async function dathostResetServer(serverId: string): Promise<boolean> {
  const r = await fetch(`${DATHOST_BASE}/game-servers/${serverId}/reset`, {
    method: 'POST',
    headers: dathostHeaders(),
  })
  return r.ok
}

export async function dathostSendRcon(serverId: string, command: string): Promise<string> {
  const r = await fetch(`${DATHOST_BASE}/game-servers/${serverId}/console`, {
    method: 'POST',
    headers: { ...dathostHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `line=${encodeURIComponent(command)}`,
  })
  if (!r.ok) return ''
  return r.text()
}

export async function dathostUpdateServer(serverId: string, settings: Record<string, string>): Promise<boolean> {
  const body = new URLSearchParams(settings).toString()
  const r = await fetch(`${DATHOST_BASE}/game-servers/${serverId}`, {
    method: 'PUT',
    headers: { ...dathostHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  return r.ok
}

// Set match password and map, then start server
export async function dathostPrepareMatch(serverId: string, matchPassword: string, map = 'de_dust2'): Promise<boolean> {
  const updated = await dathostUpdateServer(serverId, {
    'cs2_settings.password': matchPassword,
    'cs2_settings.mapgroup_start_map': map,
  })
  if (!updated) return false
  const started = await dathostStartServer(serverId)
  return started
}

// End match — clear password, stop server
export async function dathostEndMatch(serverId: string): Promise<boolean> {
  await dathostUpdateServer(serverId, { 'cs2_settings.password': '' })
  return dathostStopServer(serverId)
}

// Allocate DatHost server for a match — start it and return connect info
export async function allocateDatHostServer(matchId: string, matchPassword: string, map = 'de_dust2'): Promise<{ ip: string; port: number; password: string; gotvPort: number | null } | null> {
  const servers = await dathostListServers()
  const available = servers.find(s => !s.on && !s.booting)

  if (!available) {
    // All servers busy — try one that's on but has 0 players
    const idle = servers.find(s => s.on && s.players_online === 0)
    if (!idle) return null
    await dathostStopServer(idle.id)
    await new Promise(r => setTimeout(r, 3000))
    return allocateDatHostServer(matchId, matchPassword, map)
  }

  const prepared = await dathostPrepareMatch(available.id, matchPassword, map)
  if (!prepared) return null

  // Update Supabase tracking
  const supabase = createServiceClient()
  await supabase.from('game_servers').upsert({
    id: available.id,
    ip: available.raw_ip,
    port: available.ports.game,
    rcon_password: available.cs2_settings.rcon,
    region: available.location === 'istanbul' ? 'tr' : 'eu-west',
    status: 'in_use',
    current_match_id: matchId,
    provider: 'dathost',
    hostname: available.name,
    gotv_port: available.ports.gotv,
    last_heartbeat: new Date().toISOString(),
  })

  return {
    ip: available.raw_ip,
    port: available.ports.game,
    password: matchPassword,
    gotvPort: available.ports.gotv,
  }
}
