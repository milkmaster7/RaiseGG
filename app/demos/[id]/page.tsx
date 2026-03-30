import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/schemas'
import { DemoDetailInner } from '@/components/demos/DemoDetailInner'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Demo ${id.slice(0, 8)} — Match Replay`,
    description: `View match details, player stats, and download the GOTV demo recording for this RaiseGG match.`,
    alternates: { canonical: `https://raisegg.com/demos/${id}` },
    openGraph: {
      title: `RaiseGG Match Demo`,
      description: 'View match details and download the GOTV demo file.',
      url: `https://raisegg.com/demos/${id}`,
    },
    robots: { index: false }, // individual demos not indexed
  }
}

export default async function DemoDetailPage({ params }: Props) {
  const { id } = await params

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Demos', url: 'https://raisegg.com/demos' },
    { name: 'Demo Details', url: `https://raisegg.com/demos/${id}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/demos" className="text-accent-cyan text-sm hover:text-accent-cyan-glow transition-colors">
            &larr; Back to Demos
          </Link>
        </div>
        <DemoDetailInner demoId={id} />
      </div>
    </>
  )
}
