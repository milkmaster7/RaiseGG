export const ACHIEVEMENTS: Record<string, { label: string; desc: string; emoji: string }> = {
  first_win:    { label: 'First Blood',  desc: 'Won your first match',    emoji: '⚔️' },
  wins_10:      { label: 'Veteran',      desc: 'Won 10 matches',          emoji: '🏆' },
  wins_50:      { label: 'Elite',        desc: 'Won 50 matches',          emoji: '💎' },
  streak_5:     { label: 'On Fire',      desc: '5-win streak',            emoji: '🔥' },
  streak_10:    { label: 'Unstoppable',  desc: '10-win streak',           emoji: '⚡' },
  diamond_rank: { label: 'Diamond',      desc: 'Reached Diamond (1500+)', emoji: '💠' },
  apex_rank:    { label: 'Apex',         desc: 'Reached Apex (1700+)',    emoji: '👑' },
  multi_game:   { label: 'Versatile',    desc: 'Won in 2+ games',         emoji: '🎮' },
}

export function computeAchievements(player: {
  cs2_wins: number
  dota2_wins: number
  deadlock_wins: number
  cs2_elo: number
  dota2_elo: number
  deadlock_elo: number
  best_streak?: number
}): string[] {
  const achieved: string[] = []
  const totalWins = (player.cs2_wins ?? 0) + (player.dota2_wins ?? 0) + (player.deadlock_wins ?? 0)
  if (totalWins >= 1)  achieved.push('first_win')
  if (totalWins >= 10) achieved.push('wins_10')
  if (totalWins >= 50) achieved.push('wins_50')
  const peakElo = Math.max(player.cs2_elo ?? 1000, player.dota2_elo ?? 1000, player.deadlock_elo ?? 1000)
  if (peakElo >= 1500) achieved.push('diamond_rank')
  if (peakElo >= 1700) achieved.push('apex_rank')
  if ((player.best_streak ?? 0) >= 5)  achieved.push('streak_5')
  if ((player.best_streak ?? 0) >= 10) achieved.push('streak_10')
  const gamesWithWins = [(player.cs2_wins ?? 0), (player.dota2_wins ?? 0), (player.deadlock_wins ?? 0)].filter(w => w > 0).length
  if (gamesWithWins >= 2) achieved.push('multi_game')
  return achieved
}

export function AchievementBadge({ achievementKey }: { achievementKey: string }) {
  const a = ACHIEVEMENTS[achievementKey]
  if (!a) return null
  return (
    <div className="flex items-center gap-1.5 bg-space-800 border border-border rounded px-2 py-1" title={a.desc}>
      <span>{a.emoji}</span>
      <span className="text-xs font-semibold text-white">{a.label}</span>
    </div>
  )
}
