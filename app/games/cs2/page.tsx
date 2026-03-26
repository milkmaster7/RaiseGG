import type { Metadata } from 'next'
import { videoGameSchema, breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'CS2 Stake Matches — Compete & Win USDC',
  description: 'Compete in CS2 stake matches on RaiseGG.gg. Browse open lobbies, join ranked 1v1 games and win real USDC. The competitive CS2 stake platform for the Caucasus, Turkey and Balkans.',
  alternates: { canonical: 'https://raisegg.gg/games/cs2' },
  openGraph: {
    title: 'RaiseGG.gg – CS2 Stake Matches',
    description: 'CS2 competitive stake lobbies. Win real USDC.',
    url: 'https://raisegg.gg/games/cs2',
    images: [{ url: '/api/og?title=CS2+Stake+Matches&sub=RaiseGG.gg&color=00d4ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG.gg – CS2 Stake Matches',
    description: 'CS2 competitive stake lobbies. Win real USDC.',
    images: ['/api/og?title=CS2+Stake+Matches&sub=RaiseGG.gg&color=00d4ff'],
  },
}

export default function CS2Page() {
  const gameSchema = videoGameSchema('cs2')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Games', url: 'https://raisegg.gg/games' },
    { name: 'CS2', url: 'https://raisegg.gg/games/cs2' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4">
          <span className="text-gradient">CS2</span> Stake Matches
        </h1>
        <p className="text-muted text-lg mb-8">
          Compete in Counter-Strike 2 on RaiseGG dedicated servers. Stake USDC, win the pot.
        </p>
        {/* Game content — lobbies, stats, leaderboard preview */}
      </div>
    </>
  )
}
