import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { breadcrumbSchema } from '@/lib/schemas'
import { GAME_LABELS } from '@/lib/hubs'
import HubDetailClient from '@/components/hubs/HubDetailClient'
import type { Game } from '@/types'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const db = createServiceClient()
  const { data: hub } = await db
    .from('hubs')
    .select('name, game, description, region, member_count')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!hub) {
    return { title: 'Hub Not Found — RaiseGG' }
  }

  const gameLabel = GAME_LABELS[hub.game as Game] ?? hub.game
  const title = `${hub.name} — ${gameLabel} Hub`
  const description = hub.description || `${hub.name} is a ${gameLabel} competitive hub in ${hub.region} with ${hub.member_count} members on RaiseGG.`

  return {
    title,
    description,
    alternates: { canonical: `https://raisegg.com/hubs/${slug}` },
    openGraph: {
      title: `${title} | RaiseGG`,
      description,
      url: `https://raisegg.com/hubs/${slug}`,
      siteName: 'RaiseGG',
      type: 'website',
      images: [{ url: 'https://raisegg.com/og-hubs.png', width: 1200, height: 630, alt: hub.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | RaiseGG`,
      description,
      images: ['https://raisegg.com/og-hubs.png'],
    },
  }
}

export default async function HubPage({ params }: Props) {
  const { slug } = await params

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Hubs', url: 'https://raisegg.com/hubs' },
    { name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), url: `https://raisegg.com/hubs/${slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <HubDetailClient slug={slug} />
      </div>
    </>
  )
}
