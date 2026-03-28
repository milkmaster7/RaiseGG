import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, blogListSchema } from '@/lib/schemas'
import { BLOG_POSTS } from '@/lib/blog'
import { Clock, Tag } from 'lucide-react'

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

const TAG_COLORS: Record<string, string> = {
  Guide:   'badge-purple',
  CS2:     'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 px-2 py-0.5 rounded text-xs font-semibold',
  'Dota 2':'badge-purple',
  Deadlock:'badge-purple',
  Tech:    'bg-space-700 text-muted border border-border px-2 py-0.5 rounded text-xs font-semibold',
}

export default function BlogIndexPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Blog', url: 'https://raisegg.gg/blog' },
  ])

  const sorted = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  const blogList = blogListSchema(
    sorted.map((p) => ({
      title: p.title,
      url: `https://raisegg.gg/blog/${p.slug}`,
      description: p.description,
    }))
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogList).replace(/</g, '\\u003c') }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-4xl font-black mb-2 text-gradient">Blog</h1>
        <p className="text-muted mb-10">Guides, strategies and competitive tips for CS2, Dota 2 and Deadlock.</p>

        <div className="space-y-6">
          {sorted.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="card-hover group block">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={TAG_COLORS[post.tag] ?? 'badge-purple'}>{post.tag}</span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="w-3 h-3" />{post.readTime} min read
                    </span>
                  </div>
                  <h2 className="font-orbitron text-lg font-bold text-white mb-2 group-hover:text-gradient transition-all">
                    {post.title}
                  </h2>
                  <p className="text-muted text-sm leading-relaxed line-clamp-2">{post.description}</p>
                </div>
                <div className="text-xs text-muted flex-shrink-0 mt-1">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
