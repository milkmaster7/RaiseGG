// Achievement System for RaiseGG

import { createServiceClient } from '@/lib/supabase'

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type AchievementCategory = 'wins' | 'streaks' | 'social' | 'special'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  category: AchievementCategory
  /** For progressive achievements: the target count */
  target?: number
  /** Which stat field to read for progress (e.g. 'total_wins') */
  progressKey?: string
  /** If set, achievement is game-specific */
  game?: string | null
}

export const RARITY_COLORS: Record<AchievementRarity, { text: string; bg: string; border: string; glow: string }> = {
  common:    { text: 'text-gray-300',   bg: 'bg-gray-500/20',    border: 'border-gray-500',   glow: '' },
  rare:      { text: 'text-blue-400',   bg: 'bg-blue-500/20',    border: 'border-blue-500',   glow: 'shadow-blue-500/30' },
  epic:      { text: 'text-purple-400', bg: 'bg-purple-500/20',  border: 'border-purple-500', glow: 'shadow-purple-500/40' },
  legendary: { text: 'text-yellow-400', bg: 'bg-yellow-500/20',  border: 'border-yellow-500', glow: 'shadow-yellow-400/50' },
}

export const ACHIEVEMENTS: Achievement[] = [
  // ─── Win-based ──────────────────────────────────────────────
  { id: 'first_blood',        name: 'First Blood',        description: 'Win your first match',                      icon: '⚔️', rarity: 'common',    category: 'wins',    target: 1,    progressKey: 'total_wins' },
  { id: 'first_win',          name: 'First Win',           description: 'Win your very first match',                 icon: '🏆', rarity: 'common',    category: 'wins',    target: 1,    progressKey: 'total_wins' },
  { id: 'five_wins',          name: 'Five Wins',           description: 'Win 5 matches',                             icon: '⭐', rarity: 'common',    category: 'wins',    target: 5,    progressKey: 'total_wins' },
  { id: 'ten_wins',           name: 'Ten Wins',            description: 'Win 10 matches',                            icon: '🌟', rarity: 'common',    category: 'wins',    target: 10,   progressKey: 'total_wins' },
  { id: 'fifty_wins',         name: 'Fifty Wins',          description: 'Win 50 matches',                            icon: '🎖️', rarity: 'rare',      category: 'wins',    target: 50,   progressKey: 'total_wins' },
  { id: 'hundred_wins',       name: 'Hundred Wins',        description: 'Win 100 matches',                           icon: '💯', rarity: 'rare',      category: 'wins',    target: 100,  progressKey: 'total_wins' },
  { id: 'century',            name: 'Century',             description: 'Win 100 matches',                           icon: '💯', rarity: 'rare',      category: 'wins',    target: 100,  progressKey: 'total_wins' },
  { id: 'veteran',            name: 'Veteran',             description: 'Play 100 total matches',                    icon: '🎖️', rarity: 'rare',      category: 'wins',    target: 100,  progressKey: 'total_matches' },
  { id: 'legend',             name: 'Legend',              description: 'Win 500 matches',                           icon: '🏅', rarity: 'legendary', category: 'wins',    target: 500,  progressKey: 'total_wins' },

  // ─── Multi-game ─────────────────────────────────────────────
  { id: 'triple_threat_win',  name: 'Triple Threat',       description: 'Win matches in all 3 games',                icon: '🎮', rarity: 'rare',      category: 'wins' },
  { id: 'all_rounder',        name: 'All Rounder',         description: 'Win matches in all 3 games',                icon: '🎮', rarity: 'rare',      category: 'wins' },
  { id: 'triple_threat',      name: 'Triple Threat Gold',  description: 'Reach Gold in all 3 games',                 icon: '🌟', rarity: 'legendary', category: 'wins' },

  // ─── Streak-based ──────────────────────────────────────────
  { id: 'on_fire',            name: 'On Fire',             description: '3-win streak',                              icon: '🔥', rarity: 'common',    category: 'streaks', target: 3,    progressKey: 'best_streak' },
  { id: 'streak_3',           name: 'Hat Trick',           description: 'Achieve a 3-win streak',                    icon: '🔥', rarity: 'common',    category: 'streaks', target: 3,    progressKey: 'best_streak' },
  { id: 'streak_5',           name: 'Unstoppable',         description: 'Achieve a 5-win streak',                    icon: '⚡', rarity: 'rare',      category: 'streaks', target: 5,    progressKey: 'best_streak' },
  { id: 'unstoppable',        name: 'Unstoppable',         description: '7-win streak',                              icon: '⚡', rarity: 'rare',      category: 'streaks', target: 7,    progressKey: 'best_streak' },
  { id: 'streak_10',          name: 'Legendary Streak',    description: 'Achieve a 10-win streak',                   icon: '💀', rarity: 'epic',      category: 'streaks', target: 10,   progressKey: 'best_streak' },
  { id: 'dominator',          name: 'Dominator',           description: '15-win streak',                             icon: '💀', rarity: 'epic',      category: 'streaks', target: 15,   progressKey: 'best_streak' },

  // ─── Special ────────────────────────────────────────────────
  { id: 'underdog',           name: 'Underdog',            description: 'Beat a player 200+ ELO above you',          icon: '🐺', rarity: 'rare',      category: 'special' },
  { id: 'revenge',            name: 'Revenge',             description: 'Win a revenge match',                       icon: '🗡️', rarity: 'rare',      category: 'special' },
  { id: 'high_roller',        name: 'High Roller',         description: 'Win a $100+ stake match',                   icon: '💰', rarity: 'rare',      category: 'special' },
  { id: 'whale',              name: 'Whale',               description: 'Win a $500+ stake match',                   icon: '🐋', rarity: 'epic',      category: 'special' },
  { id: 'roulette_winner',    name: 'Roulette Winner',     description: 'Win a roulette match',                      icon: '🎰', rarity: 'common',    category: 'special' },
  { id: 'faucet_graduate',    name: 'Faucet Graduate',     description: 'Place your first real stake after faucet',  icon: '🎓', rarity: 'common',    category: 'special' },
  { id: 'city_champion',      name: 'City Champion',       description: 'Become the top player in your city',        icon: '🏙️', rarity: 'epic',      category: 'special' },
  { id: 'bounty_hunter',      name: 'Bounty Hunter',       description: 'Claim a bounty from the bounty board',      icon: '🎯', rarity: 'rare',      category: 'special' },
  { id: 'big_spender',        name: 'Big Spender',         description: 'Stake $1000+ total',                        icon: '💸', rarity: 'epic',      category: 'special', target: 1000, progressKey: 'total_staked' },

  // ─── Social ─────────────────────────────────────────────────
  { id: 'social_butterfly',   name: 'Social Butterfly',    description: 'Refer 3 players to the platform',           icon: '🦋', rarity: 'common',    category: 'social',  target: 3,    progressKey: 'referral_count' },
  { id: 'referral_king',      name: 'Referral King',       description: 'Refer 10 players',                          icon: '👑', rarity: 'rare',      category: 'social',  target: 10,   progressKey: 'referral_count' },
  { id: 'globe_trotter',      name: 'Globe Trotter',       description: 'Beat players from 5 different countries',   icon: '🌍', rarity: 'rare',      category: 'social',  target: 5,    progressKey: 'countries_beaten' },
  { id: 'clan_leader',        name: 'Clan Leader',         description: 'Create a clan',                             icon: '🏰', rarity: 'common',    category: 'social' },

  // ─── Login / streak ─────────────────────────────────────────
  { id: 'week_warrior',       name: 'Week Warrior',        description: '7-day login streak',                        icon: '📆', rarity: 'rare',      category: 'streaks', target: 7,    progressKey: 'login_streak' },
  { id: 'streak_master',      name: 'Streak Master',       description: '30-day login streak',                       icon: '📅', rarity: 'legendary', category: 'streaks', target: 30,   progressKey: 'login_streak' },

  // ─── ELO tiers ──────────────────────────────────────────────
  { id: 'diamond_rank',       name: 'Diamond Rank',        description: 'Reach Diamond ELO tier (1500+)',            icon: '💎', rarity: 'epic',      category: 'special' },
  { id: 'apex_predator',      name: 'Apex Predator',       description: 'Reach Apex ELO tier (1700+)',               icon: '🦅', rarity: 'legendary', category: 'special' },

  // ─── Misc ───────────────────────────────────────────────────
  { id: 'early_adopter',      name: 'Early Adopter',       description: 'Join during Season 1',                      icon: '🌟', rarity: 'rare',      category: 'special' },
  { id: 'premium_player',     name: 'Premium Player',      description: 'Subscribe to premium',                      icon: '⭐', rarity: 'common',    category: 'special' },
  { id: 'collector',          name: 'Collector',           description: 'Own 5+ cosmetics',                          icon: '🎨', rarity: 'common',    category: 'special', target: 5,    progressKey: 'cosmetics_count' },
  { id: 'tournament_victor',  name: 'Tournament Victor',   description: 'Win a tournament',                          icon: '🏆', rarity: 'epic',      category: 'special' },
  { id: 'tournament_regular', name: 'Tournament Regular',  description: 'Enter 5 tournaments',                       icon: '🎪', rarity: 'rare',      category: 'special', target: 5,    progressKey: 'tournament_entries' },
  { id: 'battle_pass_maxed',  name: 'Battle Pass Maxed',   description: 'Reach tier 30 in battle pass',              icon: '🎖️', rarity: 'legendary', category: 'special', target: 30,   progressKey: 'bp_tier' },
  { id: 'deadlock_pioneer',   name: 'Deadlock Pioneer',    description: 'Win 5 Deadlock matches',                    icon: '🔮', rarity: 'rare',      category: 'wins',    target: 5,    progressKey: 'deadlock_wins', game: 'deadlock' },
  { id: 'practice_player',    name: 'Practice Player',     description: 'Complete 10 practice matches',              icon: '🎯', rarity: 'common',    category: 'wins',    target: 10,   progressKey: 'practice_matches' },
  { id: 'challenger',         name: 'Challenger',          description: 'Send 5 direct challenges',                  icon: '📨', rarity: 'common',    category: 'social',  target: 5,    progressKey: 'challenges_sent' },
]

