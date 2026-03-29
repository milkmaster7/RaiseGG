// Achievement System for RaiseGG

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  /** For progressive achievements: the target count */
  target?: number
  /** Which stat field to read for progress (e.g. 'total_wins') */
  progressKey?: string
}

export const RARITY_COLORS: Record<AchievementRarity, { text: string; bg: string; border: string; glow: string }> = {
  common:    { text: 'text-gray-300',   bg: 'bg-gray-500/20',    border: 'border-gray-500',   glow: '' },
  rare:      { text: 'text-blue-400',   bg: 'bg-blue-500/20',    border: 'border-blue-500',   glow: 'shadow-blue-500/30' },
  epic:      { text: 'text-purple-400', bg: 'bg-purple-500/20',  border: 'border-purple-500', glow: 'shadow-purple-500/40' },
  legendary: { text: 'text-yellow-400', bg: 'bg-yellow-500/20',  border: 'border-yellow-500', glow: 'shadow-yellow-400/50' },
}

export const ACHIEVEMENTS: Achievement[] = [
  // Win-based
  { id: 'first_blood',      name: 'First Blood',       description: 'Win your first match',                   icon: '⚔️', rarity: 'common',    target: 1,    progressKey: 'total_wins' },
  { id: 'on_fire',          name: 'On Fire',            description: '3-win streak',                           icon: '🔥', rarity: 'common',    target: 3,    progressKey: 'best_streak' },
  { id: 'unstoppable',      name: 'Unstoppable',        description: '7-win streak',                           icon: '⚡', rarity: 'rare',      target: 7,    progressKey: 'best_streak' },
  { id: 'dominator',        name: 'Dominator',          description: '15-win streak',                          icon: '💀', rarity: 'epic',      target: 15,   progressKey: 'best_streak' },
  { id: 'century',          name: 'Century',            description: 'Win 100 matches',                        icon: '💯', rarity: 'rare',      target: 100,  progressKey: 'total_wins' },

  // Stake-based
  { id: 'high_roller',      name: 'High Roller',        description: 'Win a $100+ stake match',                icon: '💰', rarity: 'rare' },
  { id: 'whale',            name: 'Whale',              description: 'Win a $500+ stake match',                icon: '🐋', rarity: 'epic' },

  // Login streak
  { id: 'streak_master',    name: 'Streak Master',      description: '30-day login streak',                    icon: '📅', rarity: 'legendary', target: 30,   progressKey: 'login_streak' },

  // Social
  { id: 'social_butterfly', name: 'Social Butterfly',   description: 'Add 10 friends',                         icon: '🦋', rarity: 'common',    target: 10,   progressKey: 'friends_count' },
  { id: 'clan_leader',      name: 'Clan Leader',        description: 'Create a clan',                          icon: '🏰', rarity: 'common' },

  // Tournament
  { id: 'tournament_victor',name: 'Tournament Victor',  description: 'Win a tournament',                       icon: '🏆', rarity: 'epic' },

  // Battle Pass
  { id: 'battle_pass_maxed',name: 'Battle Pass Maxed',  description: 'Reach tier 30 in battle pass',           icon: '🎖️', rarity: 'legendary', target: 30,   progressKey: 'bp_tier' },

  // Multi-game
  { id: 'all_rounder',      name: 'All Rounder',        description: 'Win matches in all 3 games',             icon: '🎮', rarity: 'rare' },

  // Underdog
  { id: 'underdog',         name: 'Underdog',           description: 'Beat someone 200+ ELO above you',        icon: '🐺', rarity: 'rare' },

  // Collection
  { id: 'collector',        name: 'Collector',          description: 'Own 5+ cosmetics',                       icon: '🎨', rarity: 'common',    target: 5,    progressKey: 'cosmetics_count' },

  // Premium
  { id: 'premium_player',   name: 'Premium Player',     description: 'Subscribe to premium',                   icon: '⭐', rarity: 'common' },

  // Referral
  { id: 'referral_king',    name: 'Referral King',      description: 'Refer 10 players',                       icon: '👑', rarity: 'rare',      target: 10,   progressKey: 'referral_count' },

  // ELO tiers
  { id: 'diamond_rank',     name: 'Diamond Rank',       description: 'Reach Diamond ELO tier (1500+)',         icon: '💎', rarity: 'epic' },
  { id: 'apex_predator',    name: 'Apex Predator',      description: 'Reach Apex ELO tier (1700+)',            icon: '🦅', rarity: 'legendary' },

  // Seasonal
  { id: 'early_adopter',    name: 'Early Adopter',      description: 'Join during Season 1',                   icon: '🌟', rarity: 'rare' },
]

