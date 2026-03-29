import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { DemosPageInner } from '@/components/demos/DemosPageInner'

export const metadata: Metadata = {
  title: 'Match Demos — 90 Day Replay Storage',
  description: 'Download and review your CS2 match demos. All RaiseGG matches are recorded and stored for 90 days.',
  alternates: { canonical: 'https://raisegg.com/demos' },
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
        <p className="text-muted mb-8">All matches recorded. Stored for 90 days. Download anytime.</p>
        <DemosPageInner />
      </div>
    </>
  )
}
