import type { Metadata } from 'next'
import { videoGameSchema, breadcrumbSchema } from '@/lib/schemas'

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
    description: 'Dota 2 competitive stake lobbies. Win real USDC.',
    images: ['/api/og?title=Dota+2+Stake+Matches&sub=RaiseGG.gg&color=7b61ff'],
  },
}

export default function Dota2Page() {
  const gameSchema = videoGameSchema('dota2')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Games', url: 'https://raisegg.gg/games' },
    { name: 'Dota 2', url: 'https://raisegg.gg/games/dota2' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4">
          <span className="text-gradient">Dota 2</span> Stake Matches
        </h1>
        <p className="text-muted text-lg mb-8">
          Stake USDC on Dota 2 matches. Submit your match ID — our system verifies the result automatically via Steam API and pays out instantly.
        </p>
      </div>
    </>
  )
}
