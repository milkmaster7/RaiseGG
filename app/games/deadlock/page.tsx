import type { Metadata } from 'next'
import { videoGameSchema, breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Deadlock Stake Matches — The Only Platform',
  description: 'RaiseGG.gg is the first and only competitive stake platform for Deadlock. Stake USDC, compete, win. Join the Caucasus, Turkey and Balkans Deadlock community.',
  alternates: { canonical: 'https://raisegg.gg/games/deadlock' },
  openGraph: {
    title: 'RaiseGG.gg – Deadlock Stake Matches',
    description: 'The only Deadlock stake platform. Win real USDC.',
    url: 'https://raisegg.gg/games/deadlock',
    images: [{ url: '/api/og?title=Deadlock+Stake+Matches&sub=RaiseGG.gg%20%E2%80%94+First+%26+Only&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG.gg – Deadlock Stake Matches',
    description: 'The only Deadlock stake platform. Win real USDC.',
    images: ['/api/og?title=Deadlock+Stake+Matches&sub=RaiseGG.gg&color=7b61ff'],
  },
}

export default function DeadlockPage() {
  const gameSchema = videoGameSchema('deadlock')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Games', url: 'https://raisegg.gg/games' },
    { name: 'Deadlock', url: 'https://raisegg.gg/games/deadlock' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4">
          <span className="text-gradient">Deadlock</span> Stake Matches
        </h1>
        <div className="badge-purple inline-flex mb-4">First & Only Platform</div>
        <p className="text-muted text-lg mb-8">
          RaiseGG.gg is the world's first stake platform for Deadlock. Compete, stake USDC, win.
        </p>
      </div>
    </>
  )
}