export const ACHIEVEMENTS_MAP = new Map(ACHIEVEMENTS.map(a => [a.id, a]))

export interface PlayerStats {
  total_wins: number
  best_streak: number
  login_streak: number
  friends_count: number
  cosmetics_count: number
  referral_count: number
  bp_tier: number
  cs2_wins: number
  dota2_wins: number
  deadlock_wins: number
  cs2_elo: number
  dota2_elo: number
  deadlock_elo: number
  premium_until: string | null
  has_clan: boolean
  tournament_wins: number
  max_stake_won: number
  max_elo_diff_won: number
  created_at: string
}

/** Compute which achievements a player has unlocked based on their stats */
export function computeUnlockedAchievements(stats: PlayerStats): string[] {
  const unlocked: string[] = []

  // Win-based
  if (stats.total_wins >= 1)   unlocked.push('first_blood')
  if (stats.total_wins >= 100) unlocked.push('century')

  // Streak-based
  if (stats.best_streak >= 3)  unlocked.push('on_fire')
  if (stats.best_streak >= 7)  unlocked.push('unstoppable')
  if (stats.best_streak >= 15) unlocked.push('dominator')

  // Stake-based
  if (stats.max_stake_won >= 100) unlocked.push('high_roller')
  if (stats.max_stake_won >= 500) unlocked.push('whale')

  // Login streak
  if (stats.login_streak >= 30) unlocked.push('streak_master')

  // Social
  if (stats.friends_count >= 10) unlocked.push('social_butterfly')
  if (stats.has_clan) unlocked.push('clan_leader')

  // Tournament
  if (stats.tournament_wins >= 1) unlocked.push('tournament_victor')

  // Battle pass
  if (stats.bp_tier >= 30) unlocked.push('battle_pass_maxed')

  // Multi-game
  if (stats.cs2_wins > 0 && stats.dota2_wins > 0 && stats.deadlock_wins > 0) {
    unlocked.push('all_rounder')
  }

  // Underdog
  if (stats.max_elo_diff_won >= 200) unlocked.push('underdog')

  // Collector
  if (stats.cosmetics_count >= 5) unlocked.push('collector')

  // Premium
  if (stats.premium_until && new Date(stats.premium_until) > new Date()) {
    unlocked.push('premium_player')
  }

  // Referral
  if (stats.referral_count >= 10) unlocked.push('referral_king')

  // ELO tiers
  const peakElo = Math.max(stats.cs2_elo ?? 1000, stats.dota2_elo ?? 1000, stats.deadlock_elo ?? 1000)
  if (peakElo >= 1500) unlocked.push('diamond_rank')
  if (peakElo >= 1700) unlocked.push('apex_predator')

  // Early adopter — joined before Season 1 ends (May 1, 2026)
  if (stats.created_at && new Date(stats.created_at) < new Date('2026-05-01T00:00:00Z')) {
    unlocked.push('early_adopter')
  }

  return unlocked
}

/** Get progress value for progressive achievements */
export function getAchievementProgress(achievement: Achievement, stats: PlayerStats): number {
  if (!achievement.progressKey || !achievement.target) return 0
  const value = (stats as unknown as Record<string, unknown>)[achievement.progressKey]
  return typeof value === 'number' ? Math.min(value, achievement.target) : 0
}

/** Find newly unlocked achievements by comparing current unlocks against saved */
export function getNewlyUnlocked(currentUnlocks: string[], savedAchievements: string[]): string[] {
  const savedSet = new Set(savedAchievements)
  return currentUnlocks.filter(id => !savedSet.has(id))
}
