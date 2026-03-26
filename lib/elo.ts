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

// Rank tiers
export const TIERS = [
  { name: 'Bronze',   min: 0,    max: 899,  color: '#cd7f32', bg: 'rgba(205,127,50,0.15)'  },
  { name: 'Silver',   min: 900,  max: 1099, color: '#c0c0c0', bg: 'rgba(192,192,192,0.15)' },
  { name: 'Gold',     min: 1100, max: 1299, color: '#ffd700', bg: 'rgba(255,215,0,0.15)'   },
  { name: 'Platinum', min: 1300, max: 1499, color: '#00d4ff', bg: 'rgba(0,212,255,0.15)'   },
  { name: 'Diamond',  min: 1500, max: 1699, color: '#7b61ff', bg: 'rgba(123,97,255,0.15)'  },
  { name: 'Apex',     min: 1700, max: 9999, color: '#ff4444', bg: 'rgba(255,68,68,0.15)'   },
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
    Bronze: 1,
    Silver: 2,
    Gold: 5,
    Platinum: 10,
    Diamond: 20,
    Apex: 50,
  }
  return minimums[tier.name] ?? 1
}
