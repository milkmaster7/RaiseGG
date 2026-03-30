import { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { PlayPageInner } from '@/components/play/PlayPageInner'
import { breadcrumbSchema, lobbyListSchema } from '@/lib/schemas'
import type { Match } from '@/types'
import Link from 'next/link'
import { AutoQueue } from '@/components/matchmaking/AutoQueue'
import DailyReward from '@/components/dashboard/DailyReward'
import FriendsPlaying from '@/components/dashboard/FriendsPlaying'
import { SeasonInfo } from '@/components/dashboard/SeasonInfo'
import { ActiveEvents } from '@/components/events/ActiveEvents'
import { PayoutTicker } from '@/components/home/PayoutTicker'
import { FirstMatchGuide } from '@/components/onboarding/FirstMatchGuide'

export const metadata: Metadata = {
  title: 'Play — Open Lobbies | RaiseGG',
  description:
    'Browse open CS2, Dota 2, and Deadlock lobbies on RaiseGG. Wager USDC/USDT on 1v1 or 5v5 matches with verified players.',
  alternates: { canonical: 'https://raisegg.com/play' },
  openGraph: {
    title: 'Play — Open Lobbies | RaiseGG',
    description:
      'Browse open CS2, Dota 2, and Deadlock lobbies. Wager USDC/USDT on skill-based matches.',
    url: 'https://raisegg.com/play',
    type: 'website',
    images: [{ url: '/api/og?title=Open+Lobbies&sub=CS2+%E2%80%A2+Dota+2+%E2%80%A2+Deadlock&color=00e6ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Play — Open Lobbies | RaiseGG',
    description: 'Browse open CS2, Dota 2, and Deadlock lobbies on RaiseGG.',
    images: ['/api/og?title=Open+Lobbies&sub=CS2+%E2%80%A2+Dota+2+%E2%80%A2+Deadlock&color=00e6ff'],
  },
}

const GAME_LINKS = [
  { game: 'cs2', label: 'CS2 Lobbies' },
  { game: 'dota2', label: 'Dota 2 Lobbies' },
  { game: 'deadlock', label: 'Deadlock Lobbies' },
]

export default async function PlayPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('matches')
    .select(
      '*, player_a:players!player_a_id(id,username,avatar_url,cs2_elo,dota2_elo,deadlock_elo,country)'
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)

  const initialMatches: Match[] = (data as Match[]) ?? []

  const cs2Count = initialMatches.filter((m) => m.game === 'cs2').length
  const dota2Count = initialMatches.filter((m) => m.game === 'dota2').length
  const deadlockCount = initialMatches.filter((m) => m.game === 'deadlock').length

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Play', url: 'https://raisegg.com/play' },
  ])
  const lobbyList = lobbyListSchema(initialMatches.length)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lobbyList).replace(/</g, '\\u003c') }} />

      {/* SEO shell — visible before hydration, replaced by client component */}
      <noscript>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-orbitron text-3xl font-black mb-1">
            <span className="text-gradient">Open</span> Lobbies
          </h1>
          <p className="text-muted text-sm mb-6">
            {initialMatches.length} open {initialMatches.length === 1 ? 'lobby' : 'lobbies'} available
          </p>

          <nav className="flex flex-wrap gap-3 mb-8 text-sm">
            {GAME_LINKS.map(({ game, label }) => (
              <Link
                key={game}
                href={`/play?game=${game}`}
                className="px-3 py-1.5 rounded bg-space-800 border border-border text-muted hover:text-white"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/how-it-works"
              className="px-3 py-1.5 rounded bg-space-800 border border-border text-muted hover:text-white"
            >
              How It Works
            </Link>
          </nav>

          <p className="text-muted text-sm">
            CS2: {cs2Count} lobbies &middot; Dota 2: {dota2Count} lobbies &middot; Deadlock: {deadlockCount} lobbies
          </p>
        </div>
      </noscript>

      {/* Hidden server-rendered content for crawlers (visible in HTML source) */}
      <div className="sr-only">
        <h2>RaiseGG Open Lobbies</h2>
        <p>{initialMatches.length} open lobbies across CS2, Dota 2, and Deadlock.</p>
        <ul>
          <li><Link href="/play?game=cs2">CS2 Lobbies ({cs2Count})</Link></li>
          <li><Link href="/play?game=dota2">Dota 2 Lobbies ({dota2Count})</Link></li>
          <li><Link href="/play?game=deadlock">Deadlock Lobbies ({deadlockCount})</Link></li>
          <li><Link href="/how-it-works">How It Works</Link></li>
        </ul>
      </div>

      {/* Dashboard widgets */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <ActiveEvents />
        <PayoutTicker />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AutoQueue />
          </div>
          <div className="space-y-6">
            <DailyReward />
            <SeasonInfo />
            <FriendsPlaying />
          </div>
        </div>
      </div>

      <PlayPageInner initialMatches={initialMatches} />
      <FirstMatchGuide />
    </>
  )
}
