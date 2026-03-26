import type { Metadata } from 'next'
import { tournamentSchema, breadcrumbSchema } from '@/lib/schemas'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  // TODO: fetch real tournament data from Supabase
  return {
    title: 'Tournament | RaiseGG.gg',
    description: 'Compete in this RaiseGG.gg tournament. USDC prize pool, open registration.',
    alternates: { canonical: `https://raisegg.gg/tournaments/${id}` },
    openGraph: {
      title: 'RaiseGG.gg Tournament',
      description: 'USDC prize pool. Open registration.',
      url: `https://raisegg.gg/tournaments/${id}`,
      images: [{ url: `/api/og?title=Tournament&sub=raisegg.gg&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og?title=Tournament&sub=raisegg.gg&color=7b61ff`],
    },
  }
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  // TODO: fetch real tournament from Supabase
  const tournament = { id, name: 'Tournament', game: 'CS2', startDate: new Date().toISOString(), prizePool: 0 }

  const tSchema = tournamentSchema(tournament)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Tournaments', url: 'https://raisegg.gg/tournaments' },
    { name: tournament.name, url: `https://raisegg.gg/tournaments/${id}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">{tournament.name}</h1>
        {/* Tournament bracket, registration — built in Week 5 */}
      </div>
    </>
  )
}
