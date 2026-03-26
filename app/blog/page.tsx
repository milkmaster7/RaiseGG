import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Blog — CS2, Dota 2 & Deadlock Guides',
  description: 'CS2, Dota 2 and Deadlock guides, staking strategies and competitive tips from RaiseGG.gg. Level up your game and your earnings.',
  alternates: { canonical: 'https://raisegg.gg/blog' },
  openGraph: {
    title: 'RaiseGG.gg – Blog',
    description: 'CS2, Dota 2 & Deadlock guides and staking strategies.',
    url: 'https://raisegg.gg/blog',
    images: [{ url: '/api/og?title=Blog&sub=Guides+%26+Strategies&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG.gg – Blog',
    images: ['/api/og?title=Blog&sub=Guides+%26+Strategies&color=7b61ff'],
  },
}

export default function BlogIndexPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Blog', url: 'https://raisegg.gg/blog' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">Blog</h1>
        <p className="text-muted mb-8">Guides, strategies and competitive tips for CS2, Dota 2 and Deadlock.</p>
        {/* Blog post grid — built in Week 5 */}
      </div>
    </>
  )
}