export const ACHIEVEMENTS_MAP = new Map(ACHIEVEMENTS.map(a => [a.id, a]))

export interface PlayerStats {
  total_wins: number
  total_matches: number
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
  total_staked: number
  practice_matches: number
  challenges_sent: number
  tournament_entries: number
  countries_beaten: number
  has_revenge_win: boolean
  has_roulette_win: boolean
  has_faucet_then_real: boolean
  is_city_champion: boolean
  has_bounty_claim: boolean
}

/** Compute which achievements a player has unlocked based on their stats */
export function computeUnlockedAchievements(stats: PlayerStats): string[] {
  const unlocked: string[] = []

  // Win-based
  if (stats.total_wins >= 1)   { unlocked.push('first_blood'); unlocked.push('first_win') }
  if (stats.total_wins >= 5)   unlocked.push('five_wins')
  if (stats.total_wins >= 10)  unlocked.push('ten_wins')
  if (stats.total_wins >= 50)  unlocked.push('fifty_wins')
  if (stats.total_wins >= 100) { unlocked.push('hundred_wins'); unlocked.push('century') }
  if (stats.total_wins >= 500) unlocked.push('legend')

  // Total matches (wins + losses)
  if (stats.total_matches >= 100) unlocked.push('veteran')

  // Streak-based
  if (stats.best_streak >= 3)  { unlocked.push('on_fire');  unlocked.push('streak_3') }
  if (stats.best_streak >= 5)  unlocked.push('streak_5')
  if (stats.best_streak >= 7)  unlocked.push('unstoppable')
  if (stats.best_streak >= 10) unlocked.push('streak_10')
  if (stats.best_streak >= 15) unlocked.push('dominator')

  // Stake-based
  if (stats.max_stake_won >= 100) unlocked.push('high_roller')
  if (stats.max_stake_won >= 500) unlocked.push('whale')

  // Login streak
  if (stats.login_streak >= 7)  unlocked.push('week_warrior')
  if (stats.login_streak >= 30) unlocked.push('streak_master')

  // Social
  if (stats.friends_count >= 10) unlocked.push('social_butterfly')
  if (stats.has_clan)            unlocked.push('clan_leader')
  if (stats.referral_count >= 3) unlocked.push('social_butterfly')
  if (stats.referral_count >= 10) unlocked.push('referral_king')

  // Globe trotter
  if (stats.countries_beaten >= 5) unlocked.push('globe_trotter')

  // Tournament
  if (stats.tournament_wins >= 1)    unlocked.push('tournament_victor')
  if (stats.tournament_entries >= 5) unlocked.push('tournament_regular')

  // Battle pass
  if (stats.bp_tier >= 30) unlocked.push('battle_pass_maxed')

  // Multi-game
  if (stats.cs2_wins > 0 && stats.dota2_wins > 0 && stats.deadlock_wins > 0) {
    unlocked.push('all_rounder')
    unlocked.push('triple_threat_win')
  }

  // Triple threat Gold — Gold (1100+) in all 3 games
  if (stats.cs2_elo >= 1100 && stats.dota2_elo >= 1100 && stats.deadlock_elo >= 1100) {
    unlocked.push('triple_threat')
  }

  // Underdog
  if (stats.max_elo_diff_won >= 200) unlocked.push('underdog')

  // Revenge
  if (stats.has_revenge_win) unlocked.push('revenge')

  // Roulette
  if (stats.has_roulette_win) unlocked.push('roulette_winner')

  // Faucet graduate
  if (stats.has_faucet_then_real) unlocked.push('faucet_graduate')

  // City champion
  if (stats.is_city_champion) unlocked.push('city_champion')

  // Bounty hunter
  if (stats.has_bounty_claim) unlocked.push('bounty_hunter')

  // Collector
  if (stats.cosmetics_count >= 5) unlocked.push('collector')

  // Premium
  if (stats.premium_until && new Date(stats.premium_until) > new Date()) {
    unlocked.push('premium_player')
  }

  // ELO tiers
  const peakElo = Math.max(stats.cs2_elo ?? 1000, stats.dota2_elo ?? 1000, stats.deadlock_elo ?? 1000)
  if (peakElo >= 1500) unlocked.push('diamond_rank')
  if (peakElo >= 1700) unlocked.push('apex_predator')

  // Early adopter — joined before Season 1 ends (May 1, 2026)
  if (stats.created_at && new Date(stats.created_at) < new Date('2026-05-01T00:00:00Z')) {
    unlocked.push('early_adopter')
  }

  // Deadlock
  if (stats.deadlock_wins >= 5) unlocked.push('deadlock_pioneer')

  // Spending
  if (stats.total_staked >= 1000) unlocked.push('big_spender')

  // Practice
  if (stats.practice_matches >= 10) unlocked.push('practice_player')

  // Challenges sent
  if (stats.challenges_sent >= 5) unlocked.push('challenger')

  // Deduplicate
  return [...new Set(unlocked)]
}

