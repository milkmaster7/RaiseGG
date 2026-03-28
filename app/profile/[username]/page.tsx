import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { personSchema, breadcrumbSchema } from '@/lib/schemas'
import { TierBadge } from '@/components/ui/Badge'
import { MatchCard } from '@/components/matches/MatchCard'
import { ChallengeButton } from '@/components/matches/ChallengeButton'
import { createServiceClient } from '@/lib/supabase'
import { readSessionFromCookies } from '@/lib/session'
import { computeAchievements, AchievementBadge } from '@/components/ui/AchievementBadge'
import type { Game, Match } from '@/types'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = createServiceClient()
  const { data: player } = await supabase
    .from('players')
    .select('username, cs2_elo, dota2_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses, country')
    .eq('username', username)
    .single()

  if (!player) return { title: 'Player Not Found' }

  const total = player.cs2_wins + player.cs2_losses
  const wr = total > 0 ? Math.round((player.cs2_wins / total) * 100) : 0
  const totalMatches = (player.cs2_wins + player.cs2_losses + player.dota2_wins + player.dota2_losses + player.deadlock_wins + player.deadlock_losses)

  return {
    title: `${player.username} — Player Profile`,
    description: `${player.username}'s RaiseGG.gg profile. ${player.cs2_wins} wins, ${wr}% win rate${player.country ? `, ${player.country}` : ''}. View match history and rankings.`,
    alternates: { canonical: `https://raisegg.gg/profile/${username}` },
    robots: totalMatches === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${player.username} | RaiseGG.gg`,
      description: `View ${player.username}'s stake match history and rankings.`,
      url: `https://raisegg.gg/profile/${username}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(player.username)}&sub=RaiseGG+Profile&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${player.username} | RaiseGG.gg`,
      images: [`/api/og?title=${encodeURIComponent(player.username)}&sub=RaiseGG+Profile&color=7b61ff`],
    },
  }
}

const GAMES: Game[] = ['cs2', 'dota2', 'deadlock']
const GAME_LABELS = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = createServiceClient()

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('username', username)
    .single()

  if (!player) notFound()

  // Noindex thin profiles (no matches played)
  const totalMatches = GAMES.reduce((sum, g) => sum + (player[`${g}_wins`] ?? 0) + (player[`${g}_losses`] ?? 0), 0)

  const { data: recentMatches } = await supabase
    .from('matches')
    .select('*, player_a:players!player_a_id(*), player_b:players!player_b_id(*)')
    .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
    .eq('status', 'completed')
    .order('resolved_at', { ascending: false })
    .limit(10)

  // Head-to-head with logged-in player
  const cookieStore = await cookies()
  const loggedInPlayerId = await readSessionFromCookies(cookieStore)
  let h2hMyWins = 0
  let h2hTheirWins = 0
  let showH2H = false

  if (loggedInPlayerId && loggedInPlayerId !== player.id) {
    const { data: h2h } = await supabase
      .from('matches')
      .select('winner_id')
      .eq('status', 'completed')
      .or(`and(player_a_id.eq.${loggedInPlayerId},player_b_id.eq.${player.id}),and(player_a_id.eq.${player.id},player_b_id.eq.${loggedInPlayerId})`)

    if (h2h && h2h.length > 0) {
      showH2H = true
      for (const m of h2h) {
        if (m.winner_id === loggedInPlayerId) h2hMyWins++
        else if (m.winner_id === player.id) h2hTheirWins++
      }
    }
  }

  const achievements = computeAchievements({
    cs2_wins:      player.cs2_wins ?? 0,
    dota2_wins:    player.dota2_wins ?? 0,
    deadlock_wins: player.deadlock_wins ?? 0,
    cs2_elo:       player.cs2_elo ?? 1000,
    dota2_elo:     player.dota2_elo ?? 1000,
    deadlock_elo:  player.deadlock_elo ?? 1000,
    best_streak:   player.best_streak ?? 0,
  })

  const pSchema = personSchema({
    username: player.username,
    avatarUrl: player.avatar_url,
    games: ['Counter-Strike 2', 'Dota 2', 'Deadlock'],
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home',    url: 'https://raisegg.gg' },
    { name: 'Players', url: 'https://raisegg.gg/leaderboard' },
    { name: player.username, url: `https://raisegg.gg/profile/${username}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Player header */}
        <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
          {player.avatar_url && (
            <Image
              src={player.avatar_url}
              alt={player.username}
              width={80}
              height={80}
              className="rounded-full border-2 border-accent-cyan/30"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="font-orbitron text-2xl font-black text-white">{player.username}</h1>
              {player.country && <span className="text-muted text-sm">{player.country}</span>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {GAMES.map((g) => (
                  <TierBadge key={g} elo={player[`${g}_elo`] ?? 1000} />
                ))}
              </div>
              <ChallengeButton profileUsername={player.username} />
            </div>
          </div>
        </div>

        {/* Stats per game */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {GAMES.map((g) => {
            const elo = player[`${g}_elo`] ?? 1000
            const wins = player[`${g}_wins`] ?? 0
            const losses = player[`${g}_losses`] ?? 0
            const total = wins + losses
            const wr = total > 0 ? Math.round((wins / total) * 100) : 0
            return (
              <div key={g} className="card">
                <div className="font-orbitron text-xs text-muted uppercase tracking-widest mb-3">{GAME_LABELS[g]}</div>
                <div className="font-orbitron text-2xl font-bold text-gradient mb-1">{elo}</div>
                <div className="text-xs text-muted mb-2">ELO</div>
                <TierBadge elo={elo} />
                <div className="divider" />
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">{wins}W</span>
                  <span className="text-muted">{wr}%</span>
                  <span className="text-red-400">{losses}L</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="card mb-8">
            <h2 className="font-orbitron font-bold text-white text-sm mb-4">Achievements</h2>
            <div className="flex flex-wrap gap-2">
              {achievements.map(key => <AchievementBadge key={key} achievementKey={key} />)}
            </div>
          </div>
        )}

        {/* Head-to-head */}
        {showH2H && (
          <div className="card mb-8 flex items-center justify-between gap-4">
            <div>
              <div className="font-orbitron text-xs text-muted uppercase tracking-widest mb-1">Your record vs {player.username}</div>
              <div className="font-orbitron text-xl font-bold">
                <span className="text-green-400">{h2hMyWins}W</span>
                <span className="text-muted mx-2">–</span>
                <span className="text-red-400">{h2hTheirWins}L</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent matches */}
        <h2 className="font-orbitron text-xl font-bold text-white mb-4">Recent Matches</h2>
        {!recentMatches || recentMatches.length === 0 ? (
          <div className="card text-center py-12 text-muted">No matches played yet.</div>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((m) => (
              <MatchCard key={m.id} match={m as Match} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
