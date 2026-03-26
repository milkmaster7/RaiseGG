import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Tournaments — Compete for Prize Pools',
  description: 'Browse upcoming CS2, Dota 2 and Deadlock tournaments on RaiseGG.gg. Open registration, USDC prize pools. Filter by game, date and buy-in.',
  alternates: { canonical: 'https://raisegg.gg/tournaments' },
  openGraph: {
    title: 'RaiseGG.gg – Tournaments',
    description: 'CS2, Dota 2 & Deadlock tournaments. USDC prize pools.',
    url: 'https://raisegg.gg/tournaments',
    images: [{ url: '/api/og?title=Tournaments&sub=USDC+Prize+Pools&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG.gg – Tournaments',
    description: 'CS2, Dota 2 & Deadlock tournaments. USDC prize pools.',
    images: ['/api/og?title=Tournaments&sub=USDC+Prize+Pools&color=7b61ff'],
  },
}

export default function TournamentsPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Tournaments', url: 'https://raisegg.gg/tournaments' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4">
          <span className="text-gradient">Tournaments</span>
        </h1>
        <p className="text-muted mb-8">Compete for USDC prize pools across CS2, Dota 2 and Deadlock.</p>
        {/* Tournament listings — built in Week 5 */}
      </div>
    </>
  )
}
