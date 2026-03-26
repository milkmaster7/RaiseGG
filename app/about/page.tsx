import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'About — RaiseGG.gg',
  description: 'RaiseGG.gg is the first competitive CS2, Dota 2 and Deadlock stake platform built for the Caucasus, Turkey and Balkans region.',
  alternates: { canonical: 'https://raisegg.gg/about' },
  openGraph: {
    title: 'About RaiseGG.gg',
    description: 'The first stake platform built for the Caucasus, Turkey and Balkans.',
    url: 'https://raisegg.gg/about',
    images: [{ url: '/api/og?title=About+RaiseGG&sub=RaiseGG.gg&color=7b61ff', width: 1200, height: 630 }],
  },
}

export default function AboutPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'About', url: 'https://raisegg.gg/about' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">About RaiseGG</h1>
        <div className="space-y-6 text-muted leading-relaxed">
          <p>
            RaiseGG.gg is the first competitive stake platform for CS2, Dota 2 and Deadlock
            built specifically for the Caucasus, Turkey and Balkans region — 44 countries that
            have historically been underserved by Western platforms like FACEIT.
          </p>
          <p>
            Every match is trustless. Stakes are held in a Solana smart contract and released
            automatically when a result is verified via the Steam API. No middleman. No delays.
          </p>
          <p>
            We take a 10% rake on each match. That's it. No subscriptions, no hidden fees.
          </p>
        </div>
      </div>
    </>
  )
}
