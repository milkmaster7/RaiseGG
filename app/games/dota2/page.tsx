import type { Metadata } from 'next'
import Link from 'next/link'
import { videoGameSchema, breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { LeaderboardTable } from '@/components/ui/LeaderboardTable'
import { CheckCircle, Clock, Zap, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dota 2 Stake Matches — Compete & Win USDC',
  description: 'Stake USDC on Dota 2 matches on RaiseGG.gg. Automatic result verification via Steam API. The competitive Dota 2 stake platform for the Caucasus, Turkey and Balkans.',
  alternates: { canonical: 'https://raisegg.gg/games/dota2' },
  openGraph: {
    title: 'RaiseGG.gg – Dota 2 Stake Matches',
    description: 'Dota 2 competitive stake lobbies. Win real USDC.',
    url: 'https://raisegg.gg/games/dota2',
    images: [{ url: '/api/og?title=Dota+2+Stake+Matches&sub=RaiseGG.gg&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG.gg – Dota 2 Stake Matches',
    images: ['/api/og?title=Dota+2+Stake+Matches&sub=RaiseGG.gg&color=7b61ff'],
  },
}

const FEATURES = [
  { icon: CheckCircle, title: 'Auto-Verified Results', desc: 'Submit your match ID — we pull the result directly from Steam\'s API. No screenshots, no disputes.' },
  { icon: Clock,       title: 'Instant Payout',        desc: 'Once your match ID is verified, 90% of the pot lands in your balance in seconds.' },
  { icon: Globe,       title: '44 Countries',           desc: 'Built for the regions with the highest Dota 2 player density — Caucasus, Turkey, Balkans.' },
  { icon: Zap,         title: 'Any MMR',               desc: 'From Herald to Immortal. Minimum stakes scale with your ELO tier to prevent sandbagging.' },
]

export default async function Dota2Page() {
  const gameSchema = videoGameSchema('dota2')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Games', url: 'https://raisegg.gg/games' },
    { name: 'Dota 2', url: 'https://raisegg.gg/games/dota2' },
  ])

  const supabase = createServiceClient()
  const { data: topPlayers } = await supabase
    .from('players')
    .select('id, username, avatar_url, dota2_elo, dota2_wins, dota2_losses, country')
    .order('dota2_elo', { ascending: false })
    .limit(10)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section className="relative bg-gradient-hero border-b border-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <span className="badge-purple mb-4 inline-block text-xs">Dota 2 — Fast Payout</span>
          <h1 className="font-orbitron text-5xl md:text-6xl font-black mb-4">
            <span className="text-gradient">Dota 2</span> <span className="text-white">Stake Matches</span>
          </h1>
          <p className="text-xl text-muted max-w-xl mb-8 leading-relaxed">
            Play your match anywhere. Submit the match ID. Get paid automatically via Steam API verification.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/play?game=dota2" className="btn-primary px-8 py-4 text-base">Browse Dota 2 Lobbies</Link>
            <Link href="/api/auth/steam" className="btn-secondary px-8 py-4 text-base">Connect Steam</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card text-center">
              <f.icon className="w-8 h-8 text-accent-purple mx-auto mb-3" />
              <h3 className="font-orbitron font-bold text-white mb-2">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-10">How Dota 2 Stakes Work</h2>
          <div className="space-y-4">
            {[
              ['01', 'Create a lobby on RaiseGG',   'Set your stake. USDC locks into the Solana smart contract. Wait for an opponent.'],
              ['02', 'Opponent joins',               'They deposit equal stake. The contract holds both sides — neither can withdraw.'],
              ['03', 'Play your Dota 2 match',       'Play in any lobby type. The match must last at least 10 minutes to count.'],
              ['04', 'Submit the match ID',          'After the game, copy the match ID from Dota 2 and paste it on RaiseGG. We verify via Steam API.'],
              ['05', 'Payout',                       'Verified winner receives 90% of the pot. Funds hit your balance instantly.'],
            ].map(([step, title, desc]) => (
              <div key={step} className="card flex items-start gap-6">
                <div className="font-orbitron text-3xl font-black text-accent-purple/30 flex-shrink-0">{step}</div>
                <div>
                  <div className="font-orbitron font-bold text-white mb-1">{title}</div>
                  <div className="text-muted text-sm">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/blog/dota2-how-to-submit-match-id" className="text-accent-purple hover:underline text-sm">
              Full guide: How to submit your match ID →
            </Link>
          </div>
        </div>
      </section>

      {/* Top Dota 2 Players */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">Top Dota 2 Players</h2>
          <Link href="/leaderboard" className="text-sm text-accent-purple hover:underline">Full leaderboard →</Link>
        </div>
        <LeaderboardTable players={(topPlayers ?? []) as any} game="dota2" limit={10} />
      </section>
    </>
  )
}
