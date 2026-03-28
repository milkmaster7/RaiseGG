import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { articleSchema, breadcrumbSchema } from '@/lib/schemas'
import { getBlogPost, getBlogPostSlugs } from '@/lib/blog'
import { Clock, ArrowLeft } from 'lucide-react'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getBlogPostSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: 'Post Not Found' }

  return {
    title: `${post.title} — RaiseGG.gg`,
    description: post.description,
    alternates: { canonical: `https://raisegg.gg/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: `https://raisegg.gg/blog/${slug}`,
      publishedTime: post.publishedAt,
      images: [{ url: `/api/og?title=${encodeURIComponent(post.title)}&sub=RaiseGG+Blog&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [`/api/og?title=${encodeURIComponent(post.title)}&sub=RaiseGG+Blog&color=7b61ff`],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const aSchema = articleSchema({
    title:       post.title,
    description: post.description,
    image:       `https://raisegg.gg/api/og?title=${encodeURIComponent(post.title)}&sub=RaiseGG+Blog&color=7b61ff`,
    publishedAt: post.publishedAt,
    slug:        post.slug,
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Blog', url: 'https://raisegg.gg/blog' },
    { name: post.title, url: `https://raisegg.gg/blog/${slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Back */}
        <Link href="/blog" className="flex items-center gap-2 text-sm text-muted hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="badge-purple text-xs">{post.tag}</span>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock className="w-3 h-3" />{post.readTime} min read
            </span>
            <span className="text-xs text-muted">
              {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-black mb-4 text-gradient leading-tight">
            {post.title}
          </h1>
          <p className="text-muted text-lg leading-relaxed">{post.description}</p>
        </div>

        <hr className="border-border mb-8" />

        {/* Content */}
        <div
          className="prose prose-invert prose-sm max-w-none
            prose-headings:font-orbitron prose-headings:text-white prose-headings:font-bold
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
            prose-p:text-muted prose-p:leading-relaxed prose-p:mb-4
            prose-li:text-muted prose-li:mb-1
            prose-ol:text-muted prose-ul:text-muted
            prose-strong:text-white
            prose-code:text-accent-cyan prose-code:bg-space-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <hr className="border-border my-10" />

        {/* Read Next */}
        {post.relatedLinks && post.relatedLinks.length > 0 && (
          <div className="my-8 p-4 bg-space-800 rounded border border-border">
            <div className="text-xs text-muted uppercase tracking-wider mb-3">Read Next</div>
            <div className="flex flex-wrap gap-3">
              {post.relatedLinks.map(link => (
                <Link key={link.href} href={link.href} className="text-accent-purple hover:text-white text-sm font-semibold transition-colors">
                  {link.label} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="card text-center py-8">
          <h2 className="font-orbitron text-xl font-black text-white mb-2">Ready to stake?</h2>
          <p className="text-muted text-sm mb-6">Connect Steam and start competing in under 2 minutes.</p>
          <a href="/api/auth/steam" className="btn-primary px-8 py-3 inline-block">Connect Steam & Play</a>
        </div>
      </div>
    </>
  )
}
