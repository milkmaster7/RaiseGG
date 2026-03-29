import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import {
  computeUnlockedAchievements,
  getNewlyUnlocked,
  type PlayerStats,
} from '@/lib/achievements'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ unlocked: [], stats: null, newlyUnlocked: [] })
  }

  const db = createServiceClient()

  // Fetch player base stats
  const { data: player } = await db
    .from('players')
    .select(`
      cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses,
      cs2_elo, dota2_elo, deadlock_elo,
      best_streak, login_streak, premium_until, created_at
    `)
    .eq('id', playerId)
    .single()

  if (!player) {
    return NextResponse.json({ unlocked: [], stats: null, newlyUnlocked: [] })
  }

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

  // Max ELO diff won (underdog check) — approximate from completed matches
  let maxEloDiffWon = 0
  // We check for matches where this player won and the opponent had higher ELO
  // This is a simplified check — in production we'd store elo_at_match on the match
  // For now, use 0 and let the column be set by match resolution logic

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

  const stats: PlayerStats = {
    total_wins: totalWins,
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
    max_elo_diff_won: maxEloDiffWon,
    created_at: player.created_at,
  }

  // Compute which achievements are unlocked
  const currentUnlocks = computeUnlockedAchievements(stats)

  // Get saved achievements from DB
  const { data: savedRows } = await db
    .from('player_achievements')
    .select('achievement, earned_at')
    .eq('player_id', playerId)

  const savedAchievements = (savedRows ?? []).map(r => r.achievement)

  // Find newly unlocked
  const newlyUnlocked = getNewlyUnlocked(currentUnlocks, savedAchievements)

  // Insert newly detected achievements
  if (newlyUnlocked.length > 0) {
    const inserts = newlyUnlocked.map(id => ({
      player_id: playerId,
      achievement: id,
    }))
    await db.from('player_achievements').insert(inserts).throwOnError()
  }

  // Build unlocked list with earned_at
  const allSaved = [
    ...(savedRows ?? []).map(r => ({ achievement_id: r.achievement, earned_at: r.earned_at })),
    ...newlyUnlocked.map(id => ({ achievement_id: id, earned_at: new Date().toISOString() })),
  ]

  return NextResponse.json({
    unlocked: allSaved,
    stats,
    newlyUnlocked,
  })
}