/** Get progress value for progressive achievements */
export function getAchievementProgressValue(achievement: Achievement, stats: PlayerStats): number {
  if (!achievement.progressKey || !achievement.target) return 0
  const value = (stats as unknown as Record<string, unknown>)[achievement.progressKey]
  return typeof value === 'number' ? Math.min(value, achievement.target) : 0
}

/** Find newly unlocked achievements by comparing current unlocks against saved */
export function getNewlyUnlocked(currentUnlocks: string[], savedAchievements: string[]): string[] {
  const savedSet = new Set(savedAchievements)
  return currentUnlocks.filter(id => !savedSet.has(id))
}

// ─── Server-side DB functions ──────────────────────────────────────────────────

/** Build full PlayerStats from the database for a given player */
export async function buildPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const db = createServiceClient()

  // Fetch player base stats
  const { data: player } = await db
    .from('players')
    .select(`
      cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses,
      cs2_elo, dota2_elo, deadlock_elo,
      best_streak, login_streak, premium_until, created_at, country
    `)
    .eq('id', playerId)
    .single()

  if (!player) return null

  // Count friends
  const { count: friendsCount } = await db
    .from('friends')
    .select('id', { count: 'exact', head: true })
    .or(`player_id.eq.${playerId},friend_id.eq.${playerId}`)
    .eq('status', 'accepted')

  // Count cosmetics owned
  const { count: cosmeticsCount } = await db
    .from('player_cosmetics')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)

  // Count referrals
  const { count: referralCount } = await db
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', playerId)

  // Check clan ownership
  const { count: clanCount } = await db
    .from('clans')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', playerId)

  // Tournament wins
  const { count: tournamentWins } = await db
    .from('tournaments')
    .select('id', { count: 'exact', head: true })
    .eq('winner_id', playerId)
    .eq('status', 'completed')

  // Max stake won
  const { data: maxStakeMatch } = await db
    .from('matches')
    .select('stake_amount')
    .eq('winner_id', playerId)
    .eq('status', 'completed')
    .order('stake_amount', { ascending: false })
    .limit(1)
    .single()

  // Battle pass tier
  const { data: bpProgress } = await db
    .from('battle_pass_progress')
    .select('total_xp')
    .eq('player_id', playerId)
    .order('season', { ascending: false })
    .limit(1)
    .single()

  const bpTier = bpProgress ? Math.floor((bpProgress.total_xp ?? 0) / 100) : 0

  const totalWins = (player.cs2_wins ?? 0) + (player.dota2_wins ?? 0) + (player.deadlock_wins ?? 0)
  const totalLosses = (player.cs2_losses ?? 0) + (player.dota2_losses ?? 0) + (player.deadlock_losses ?? 0)
  const totalMatches = totalWins + totalLosses

  // Countries beaten — unique countries of opponents this player has beaten
  const { data: opponentCountries } = await db
    .from('matches')
    .select('player_a_id, player_b_id')
    .eq('winner_id', playerId)
    .eq('status', 'completed')

  let countriesBeaten = 0
  if (opponentCountries && opponentCountries.length > 0) {
    const opponentIds = opponentCountries.map(m =>
      m.player_a_id === playerId ? m.player_b_id : m.player_a_id
    ).filter(Boolean)

    if (opponentIds.length > 0) {
      const { data: opponentPlayers } = await db
        .from('players')
        .select('country')
        .in('id', [...new Set(opponentIds)])
        .not('country', 'is', null)

      const uniqueCountries = new Set((opponentPlayers ?? []).map(p => p.country).filter(Boolean))
      countriesBeaten = uniqueCountries.size
    }
  }

  // Revenge win check — player won a revenge challenge
  const { count: revengeWins } = await db
    .from('revenge_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .eq('challenger_id', playerId)

  // Roulette win — won a match that came from roulette queue
  // We approximate: check if player has ever been in roulette_queue AND has a win
  const { count: rouletteEntries } = await db
    .from('roulette_queue')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', playerId)

  // Faucet graduate — used faucet AND has a real stake match win
  const { count: faucetCount } = await db
    .from('faucet_claims')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)

  const hasFaucetThenReal = (faucetCount ?? 0) > 0 && totalWins > 0

  // City champion — check if player is #1 in their city by peak ELO
  let isCityChampion = false
  if (player.country) {
    // Simplified: check if this player has the highest peak ELO among players in same country
    // A full city check would need a city column; we use country as proxy
    const peakElo = Math.max(player.cs2_elo ?? 1000, player.dota2_elo ?? 1000, player.deadlock_elo ?? 1000)
    if (peakElo > 1000) {
      const { data: topInCountry } = await db
        .from('players')
        .select('id')
        .eq('country', player.country)
        .or(`cs2_elo.gte.${peakElo},dota2_elo.gte.${peakElo},deadlock_elo.gte.${peakElo}`)
        .neq('id', playerId)
        .limit(1)

      isCityChampion = !topInCountry || topInCountry.length === 0
    }
  }

  // Bounty claim check
  const { count: bountyClaimCount } = await db
    .from('bounty_claims')
    .select('id', { count: 'exact', head: true })
    .eq('claimer_id', playerId)

  // Tournament entries
  const { count: tournamentEntries } = await db
    .from('tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)

  return {
    total_wins: totalWins,
    total_matches: totalMatches,
    best_streak: player.best_streak ?? 0,
    login_streak: player.login_streak ?? 0,
    friends_count: friendsCount ?? 0,
    cosmetics_count: cosmeticsCount ?? 0,
    referral_count: referralCount ?? 0,
    bp_tier: bpTier,
    cs2_wins: player.cs2_wins ?? 0,
    dota2_wins: player.dota2_wins ?? 0,
    deadlock_wins: player.deadlock_wins ?? 0,
    cs2_elo: player.cs2_elo ?? 1000,
    dota2_elo: player.dota2_elo ?? 1000,
    deadlock_elo: player.deadlock_elo ?? 1000,
    premium_until: player.premium_until,
    has_clan: (clanCount ?? 0) > 0,
    tournament_wins: tournamentWins ?? 0,
    max_stake_won: maxStakeMatch ? Number(maxStakeMatch.stake_amount) : 0,
    max_elo_diff_won: 0, // TODO: store on match resolution
    created_at: player.created_at,
    total_staked: 0, // TODO: aggregate from transactions
    practice_matches: 0, // TODO: count is_practice matches
    challenges_sent: 0, // TODO: count challenge_links
    tournament_entries: tournamentEntries ?? 0,
    countries_beaten: countriesBeaten,
    has_revenge_win: (revengeWins ?? 0) > 0,
    has_roulette_win: (rouletteEntries ?? 0) > 0 && totalWins > 0,
    has_faucet_then_real: hasFaucetThenReal,
    is_city_champion: isCityChampion,
    has_bounty_claim: (bountyClaimCount ?? 0) > 0,
  }
}

