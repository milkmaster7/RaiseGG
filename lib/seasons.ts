// Seasonal System for RaiseGG

export interface SeasonReward {
  rank: string            // e.g. "#1", "#2", "#3", "Top 10", "Top 50"
  minPosition: number
  maxPosition: number
  prizeUSDC: number
  badgeName: string
  permanentPerk?: string  // e.g. "5% rake discount"
}

export interface Season {
  id: number
  name: string
  subtitle: string
  startDate: Date
  endDate: Date
  rewards: SeasonReward[]
}

const SEASONS: Season[] = [
  {
    id: 1,
    name: 'Rise of Champions',
    subtitle: 'Season 1',
    startDate: new Date('2026-04-01T00:00:00Z'),
    endDate: new Date('2026-05-01T00:00:00Z'),
    rewards: [
      { rank: '#1', minPosition: 1, maxPosition: 1, prizeUSDC: 50, badgeName: 'Season Champion', permanentPerk: '5% rake discount' },
      { rank: '#2', minPosition: 2, maxPosition: 2, prizeUSDC: 25, badgeName: 'Season Runner-Up' },
      { rank: '#3', minPosition: 3, maxPosition: 3, prizeUSDC: 10, badgeName: 'Season Top 3' },
      { rank: 'Top 10', minPosition: 4, maxPosition: 10, prizeUSDC: 0, badgeName: 'Season Elite' },
      { rank: 'Top 50', minPosition: 11, maxPosition: 50, prizeUSDC: 0, badgeName: 'Season Competitor' },
    ],
  },
  {
    id: 2,
    name: 'The Gauntlet',
    subtitle: 'Season 2',
    startDate: new Date('2026-05-01T00:00:00Z'),
    endDate: new Date('2026-06-01T00:00:00Z'),
    rewards: [
      { rank: '#1', minPosition: 1, maxPosition: 1, prizeUSDC: 75, badgeName: 'Season Champion', permanentPerk: '5% rake discount' },
      { rank: '#2', minPosition: 2, maxPosition: 2, prizeUSDC: 35, badgeName: 'Season Runner-Up' },
      { rank: '#3', minPosition: 3, maxPosition: 3, prizeUSDC: 15, badgeName: 'Season Top 3' },
      { rank: 'Top 10', minPosition: 4, maxPosition: 10, prizeUSDC: 0, badgeName: 'Season Elite' },
      { rank: 'Top 50', minPosition: 11, maxPosition: 50, prizeUSDC: 0, badgeName: 'Season Competitor' },
    ],
  },
]

export function getCurrentSeason(now: Date = new Date()): Season | null {
  return SEASONS.find(s => now >= s.startDate && now < s.endDate) ?? null
}

export function getNextSeason(now: Date = new Date()): Season | null {
  return SEASONS.find(s => now < s.startDate) ?? null
}

export function getDaysRemaining(season: Season, now: Date = new Date()): number {
  const diff = season.endDate.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function getSeasonProgress(season: Season, now: Date = new Date()): number {
  const total = season.endDate.getTime() - season.startDate.getTime()
  const elapsed = now.getTime() - season.startDate.getTime()
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

export function getRewardForPosition(season: Season, position: number): SeasonReward | null {
  return season.rewards.find(r => position >= r.minPosition && position <= r.maxPosition) ?? null
}

/** Soft reset: move ELO 50% toward 1000 */
export function seasonSoftReset(elo: number): number {
  return Math.round((elo + 1000) / 2)
}

export { SEASONS }
