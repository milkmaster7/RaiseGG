import type { Metadata } from 'next'
import { articleSchema, breadcrumbSchema } from '@/lib/schemas'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // TODO: fetch real post from Supabase/CMS
  return {
    title: 'Blog Post | RaiseGG.gg',
    description: 'Read this guide on RaiseGG.gg.',
    alternates: { canonical: `https://raisegg.gg/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: 'Blog Post | RaiseGG.gg',
      description: 'Read this guide on RaiseGG.gg.',
      url: `https://raisegg.gg/blog/${slug}`,
      images: [{ url: `/api/og?title=Blog&sub=raisegg.gg&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og?title=Blog&sub=raisegg.gg&color=7b61ff`],
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  // TODO: fetch real post from Supabase/CMS
  const post = {
    title: 'Blog Post',
    description: '',
    image: `https://raisegg.gg/api/og?title=Blog&sub=raisegg.gg&color=7b61ff`,
    publishedAt: new Date().toISOString(),
    slug,
  }

  const aSchema = articleSchema(post)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Blog', url: 'https://raisegg.gg/blog' },
    { name: post.title, url: `https://raisegg.gg/blog/${slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">{post.title}</h1>
        {/* Article content — built in Week 5 */}
      </div>
    </>
  )
}
