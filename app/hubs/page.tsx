import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import HubsClient from '@/components/hubs/HubsClient'

export const metadata: Metadata = {
  title: 'Game Hubs — Community Competition',
  description: 'Join community-run competitive hubs for CS2, Dota 2 and Deadlock. Region-based matchmaking, hub leaderboards, ELO rankings and organized play on RaiseGG.',
  alternates: { canonical: 'https://raisegg.com/hubs' },
  openGraph: {
    title: 'Game Hubs — Community Competition | RaiseGG',
    description: 'Join community-run competitive hubs for CS2, Dota 2 and Deadlock. Region-based matchmaking, hub leaderboards and organized play.',
    url: 'https://raisegg.com/hubs',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: 'https://raisegg.com/og-hubs.png', width: 1200, height: 630, alt: 'RaiseGG Game Hubs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Game Hubs — Community Competition | RaiseGG',
    description: 'Join community-run competitive hubs for CS2, Dota 2 and Deadlock on RaiseGG.',
    images: ['https://raisegg.com/og-hubs.png'],
  },
}

export default function HubsPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Hubs', url: 'https://raisegg.com/hubs' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Game Hubs</h1>
        <p className="text-muted mb-8">Community-run competitive spaces. Find your region, join a hub, and climb the leaderboard.</p>
        <HubsClient />
      </div>
    </>
  )
}
