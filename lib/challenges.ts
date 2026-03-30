// Challenge templates — daily + weekly rotation
// Challenges award XP; Missions (see lib/missions.ts) award RaisePoints (RP).
// The "Complete a Challenge" mission type tracks completions from this system,
// creating a natural loop: challenges → mission progress → RP rewards.

export interface ChallengeTemplate {
  title: string
  description: string
  game: string | null
  challenge_type: string
  target: number
  xp_reward: string
  difficulty: 'easy' | 'medium' | 'hard'
}

// 15 daily challenge templates (5 shown per day, rotated)
export const DAILY_CHALLENGES: ChallengeTemplate[] = [
  { title: 'Win a Match',         description: 'Win any stake match today.',                game: null,    challenge_type: 'win_match',     target: 1,  xp_reward: '+50 XP',  difficulty: 'easy' },
  { title: 'Play 2 Matches',      description: 'Complete 2 matches (win or lose).',          game: null,    challenge_type: 'play_match',    target: 2,  xp_reward: '+30 XP',  difficulty: 'easy' },
  { title: 'CS2 Victory',         description: 'Win a CS2 stake match.',                     game: 'cs2',   challenge_type: 'win_match',     target: 1,  xp_reward: '+60 XP',  difficulty: 'easy' },
  { title: 'Dota 2 Victory',      description: 'Win a Dota 2 stake match.',                  game: 'dota2', challenge_type: 'win_match',     target: 1,  xp_reward: '+60 XP',  difficulty: 'easy' },
  { title: 'High Stakes',         description: 'Play a match with $10+ stake.',              game: null,    challenge_type: 'stake_amount',  target: 10, xp_reward: '+80 XP',  difficulty: 'medium' },
  { title: 'Win Streak',          description: 'Win 2 matches in a row today.',              game: null,    challenge_type: 'win_streak',    target: 2,  xp_reward: '+100 XP', difficulty: 'medium' },
  { title: 'Double Up',           description: 'Win 2 matches today.',                       game: null,    challenge_type: 'win_match',     target: 2,  xp_reward: '+90 XP',  difficulty: 'medium' },
  { title: 'Stake Champion',      description: 'Play any match with a $5+ stake.',           game: null,    challenge_type: 'stake_amount',  target: 5,  xp_reward: '+50 XP',  difficulty: 'easy' },
  { title: 'Active Player',       description: 'Complete 3 matches today.',                  game: null,    challenge_type: 'play_match',    target: 3,  xp_reward: '+70 XP',  difficulty: 'medium' },
  { title: 'Underdog Hunter',     description: 'Beat a player ranked higher than you.',      game: null,    challenge_type: 'beat_higher',   target: 1,  xp_reward: '+120 XP', difficulty: 'hard' },
  { title: 'Grinder',             description: 'Play 5 matches today.',                      game: null,    challenge_type: 'play_match',    target: 5,  xp_reward: '+150 XP', difficulty: 'hard' },
  { title: 'Multi-Game Day',      description: 'Play matches in 2 different games.',         game: null,    challenge_type: 'multi_game',    target: 2,  xp_reward: '+100 XP', difficulty: 'medium' },
  { title: 'Big Spender',         description: 'Play a match with $25+ stake.',              game: null,    challenge_type: 'stake_amount',  target: 25, xp_reward: '+120 XP', difficulty: 'hard' },
  { title: 'Perfect Day',         description: 'Win 3 matches without losing.',              game: null,    challenge_type: 'win_streak',    target: 3,  xp_reward: '+200 XP', difficulty: 'hard' },
  { title: 'Practice Makes Perfect', description: 'Play a practice match.',                  game: null,    challenge_type: 'practice',      target: 1,  xp_reward: '+20 XP',  difficulty: 'easy' },
]

// Weekly challenges (reset every Monday)
export const WEEKLY_CHALLENGES: ChallengeTemplate[] = [
  { title: 'Weekly Warrior',       description: 'Win 10 matches this week.',                 game: null,    challenge_type: 'win_match',     target: 10, xp_reward: '+500 XP', difficulty: 'hard' },
  { title: 'Weekly Grinder',       description: 'Play 20 matches this week.',                game: null,    challenge_type: 'play_match',    target: 20, xp_reward: '+400 XP', difficulty: 'hard' },
  { title: 'CS2 Specialist',       description: 'Win 5 CS2 matches this week.',              game: 'cs2',   challenge_type: 'win_match',     target: 5,  xp_reward: '+300 XP', difficulty: 'medium' },
  { title: 'Dota 2 Specialist',    description: 'Win 5 Dota 2 matches this week.',           game: 'dota2', challenge_type: 'win_match',     target: 5,  xp_reward: '+300 XP', difficulty: 'medium' },
  { title: 'High Roller Week',     description: 'Win $50+ total in stakes this week.',       game: null,    challenge_type: 'total_winnings', target: 50, xp_reward: '+350 XP', difficulty: 'hard' },
  { title: 'Social Player',        description: 'Challenge 3 friends this week.',            game: null,    challenge_type: 'challenge_friend', target: 3, xp_reward: '+200 XP', difficulty: 'medium' },
]

// Get today's 5 daily challenge templates
export function getTodaysChallenges() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const offset = (dayOfYear * 5) % DAILY_CHALLENGES.length
  const selected: ChallengeTemplate[] = []
  for (let i = 0; i < 5; i++) {
    selected.push(DAILY_CHALLENGES[(offset + i) % DAILY_CHALLENGES.length])
  }
  return selected.map((t, i) => ({
    ...t,
    slot: i + 1,
    challenge_date: new Date().toISOString().split('T')[0],
    is_weekly: false,
  }))
}

// Get this week's 3 weekly challenges
export function getWeeklyChallenges() {
  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000))
  const offset = (weekOfYear * 3) % WEEKLY_CHALLENGES.length
  const selected: ChallengeTemplate[] = []
  for (let i = 0; i < 3; i++) {
    selected.push(WEEKLY_CHALLENGES[(offset + i) % WEEKLY_CHALLENGES.length])
  }
  // Week start = Monday
  const now = new Date()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7))
  const weekStart = monday.toISOString().split('T')[0]

  return selected.map((t, i) => ({
    ...t,
    slot: 100 + i + 1, // weekly slots start at 101
    challenge_date: weekStart,
    is_weekly: true,
  }))
}
