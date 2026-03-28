// 9 rotating challenge templates — 3 shown per day, rotated by day-of-year
export const CHALLENGE_TEMPLATES = [
  { title: 'Win a Match',        description: 'Win any stake match today.',              game: null,    challenge_type: 'win_match',    target: 1, xp_reward: '+50 ELO' },
  { title: 'Play 2 Matches',     description: 'Complete 2 matches (win or lose).',       game: null,    challenge_type: 'play_match',   target: 2, xp_reward: '+30 ELO' },
  { title: 'CS2 Victory',        description: 'Win a CS2 stake match.',                  game: 'cs2',   challenge_type: 'win_match',    target: 1, xp_reward: '+60 ELO' },
  { title: 'Dota 2 Victory',     description: 'Win a Dota 2 stake match.',               game: 'dota2', challenge_type: 'win_match',    target: 1, xp_reward: '+60 ELO' },
  { title: 'High Stakes',        description: 'Play a match with $10+ stake.',           game: null,    challenge_type: 'stake_amount', target: 10, xp_reward: '+80 ELO' },
  { title: 'Win Streak',         description: 'Win 2 matches in a row today.',           game: null,    challenge_type: 'win_streak',   target: 2, xp_reward: '+100 ELO' },
  { title: 'Double Up',          description: 'Win 2 matches today.',                    game: null,    challenge_type: 'win_match',    target: 2, xp_reward: '+90 ELO' },
  { title: 'Stake Champion',     description: 'Play any match with a $5+ stake.',        game: null,    challenge_type: 'stake_amount', target: 5, xp_reward: '+50 ELO' },
  { title: 'Active Player',      description: 'Complete 3 matches this day.',            game: null,    challenge_type: 'play_match',   target: 3, xp_reward: '+70 ELO' },
]

// Get today's 3 challenge templates based on day-of-year rotation
export function getTodaysChallenges() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const offset = dayOfYear % 3 // rotate in groups of 3
  return CHALLENGE_TEMPLATES.slice(offset * 3, offset * 3 + 3).map((t, i) => ({
    ...t,
    slot: i + 1,
    challenge_date: new Date().toISOString().split('T')[0],
  }))
}
