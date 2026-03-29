// ─── Tournament System Config & Logic ───────────────────────────
// Single Elimination brackets with USDC entry fees and prize pools

export type Game = 'cs2' | 'dota2' | 'deadlock'
export type TournamentStatus = 'registration' | 'in_progress' | 'completed' | 'cancelled'
export type BracketSize = 8 | 16 | 32

export interface TournamentConfig {
  name: string
  game: Game
  format: 'single_elimination'
  bracketSize: BracketSize
  entryFee: number // USDC — 0 = free
  startsAt: string // ISO 8601
}

export interface BracketMatch {
  id: string
  round: number      // 0-indexed from left
  position: number   // position within the round (top to bottom)
  playerA: string | null // player UUID
  playerB: string | null
  scoreA: number | null
  scoreB: number | null
  winnerId: string | null
  nextMatchId: string | null // match the winner feeds into
}

export interface TournamentWithBracket {
  id: string
  name: string
  game: Game
  format: string
  status: TournamentStatus
  bracketSize: BracketSize
  entryFee: number
  prizePool: number
  maxPlayers: number
  startsAt: string
  createdAt: string
  bracket: BracketMatch[]
  registrations: TournamentRegistration[]
}

export interface TournamentRegistration {
  id: string
  tournamentId: string
  playerId: string
  paid: boolean
  createdAt: string
  player?: {
    id: string
    username: string
    avatar_url: string | null
    cs2_elo: number
    dota2_elo: number
    deadlock_elo: number
  }
}

// ─── Constants ──────────────────────────────────────────────────

export const ENTRY_FEE_OPTIONS = [0, 5, 10, 25, 50] as const

export const PRIZE_DISTRIBUTION = [
  { place: 1, label: '1st', pct: 0.50 },
  { place: 2, label: '2nd', pct: 0.25 },
  { place: 3, label: '3rd', pct: 0.15 },
  { place: 4, label: '4th', pct: 0.10 },
] as const

export const PLATFORM_RAKE = 0.10 // 10%

export const GAME_CONFIG: Record<Game, { label: string; color: string; bgColor: string; borderColor: string; textColor: string }> = {
  cs2:      { label: 'CS2',      color: '#f97316', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/40', textColor: 'text-orange-400' },
  dota2:    { label: 'Dota 2',   color: '#f87171', bgColor: 'bg-red-500/10',    borderColor: 'border-red-500/40',    textColor: 'text-red-400' },
  deadlock: { label: 'Deadlock', color: '#a78bfa', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/40', textColor: 'text-purple-400' },
}

// ─── Prize calculation ──────────────────────────────────────────

export function calculatePrizePool(entryFee: number, playerCount: number): number {
  const gross = entryFee * playerCount
  return gross * (1 - PLATFORM_RAKE)
}

export function calculatePrizes(prizePool: number) {
  return PRIZE_DISTRIBUTION.map(d => ({
    ...d,
    amount: Math.round(prizePool * d.pct * 100) / 100,
  }))
}

// ─── ELO helper ─────────────────────────────────────────────────

export function getGameElo(player: { cs2_elo: number; dota2_elo: number; deadlock_elo: number }, game: Game): number {
  const map: Record<Game, keyof typeof player> = { cs2: 'cs2_elo', dota2: 'dota2_elo', deadlock: 'deadlock_elo' }
  return player[map[game]] as number
}

// ─── Bracket Generation ─────────────────────────────────────────

/** Number of rounds for a given bracket size */
export function roundCount(bracketSize: BracketSize): number {
  return Math.log2(bracketSize)
}

/** Generate a full single-elimination bracket (empty). Returns match descriptors. */
export function generateEmptyBracket(bracketSize: BracketSize): Omit<BracketMatch, 'id'>[] {
  const rounds = roundCount(bracketSize)
  const matches: Omit<BracketMatch, 'id'>[] = []

  // Create matches for each round
  for (let r = 0; r < rounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r + 1)
    for (let p = 0; p < matchesInRound; p++) {
      matches.push({
        round: r,
        position: p,
        playerA: null,
        playerB: null,
        scoreA: null,
        scoreB: null,
        winnerId: null,
        nextMatchId: null, // filled after insert with real IDs
      })
    }
  }

  return matches
}

/**
 * Seed players into round 0 of the bracket by ELO (highest vs lowest).
 * Standard tournament seeding: 1v8, 4v5, 2v7, 3v6 etc.
 */
export function seedPlayers(
  players: { playerId: string; elo: number }[],
  bracketSize: BracketSize
): { position: number; playerA: string | null; playerB: string | null }[] {
  // Sort descending by ELO
  const sorted = [...players].sort((a, b) => b.elo - a.elo)

  // Pad with byes if fewer players than bracket size
  const padded: (string | null)[] = sorted.map(p => p.playerId)
  while (padded.length < bracketSize) padded.push(null)

  // Standard seeding order
  const seeded = standardSeedOrder(bracketSize)
  const matchCount = bracketSize / 2
  const result: { position: number; playerA: string | null; playerB: string | null }[] = []

  for (let i = 0; i < matchCount; i++) {
    result.push({
      position: i,
      playerA: padded[seeded[i * 2]] ?? null,
      playerB: padded[seeded[i * 2 + 1]] ?? null,
    })
  }

  return result
}

/** Standard tournament seed ordering for n players */
function standardSeedOrder(n: number): number[] {
  if (n === 2) return [0, 1]
  const half = standardSeedOrder(n / 2)
  const result: number[] = []
  for (const seed of half) {
    result.push(seed, n - 1 - seed)
  }
  return result
}

/**
 * Given a match result, determine the next match position for the winner.
 * Round r, position p -> feeds into round r+1, position floor(p/2)
 */
export function getNextMatchPosition(round: number, position: number): { round: number; position: number; slot: 'A' | 'B' } {
  return {
    round: round + 1,
    position: Math.floor(position / 2),
    slot: position % 2 === 0 ? 'A' : 'B',
  }
}

export function getRoundName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round
  if (remaining === 1) return 'Finals'
  if (remaining === 2) return 'Semifinals'
  if (remaining === 3) return 'Quarterfinals'
  return `Round ${round + 1}`
}

