import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { readSessionFromCookies } from '@/lib/session'
import { Zap, Trophy, Wallet, Clock } from 'lucide-react'
import { EloTrendWidget } from '@/components/ui/EloTrendWidget'
import { OnboardingWrapper } from '@/components/ui/OnboardingWrapper'
import { ChallengesWidget } from '@/components/ui/ChallengesWidget'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your RaiseGG.gg dashboard.',
  alternates: { canonical: 'https://raisegg.gg/dashboard' },
  robots: { index: false, follow: false },
}

const QUICK_LINKS = [
  { href: '/play',              label: 'Find a Match',  icon: Zap,    desc: 'Browse open lobbies and join a stake match.' },
  { href: '/dashboard/wallet',  label: 'Wallet',        icon: Wallet, desc: 'Deposit or withdraw USDC/USDT.' },
  { href: '/dashboard/matches', label: 'Match History', icon: Clock,  desc: 'View your past matches and results.' },
  { href: '/leaderboard',       label: 'Leaderboard',   icon: Trophy, desc: 'See how you rank against other players.' },
]

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)
  if (!playerId) redirect('/api/auth/steam')

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('username, usdc_balance, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses, current_streak, best_streak')
    .eq('id', playerId)
    .single()

  const totalWins    = (player?.cs2_wins ?? 0) + (player?.dota2_wins ?? 0) + (player?.deadlock_wins ?? 0)
  const totalLosses  = (player?.cs2_losses ?? 0) + (player?.dota2_losses ?? 0) + (player?.deadlock_losses ?? 0)
  const totalMatches = totalWins + totalLosses
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) + '%' : '—'
  const balance      = '$' + Number(player?.usdc_balance ?? 0).toFixed(2)
  const currentStreak = player?.current_streak ?? 0

  const crumbs = breadcrumbSchema([
    { name: 'Home',      url: 'https://raisegg.gg' },
    { name: 'Dashboard', url: 'https://raisegg.gg/dashboard' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <OnboardingWrapper hasBalance={Number(player?.usdc_balance ?? 0) > 0} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Dashboard</h1>
        <p className="text-muted mb-10">
          Welcome back{player?.username ? `, ${player.username}` : ''}. Ready to compete?
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {[
            { label: 'Balance',        value: balance,                           accent: true },
            { label: 'Total Matches',  value: String(totalMatches)                            },
            { label: 'Win Rate',       value: winRate                                         },
            { label: 'Peak ELO',       value: String(Math.max(player?.cs2_elo ?? 1000, player?.dota2_elo ?? 1000, player?.deadlock_elo ?? 1000)) },
            { label: 'Current Streak', value: currentStreak > 0 ? `🔥 ${currentStreak}` : String(currentStreak) },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className={`font-orbitron text-2xl font-bold mb-1 ${stat.accent ? 'text-gradient' : 'text-white'}`}>
                {stat.value}
              </div>
              <div className="text-xs text-muted uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ELO Trend */}
        <div className="card mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-orbitron font-bold text-white text-sm">CS2 ELO Trend</h2>
            <span className="text-xs text-muted">Last 30 matches</span>
          </div>
          <EloTrendWidget playerId={playerId} />
        </div>

        {/* Daily Challenges */}
        <ChallengesWidget />

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="card-hover group block">
              <link.icon className="w-6 h-6 text-accent-purple mb-3 group-hover:text-accent-purple-glow transition-colors" />
              <div className="font-orbitron font-bold text-white text-sm mb-1">{link.label}</div>
              <div className="text-muted text-xs leading-relaxed">{link.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
