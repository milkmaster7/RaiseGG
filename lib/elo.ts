// ELO system for RaiseGG stake matches

const K_FACTOR = 32
const STARTING_ELO = 1000

export interface EloResult {
  newEloA: number
  newEloB: number
  deltaA: number
  deltaB: number
}

// Expected score for player A against player B
function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
}

// Calculate new ELOs after a match
export function calculateElo(eloA: number, eloB: number, aWon: boolean): EloResult {
  const expectedA = expectedScore(eloA, eloB)
  const actualA = aWon ? 1 : 0

  const deltaA = Math.round(K_FACTOR * (actualA - expectedA))
  const deltaB = -deltaA

  return {
    newEloA: Math.max(500, eloA + deltaA),
    newEloB: Math.max(500, eloB + deltaB),
    deltaA,
    deltaB,
  }
}

// Rank tiers (10 tiers)
export const TIERS = [
  { name: 'Iron',        min: 0,    max: 699,  color: '#71717a', bg: 'rgba(113,113,122,0.15)' },
  { name: 'Bronze',      min: 700,  max: 899,  color: '#cd7f32', bg: 'rgba(205,127,50,0.15)'  },
  { name: 'Silver',      min: 900,  max: 1099, color: '#d1d5db', bg: 'rgba(209,213,219,0.15)' },
  { name: 'Gold',        min: 1100, max: 1299, color: '#ffd700', bg: 'rgba(255,215,0,0.15)'   },
  { name: 'Platinum',    min: 1300, max: 1449, color: '#00d4ff', bg: 'rgba(0,212,255,0.15)'   },
  { name: 'Diamond',     min: 1450, max: 1599, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
  { name: 'Master',      min: 1600, max: 1749, color: '#a855f7', bg: 'rgba(168,85,247,0.15)'  },
  { name: 'Grandmaster', min: 1750, max: 1899, color: '#dc2626', bg: 'rgba(220,38,38,0.15)'   },
  { name: 'Champion',    min: 1900, max: 2099, color: '#f97316', bg: 'rgba(249,115,22,0.15)'  },
  { name: 'Apex',        min: 2100, max: 9999, color: '#fbbf24', bg: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(255,255,255,0.1))' },
]

export function getTier(elo: number) {
  return TIERS.find((t) => elo >= t.min && elo <= t.max) ?? TIERS[0]
}

export function getStartingElo() {
  return STARTING_ELO
}

// Season soft reset — move 50% toward 1000
export function seasonReset(elo: number): number {
  return Math.round(elo + (STARTING_ELO - elo) * 0.5)
}

// Minimum stake amount per tier (prevents rank exploitation)
export function minStakeForElo(elo: number): number {
  const tier = getTier(elo)
  const minimums: Record<string, number> = {
    Iron: 1,
    Bronze: 1,
    Silver: 2,
    Gold: 5,
    Platinum: 10,
    Diamond: 15,
    Master: 20,
    Grandmaster: 30,
    Champion: 40,
    Apex: 50,
  }
  return minimums[tier.name] ?? 1
}

// Maximum stake per tier — prevents low-rank players from playing above their level
export function maxStakeForElo(elo: number): number {
  const tier = getTier(elo)
  const maximums: Record<string, number> = {
    Iron: 10,
    Bronze: 25,
    Silver: 50,
    Gold: 100,
    Platinum: 250,
    Diamond: 500,
    Master: 1000,
    Grandmaster: 2500,
    Champion: 5000,
    Apex: 5000,
  }
  return maximums[tier.name] ?? 10
}

// Preview ELO change before joining a match
export function calculateEloPreview(playerElo: number, opponentElo: number): { win: number; loss: number } {
  const expectedA = expectedScore(playerElo, opponentElo)
  const win = Math.round(K_FACTOR * (1 - expectedA))
  const loss = Math.round(K_FACTOR * (0 - expectedA))
  return { win, loss }
}

// Check if two players are within matchable ELO range
// Prevents smurfing — high-rank players can't play against low-rank players
export function isMatchableEloRange(eloA: number, eloB: number): { allowed: boolean; reason?: string } {
  const diff = Math.abs(eloA - eloB)
  const maxDiff = 400 // max 400 ELO difference allowed

  if (diff > maxDiff) {
    return {
      allowed: false,
      reason: `ELO difference (${diff}) exceeds maximum (${maxDiff}). Players must be within ${maxDiff} ELO of each other.`
    }
  }
  return { allowed: true }
}
