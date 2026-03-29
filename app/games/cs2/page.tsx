import type { Metadata } from 'next'
import Link from 'next/link'
import { videoGameSchema, breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { LeaderboardTable } from '@/components/ui/LeaderboardTable'
import { Server, Zap, Shield, Trophy } from 'lucide-react'
import { RegionLinks } from '@/components/layout/RegionLinks'

export const metadata: Metadata = {
  title: 'CS2 Stake Matches — Compete & Win USDC/USDT',
  description: 'Compete in CS2 stake matches on RaiseGG. Browse open lobbies, join ranked 1v1 games and win real USDC or USDT. The competitive CS2 stake platform for the Caucasus, Turkey and Balkans.',
  alternates: { canonical: 'https://raisegg.com/games/cs2' },
  openGraph: {
    title: 'RaiseGG – CS2 Stake Matches',
    description: 'CS2 competitive stake lobbies. Win real USDC/USDT.',
    url: 'https://raisegg.com/games/cs2',
    images: [{ url: '/api/og?title=CS2+Stake+Matches&sub=RaiseGG&color=00d4ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG – CS2 Stake Matches',
    images: ['/api/og?title=CS2+Stake+Matches&sub=RaiseGG&color=00d4ff'],
  },
}

const FEATURES = [
  { icon: Server,  title: 'Dedicated Servers',    desc: 'Matches run on our own CS2 servers — no faceit, no ESEA. Results are recorded automatically.' },
  { icon: Zap,     title: 'Instant Payout',        desc: 'Win the match, receive 90% of the pot in USDC or USDT to your platform balance within seconds.' },
  { icon: Shield,  title: 'VAC Verified',          desc: 'All players are screened for VAC bans and account age before they can stake.' },
  { icon: Trophy,  title: '1v1 & 5v5',             desc: 'Solo duels and full-team stakes. All formats on the same platform.' },
]

export default async function CS2Page() {
  const gameSchema = videoGameSchema('cs2')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Games', url: 'https://raisegg.com/games' },
    { name: 'CS2', url: 'https://raisegg.com/games/cs2' },
  ])

  const supabase = createServiceClient()
  const { data: topPlayers } = await supabase
    .from('players')
    .select('id, username, avatar_url, cs2_elo, cs2_wins, cs2_losses, country')
    .order('cs2_elo', { ascending: false })
    .limit(10)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section className="relative bg-gradient-hero border-b border-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-accent-cyan/8 rounded-full blur-3xl" />
        </div>
        {/* Game artwork */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none hidden lg:block">
          <img
            src="https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-space-900 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <span className="badge-purple mb-4 inline-block text-xs">CS2 — Most Popular</span>
          <h1 className="font-orbitron text-5xl md:text-6xl font-black mb-4">
            <span className="text-gradient">CS2</span> <span className="text-white">Stake Matches</span>
          </h1>
          <p className="text-xl text-muted max-w-xl mb-8 leading-relaxed">
            Counter-Strike 2 on dedicated servers. Stake USDC or USDT, play the match, get paid automatically. No trust required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/play?game=cs2" className="btn-primary px-8 py-4 text-base">Browse CS2 Lobbies</Link>
            <Link href="/api/auth/steam" className="btn-secondary px-8 py-4 text-base">Connect Steam</Link>
          </div>
          <p className="text-xs text-muted mt-4">$2 minimum stake · No KYC · Instant payouts</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card text-center">
              <f.icon className="w-8 h-8 text-accent-cyan mx-auto mb-3" />
              <h3 className="font-orbitron font-bold text-white mb-2">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works for CS2 */}
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-10">How CS2 Stakes Work</h2>
          <div className="space-y-4">
            {[
              ['01', 'Create a lobby', 'Set your stake amount, format (1v1 or 5v5), and wait. Your USDC/USDT locks into the smart contract.'],
              ['02', 'Opponent joins', 'Another player deposits equal stake. The contract now holds both sides.'],
              ['03', 'Connect to server', 'You receive a connect string. Join the dedicated CS2 server.'],
              ['04', 'Play & win', 'The server records the result automatically. The winner is paid 90% of the pot.'],
            ].map(([step, title, desc]) => (
              <div key={step} className="card flex items-start gap-6">
                <div className="font-orbitron text-3xl font-black text-accent-cyan/30 flex-shrink-0">{step}</div>
                <div>
                  <div className="font-orbitron font-bold text-white mb-1">{title}</div>
                  <div className="text-muted text-sm">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top CS2 Players */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">Top CS2 Players</h2>
          <Link href="/leaderboard" className="text-sm text-accent-cyan hover:underline">Full leaderboard →</Link>
        </div>
        <LeaderboardTable players={(topPlayers ?? []) as any} game="cs2" limit={10} />
      </section>

      {/* Region Links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RegionLinks currentGame="cs2" />
      </section>
    </>
  )
}
