import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { Zap, Trophy, Wallet, Clock } from 'lucide-react'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-min-32-chars'
)

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your RaiseGG.gg dashboard.',
  alternates: { canonical: 'https://raisegg.gg/dashboard' },
  robots: { index: false, follow: false },
}

const QUICK_LINKS = [
  { href: '/play',              label: 'Find a Match',  icon: Zap,    desc: 'Browse open lobbies and join a stake match.' },
  { href: '/dashboard/wallet',  label: 'Wallet',        icon: Wallet, desc: 'Deposit or withdraw USDC.' },
  { href: '/dashboard/matches', label: 'Match History', icon: Clock,  desc: 'View your past matches and results.' },
  { href: '/leaderboard',       label: 'Leaderboard',   icon: Trophy, desc: 'See how you rank against other players.' },
]

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('rgg_session')?.value
  if (!token) redirect('/api/auth/steam')

  let playerId: string
  try {
    const { payload } = await jwtVerify(token, SECRET)
    playerId = payload.playerId as string
  } catch {
    redirect('/api/auth/steam')
  }

  const db = createServiceClient()
  const { data: player } = await db
    .from('players')
    .select('username, usdc_balance, cs2_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses')
    .eq('id', playerId)
    .single()

  const totalWins    = (player?.cs2_wins ?? 0) + (player?.dota2_wins ?? 0)
  const totalLosses  = (player?.cs2_losses ?? 0) + (player?.dota2_losses ?? 0)
  const totalMatches = totalWins + totalLosses
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) + '%' : '—'
  const balance      = '$' + Number(player?.usdc_balance ?? 0).toFixed(2)

  const crumbs = breadcrumbSchema([
    { name: 'Home',      url: 'https://raisegg.gg' },
    { name: 'Dashboard', url: 'https://raisegg.gg/dashboard' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Dashboard</h1>
        <p className="text-muted mb-10">
          Welcome back{player?.username ? `, ${player.username}` : ''}. Ready to compete?
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'USDC Balance',  value: balance,                          accent: true },
            { label: 'Total Matches', value: String(totalMatches)                           },
            { label: 'Win Rate',      value: winRate                                        },
            { label: 'ELO (CS2)',     value: String(player?.cs2_elo ?? 1000)               },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className={`font-orbitron text-2xl font-bold mb-1 ${stat.accent ? 'text-gradient' : 'text-white'}`}>
                {stat.value}
              </div>
              <div className="text-xs text-muted uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

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