// ─── Weekly Schedule ────────────────────────────────────────────

export interface ScheduledTournament {
  name: string
  game: Game
  bracketSize: BracketSize
  entryFee: number
  dayOfWeek: number // 0=Sun, 1=Mon, ..., 6=Sat
  hourUTC: number
  description: string
}

export const WEEKLY_SCHEDULE: ScheduledTournament[] = [
  // Daily 8PM UTC — Free 8-player (rotating game)
  { name: 'Daily Free-For-All', game: 'cs2',      bracketSize: 8,  entryFee: 0,  dayOfWeek: 1, hourUTC: 20, description: 'Free 8-player tournament — rotating games daily' },
  { name: 'Daily Free-For-All', game: 'dota2',    bracketSize: 8,  entryFee: 0,  dayOfWeek: 2, hourUTC: 20, description: 'Free 8-player tournament — rotating games daily' },
  { name: 'Daily Free-For-All', game: 'deadlock',  bracketSize: 8,  entryFee: 0,  dayOfWeek: 3, hourUTC: 20, description: 'Free 8-player tournament — rotating games daily' },
  { name: 'Daily Free-For-All', game: 'cs2',      bracketSize: 8,  entryFee: 0,  dayOfWeek: 4, hourUTC: 20, description: 'Free 8-player tournament — rotating games daily' },

  // Friday 9PM UTC — $10 entry 16-player CS2
  { name: 'Friday Night CS2 Cup', game: 'cs2', bracketSize: 16, entryFee: 10, dayOfWeek: 5, hourUTC: 21, description: '$10 entry · 16 players · CS2' },

  // Saturday 8PM UTC — $25 entry 16-player Dota 2
  { name: 'Saturday Dota 2 Championship', game: 'dota2', bracketSize: 16, entryFee: 25, dayOfWeek: 6, hourUTC: 20, description: '$25 entry · 16 players · Dota 2' },

  // Sunday 6PM UTC — $5 entry 8-player Deadlock
  { name: 'Sunday Deadlock Showdown', game: 'deadlock', bracketSize: 8, entryFee: 5, dayOfWeek: 0, hourUTC: 18, description: '$5 entry · 8 players · Deadlock' },
]

/** Get the next occurrence of a scheduled tournament */
export function getNextOccurrence(sched: ScheduledTournament): Date {
  const now = new Date()
  const d = new Date(now)
  d.setUTCHours(sched.hourUTC, 0, 0, 0)

  // Find next matching day
  const currentDay = d.getUTCDay()
  let diff = sched.dayOfWeek - currentDay
  if (diff < 0 || (diff === 0 && d <= now)) diff += 7
  d.setUTCDate(d.getUTCDate() + diff)

  return d
}
