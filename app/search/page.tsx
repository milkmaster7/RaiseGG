import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for players, matches and tournaments on RaiseGG.gg.',
  alternates: { canonical: 'https://raisegg.gg/search' },
  robots: { index: false, follow: false },
}

export default function SearchPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Search', url: 'https://raisegg.gg/search' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-8 text-gradient">Search</h1>
        <input type="search" placeholder="Search players, matches, tournaments..." className="input" />
        {/* Search results — built later */}
      </div>
    </>
  )
}
