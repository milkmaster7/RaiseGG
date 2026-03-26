import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'My Matches — Match History',
  description: 'Your RaiseGG.gg match history. View results, stakes and earnings.',
  alternates: { canonical: 'https://raisegg.gg/dashboard/matches' },
  robots: { index: false, follow: false },
}

export default function MyMatchesPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Dashboard', url: 'https://raisegg.gg/dashboard' },
    { name: 'My Matches', url: 'https://raisegg.gg/dashboard/matches' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">My Matches</h1>
        {/* Match history table — built in Week 3 */}
      </div>
    </>
  )
}
