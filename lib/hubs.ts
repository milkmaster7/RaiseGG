// Hub business logic — community-run competitive spaces (like FACEIT hubs)

import type { Game } from '@/types'

export interface Hub {
  id: string
  slug: string
  name: string
  game: Game
  description: string
  rules: string
  region: string
  min_elo: number
  max_elo: number
  owner_id: string
  member_count: number
  match_count: number
  is_active: boolean
  created_at: string
}

export interface HubMember {
  hub_id: string
  player_id: string
  hub_elo: number
  wins: number
  losses: number
  joined_at: string
}

export const GAME_LABELS: Record<Game, string> = {
  cs2: 'CS2',
  dota2: 'Dota 2',
  deadlock: 'Deadlock',
}

export const GAME_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cs2', label: 'CS2' },
  { value: 'dota2', label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
]

export const REGIONS = [
  'All',
  'Europe',
  'CIS',
  'Turkey',
  'Balkans',
  'Middle East',
  'Southeast Asia',
  'South America',
  'North America',
  'Oceania',
] as const

export type HubRegion = (typeof REGIONS)[number]

export const DEFAULT_HUBS: Omit<Hub, 'id' | 'owner_id' | 'member_count' | 'match_count' | 'created_at'>[] = [
  {
    slug: 'turkish-cs2-hub',
    name: 'Turkish CS2 Hub',
    game: 'cs2',
    description: 'The top competitive CS2 hub for players in Turkey. 128-tick servers, active admins, weekly prizes.',
    rules: '1. English or Turkish in chat.\n2. No cheating — VAC bans = permanent removal.\n3. Respect all players.\n4. Use voice comms during matches.\n5. Report griefers via hub Discord.',
    region: 'Turkey',
    min_elo: 800,
    max_elo: 3000,
    is_active: true,
  },
  {
    slug: 'georgian-dota2-hub',
    name: 'Georgian Dota 2 Hub',
    game: 'dota2',
    description: 'Georgia\'s premier Dota 2 hub. Captain\'s mode, in-house leagues, and regional tournaments.',
    rules: '1. No smurfing.\n2. Pick phase: respect captain.\n3. Abandon = 3-day ban.\n4. Toxic behavior = warning then ban.\n5. Minimum 100 Dota 2 ranked matches required.',
    region: 'CIS',
    min_elo: 900,
    max_elo: 3500,
    is_active: true,
  },
  {
    slug: 'balkan-deadlock-hub',
    name: 'Balkan Deadlock Hub',
    game: 'deadlock',
    description: 'Deadlock competitive hub for Balkan players. Fast queues, balanced matches, active community.',
    rules: '1. All Balkan countries welcome.\n2. English in match chat.\n3. No AFK during picks.\n4. Stream sniping = permanent ban.\n5. Report issues in hub forum.',
    region: 'Balkans',
    min_elo: 700,
    max_elo: 2500,
    is_active: true,
  },
  {
    slug: 'cis-cs2-hub',
    name: 'CIS CS2 Hub',
    game: 'cs2',
    description: 'Competitive CS2 for CIS region players. High skill ceiling, serious matches, anti-cheat enforced.',
    rules: '1. Russian or English in chat.\n2. 128-tick servers hosted in Moscow.\n3. Overtime rules: MR3.\n4. No stand-ins without admin approval.\n5. Minimum ELO 1000 to queue.',
    region: 'CIS',
    min_elo: 1000,
    max_elo: 4000,
    is_active: true,
  },
  {
    slug: 'eastern-european-dota2',
    name: 'Eastern European Dota 2',
    game: 'dota2',
    description: 'The largest Eastern European Dota 2 hub. All-pick and captain\'s draft, skill-based matchmaking.',
    rules: '1. English in all-chat.\n2. Native language allowed in team chat.\n3. Griefing = 7-day ban.\n4. Smurfs detected by MMR verification.\n5. Weekly leaderboard resets.',
    region: 'Europe',
    min_elo: 800,
    max_elo: 3500,
    is_active: true,
  },
]

/** Generate a URL-safe slug from a hub name */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/** Validate hub creation payload */
export function validateHubInput(body: Record<string, unknown>): string | null {
  const name = body.name as string | undefined
  if (!name?.trim() || name.trim().length < 3 || name.trim().length > 60) {
    return 'Name must be 3-60 characters'
  }

  const game = body.game as string | undefined
  if (!game || !['cs2', 'dota2', 'deadlock'].includes(game)) {
    return 'Game must be cs2, dota2 or deadlock'
  }

  const region = body.region as string | undefined
  if (!region?.trim()) {
    return 'Region is required'
  }

  const minElo = body.min_elo as number | undefined
  const maxElo = body.max_elo as number | undefined
  if (minElo !== undefined && (minElo < 0 || minElo > 5000)) {
    return 'Min ELO must be 0-5000'
  }
  if (maxElo !== undefined && (maxElo < 0 || maxElo > 5000)) {
    return 'Max ELO must be 0-5000'
  }
  if (minElo !== undefined && maxElo !== undefined && minElo >= maxElo) {
    return 'Min ELO must be less than max ELO'
  }

  return null
}
