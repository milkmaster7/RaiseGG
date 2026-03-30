// DatHost API client for CS2 server management
// Docs: https://dathost.readme.io/reference/cs2-servers-rest-api

const DATHOST_API = 'https://dathost.net/api/0.1'

function authHeader(): string {
  const email = process.env.DATHOST_EMAIL
  const password = process.env.DATHOST_PASSWORD
  if (!email || !password) throw new Error('DATHOST_EMAIL and DATHOST_PASSWORD env vars required')
  return 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64')
}

async function dathost(path: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(`${DATHOST_API}${path}`, {
    ...opts,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DatHost API ${res.status}: ${text}`)
  }
  const contentType = res.headers.get('content-type')
  if (contentType?.includes('application/json')) return res.json()
  return null
}

// List all servers on our account
export async function listServers(): Promise<any[]> {
  return dathost('/game-servers')
}

// Get a specific server
export async function getServer(serverId: string): Promise<any> {
  return dathost(`/game-servers/${serverId}`)
}

// Start a server
export async function startServer(serverId: string): Promise<void> {
  await dathost(`/game-servers/${serverId}/start`, { method: 'POST' })
}

// Stop a server
export async function stopServer(serverId: string): Promise<void> {
  await dathost(`/game-servers/${serverId}/stop`, { method: 'POST' })
}

// Send a console command to the server
export async function sendCommand(serverId: string, command: string): Promise<void> {
  await dathost(`/game-servers/${serverId}/console`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `line=${encodeURIComponent(command)}`,
  })
}

// Duplicate a server (for scaling)
export async function duplicateServer(serverId: string): Promise<any> {
  return dathost(`/game-servers/${serverId}/duplicate`, { method: 'POST' })
}

// --- CS2 Match API ---

export interface CS2MatchOptions {
  serverId: string
  team1Name?: string
  team2Name?: string
  team1SteamIds: string[]  // Steam64 IDs
  team2SteamIds: string[]
  roundsToWin?: number     // default 13 (MR13)
  enableKnifeRound?: boolean
  enablePlayback?: boolean // GOTV demo recording
  waitForSpectators?: boolean
  map?: string
}

// Create and start a CS2 match
export async function createMatch(opts: CS2MatchOptions): Promise<any> {
  const body: any = {
    game_server_id: opts.serverId,
    team1_steam_ids: opts.team1SteamIds,
    team2_steam_ids: opts.team2SteamIds,
    enable_playback: opts.enablePlayback ?? true,
    enable_knife_round: opts.enableKnifeRound ?? false,
    wait_for_spectators: opts.waitForSpectators ?? false,
    rounds_to_win: opts.roundsToWin ?? 13,
  }
  if (opts.team1Name) body.team1_name = opts.team1Name
  if (opts.team2Name) body.team2_name = opts.team2Name
  if (opts.map) body.map = opts.map

  return dathost('/cs2-matches', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// Get match status
export async function getMatch(matchId: string): Promise<any> {
  return dathost(`/cs2-matches/${matchId}`)
}

// Cancel a match
export async function cancelMatch(matchId: string): Promise<void> {
  await dathost(`/cs2-matches/${matchId}/cancel`, { method: 'POST' })
}

// Get match demo (GOTV recording URL)
export async function getMatchDemo(matchId: string): Promise<string | null> {
  const match = await getMatch(matchId)
  return match?.playback_url ?? null
}
