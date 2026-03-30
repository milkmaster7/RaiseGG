import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { ForumPageInner } from '@/components/forum/ForumPageInner'

export const metadata: Metadata = {
  title: 'Community Forum — Discuss, Recruit, Share',
  description: 'RaiseGG community forum. Discuss strategies, find teammates, report bugs, and share match highlights.',
  alternates: { canonical: 'https://raisegg.com/forum' },
  openGraph: {
    images: [{ url: '/api/og?title=Community+Forum&sub=RaiseGG&color=00e5ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: '/api/og?title=Community+Forum&sub=RaiseGG&color=00e5ff', width: 1200, height: 630 }],
  },
}

export default function ForumPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Forum', url: 'https://raisegg.com/forum' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Community</h1>
        <p className="text-muted mb-8">Discuss strategies, find teammates, and share highlights.</p>
        <ForumPageInner />
      </div>
    </>
  )
}
