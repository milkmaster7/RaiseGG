import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { DemosPageInner } from '@/components/demos/DemosPageInner'

export const metadata: Metadata = {
  title: 'Match Demos — GOTV Replay Browser & Download',
  description: 'Browse, search, and download CS2 match demos. All RaiseGG matches are recorded via GOTV and stored for 90 days. Filter by player, map, or game.',
  alternates: { canonical: 'https://raisegg.com/demos' },
  openGraph: {
    title: 'RaiseGG Match Demos — GOTV Replay Browser',
    description: 'Browse and download GOTV demo recordings from RaiseGG matches. 90-day storage.',
    url: 'https://raisegg.com/demos',
    images: [{ url: '/api/og?title=Match+Demos&sub=GOTV+Replay+Browser&color=7b61ff', width: 1200, height: 630 }],
  },
}

export default function DemosPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Demos', url: 'https://raisegg.com/demos' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Match Demos</h1>
        <p className="text-muted mb-8">All matches recorded via GOTV. Stored for 90 days. Search, browse, and download anytime.</p>
        <DemosPageInner />
      </div>
    </>
  )
}
