// Battle Pass system — Season config, tiers, XP logic

export const SEASON_CONFIG = {
  season: 1,
  name: 'Rise of Champions',
  startDate: '2026-04-01T00:00:00Z',
  endDate: '2026-06-30T23:59:59Z',
  premiumPrice: 5, // $5 USDC
  totalTiers: 30,
}

// XP sources
export const XP_SOURCES = {
  match_win: 100,
  match_loss: 25,
  daily_login: 20,
  challenge_complete: 50,
  login_streak_bonus: 10, // per streak day
} as const

export type XPSource = keyof typeof XP_SOURCES

export type RewardType =
  | 'badge'
  | 'elo_boost'
  | 'profile_border'
  | 'rake_discount'
  | 'avatar_ring'
  | 'title'
  | 'usdc'
  | 'pnl_border'
  | 'animated_badge'

export interface TierReward {
  name: string
  description: string
  type: RewardType
  value?: string | number // e.g. "$1" or 5 (percent)
}

export interface BattleTier {
  tier: number
  xpRequired: number // cumulative XP to unlock this tier
  freeReward: TierReward | null
  premiumReward: TierReward | null
}

// XP curve: each tier needs progressively more XP
function cumulativeXP(tier: number): number {
  // Tier 1 = 100 XP, grows ~linearly with slight curve
  // total for tier 30 ≈ 13,500 XP (reachable in ~45 days of active play)
  return tier * 100 + Math.floor(tier * tier * 5)
}

export const BATTLE_TIERS: BattleTier[] = Array.from({ length: 30 }, (_, i) => {
  const t = i + 1
  return {
    tier: t,
    xpRequired: cumulativeXP(t),
    freeReward: getFreeReward(t),
    premiumReward: getPremiumReward(t),
  }
})

function getFreeReward(tier: number): TierReward | null {
  switch (tier) {
    case 1:  return { name: 'Bronze Badge', description: 'A bronze season badge for your profile.', type: 'badge' }
    case 5:  return { name: '+5% ELO Boost', description: 'Earn 5% extra ELO from matches this season.', type: 'elo_boost', value: 5 }
    case 10: return { name: 'Flame Border', description: 'Flame-themed profile border.', type: 'profile_border', value: 'flame' }
    case 15: return { name: '2% Rake Discount', description: '2% off platform rake for the rest of the season.', type: 'rake_discount', value: 2 }
    case 20: return { name: 'Animated Avatar Ring', description: 'Glowing animated ring around your avatar.', type: 'avatar_ring' }
    case 25: return { name: 'Season Title', description: '"Season 1 Veteran" title on your profile.', type: 'title', value: 'Season 1 Veteran' }
    case 30: return { name: 'Exclusive Season Badge', description: 'Rare holographic Season 1 badge.', type: 'badge', value: 'season_1_exclusive' }
    default: return null
  }
}

function getPremiumReward(tier: number): TierReward | null {
  switch (tier) {
    case 1:  return { name: 'Premium Badge', description: 'Gold premium badge for your profile.', type: 'badge', value: 'premium' }
    case 5:  return { name: '$1 USDC', description: '$1 USDC added to your balance.', type: 'usdc', value: 1 }
    case 10: return { name: 'Gold Border', description: 'Exclusive gold profile border.', type: 'profile_border', value: 'gold' }
    case 15: return { name: '5% Rake Discount', description: '5% off platform rake for the rest of the season.', type: 'rake_discount', value: 5 }
    case 20: return { name: '$3 USDC', description: '$3 USDC added to your balance.', type: 'usdc', value: 3 }
    case 25: return { name: 'Custom PnL Card Border', description: 'Unique border for your PnL share card.', type: 'pnl_border', value: 'premium_season_1' }
    case 30: return { name: '$5 USDC + Champion Badge', description: '$5 USDC and animated "Season Champion" badge.', type: 'animated_badge', value: 5 }
    default: return null
  }
}

/** Calculate current tier from total XP */
export function getCurrentTier(totalXP: number): number {
  let tier = 0
  for (const t of BATTLE_TIERS) {
    if (totalXP >= t.xpRequired) {
      tier = t.tier
    } else {
      break
    }
  }
  return tier
}

/** Get XP needed for the next tier */
export function getNextTierXP(totalXP: number): { current: number; needed: number; progress: number } {
  const currentTier = getCurrentTier(totalXP)
  if (currentTier >= 30) return { current: totalXP, needed: 0, progress: 100 }

  const nextTier = BATTLE_TIERS[currentTier] // 0-indexed, so currentTier index = next tier
  const prevXP = currentTier > 0 ? BATTLE_TIERS[currentTier - 1].xpRequired : 0
  const tierXP = nextTier.xpRequired - prevXP
  const progressXP = totalXP - prevXP
  const progress = Math.min(Math.round((progressXP / tierXP) * 100), 100)

  return { current: progressXP, needed: tierXP, progress }
}

/** Get list of unclaimed rewards for a player */
export function getUnclaimedRewards(
  totalXP: number,
  isPremium: boolean,
  claimedTiers: number[] // tier numbers already claimed
): { tier: number; track: 'free' | 'premium'; reward: TierReward }[] {
  const currentTier = getCurrentTier(totalXP)
  const unclaimed: { tier: number; track: 'free' | 'premium'; reward: TierReward }[] = []

  for (const t of BATTLE_TIERS) {
    if (t.tier > currentTier) break

    if (t.freeReward && !claimedTiers.includes(t.tier)) {
      unclaimed.push({ tier: t.tier, track: 'free', reward: t.freeReward })
    }
    if (isPremium && t.premiumReward && !claimedTiers.includes(t.tier * 100)) {
      // premium claims stored as tier*100 to differentiate
      unclaimed.push({ tier: t.tier, track: 'premium', reward: t.premiumReward })
    }
  }

  return unclaimed
}

/** Format XP source for display */
export function formatXPSource(source: XPSource): string {
  const labels: Record<XPSource, string> = {
    match_win: 'Match Win',
    match_loss: 'Match Loss',
    daily_login: 'Daily Login',
    challenge_complete: 'Challenge Complete',
    login_streak_bonus: 'Login Streak',
  }
  return labels[source]
}

/** Calculate login streak bonus XP */
export function getStreakBonus(streakDays: number): number {
  return Math.min(streakDays, 30) * XP_SOURCES.login_streak_bonus
}

/** Check if season is active */
export function isSeasonActive(): boolean {
  const now = new Date()
  return now >= new Date(SEASON_CONFIG.startDate) && now <= new Date(SEASON_CONFIG.endDate)
}

/** Get time remaining in season */
export function getSeasonTimeRemaining(): { days: number; hours: number; minutes: number } {
  const now = new Date()
  const end = new Date(SEASON_CONFIG.endDate)
  const diff = Math.max(0, end.getTime() - now.getTime())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  }
}