/**
 * Check all conditions and award any newly earned achievements.
 * Returns the list of newly awarded achievement IDs.
 */
export async function checkAndAwardAchievements(playerId: string): Promise<string[]> {
  const stats = await buildPlayerStats(playerId)
  if (!stats) return []

  const currentUnlocks = computeUnlockedAchievements(stats)

  const db = createServiceClient()

  // Get saved achievements from DB
  const { data: savedRows } = await db
    .from('player_achievements')
    .select('achievement')
    .eq('player_id', playerId)

  const savedAchievements = (savedRows ?? []).map(r => r.achievement)
  const newlyUnlocked = getNewlyUnlocked(currentUnlocks, savedAchievements)

  // Insert newly detected achievements
  if (newlyUnlocked.length > 0) {
    const inserts = newlyUnlocked.map(id => ({
      player_id: playerId,
      achievement: id,
      achievement_id: id,
      unlocked_at: new Date().toISOString(),
    }))
    await db.from('player_achievements').upsert(inserts, {
      onConflict: 'player_id,achievement',
      ignoreDuplicates: true,
    })
  }

  return newlyUnlocked
}

/**
 * Returns all unlocked achievements for a player, with unlock dates.
 */
export async function getPlayerAchievements(playerId: string): Promise<Array<{
  achievement_id: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  category: AchievementCategory
  unlocked_at: string
}>> {
  const db = createServiceClient()

  const { data: rows } = await db
    .from('player_achievements')
    .select('achievement, earned_at, unlocked_at')
    .eq('player_id', playerId)

  if (!rows || rows.length === 0) return []

  return rows
    .map(r => {
      const def = ACHIEVEMENTS_MAP.get(r.achievement)
      if (!def) return null
      return {
        achievement_id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
        category: def.category,
        unlocked_at: r.unlocked_at ?? r.earned_at,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}

/**
 * Returns all achievements with progress percentage for a player.
 */
export async function getAchievementProgress(playerId: string): Promise<Array<{
  achievement_id: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  category: AchievementCategory
  target: number | null
  current: number
  progress: number // 0-100
  unlocked: boolean
  unlocked_at: string | null
}>> {
  const stats = await buildPlayerStats(playerId)
  if (!stats) return []

  const currentUnlocks = new Set(computeUnlockedAchievements(stats))

  const db = createServiceClient()
  const { data: savedRows } = await db
    .from('player_achievements')
    .select('achievement, earned_at, unlocked_at')
    .eq('player_id', playerId)

  const savedMap = new Map(
    (savedRows ?? []).map(r => [r.achievement, r.unlocked_at ?? r.earned_at])
  )

  return ACHIEVEMENTS.map(a => {
    const isUnlocked = currentUnlocks.has(a.id) || savedMap.has(a.id)
    let current = 0
    let progress = 0

    if (a.target && a.progressKey) {
      current = getAchievementProgressValue(a, stats)
      progress = Math.min(Math.round((current / a.target) * 100), 100)
    } else {
      // Boolean achievements: either 0% or 100%
      progress = isUnlocked ? 100 : 0
      current = isUnlocked ? 1 : 0
    }

    return {
      achievement_id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      rarity: a.rarity,
      category: a.category,
      target: a.target ?? null,
      current,
      progress,
      unlocked: isUnlocked,
      unlocked_at: savedMap.get(a.id) ?? null,
    }
  })
}
