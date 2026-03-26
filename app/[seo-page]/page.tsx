import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { landingPageSchema, videoGameSchema, breadcrumbSchema } from '@/lib/schemas'

// Valid games and countries
const GAMES = ['cs2', 'dota2', 'deadlock'] as const
const COUNTRIES: Record<string, string> = {
  georgia: 'Georgia', turkey: 'Turkey', armenia: 'Armenia',
  azerbaijan: 'Azerbaijan', ukraine: 'Ukraine', romania: 'Romania',
  bulgaria: 'Bulgaria', serbia: 'Serbia', greece: 'Greece', iran: 'Iran',
  kazakhstan: 'Kazakhstan', uzbekistan: 'Uzbekistan', russia: 'Russia',
  poland: 'Poland', hungary: 'Hungary', croatia: 'Croatia',
  slovenia: 'Slovenia', moldova: 'Moldova', belarus: 'Belarus',
  lithuania: 'Lithuania', latvia: 'Latvia', estonia: 'Estonia',
}

const GAME_NAMES: Record<string, string> = {
  cs2: 'Counter-Strike 2', dota2: 'Dota 2', deadlock: 'Deadlock',
}

function parseSlug(slug: string): { game: string; country: string } | null {
  for (const game of GAMES) {
    const prefix = `${game}-platform-`
    if (slug.startsWith(prefix)) {
      const country = slug.replace(prefix, '')
      if (COUNTRIES[country]) return { game, country }
    }
  }
  return null
}

type Props = { params: Promise<{ 'seo-page': string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params)['seo-page']
  const parsed = parseSlug(slug)
  if (!parsed) return {}

  const { game, country } = parsed
  const gameName = GAME_NAMES[game]
  const countryName = COUNTRIES[country]

  return {
    title: `${gameName} Stake Platform in ${countryName} — Win USDC`,
    description: `The leading ${gameName} stake platform for players in ${countryName}. Join RaiseGG.gg, compete in ranked lobbies and win real USDC. ${countryName} players welcome.`,
    alternates: { canonical: `https://raisegg.gg/${slug}` },
    openGraph: {
      title: `RaiseGG.gg – ${gameName} in ${countryName}`,
      description: `${gameName} stake matches for ${countryName} players. Win real USDC.`,
      url: `https://raisegg.gg/${slug}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(gameName + ' in ' + countryName)}&sub=raisegg.gg&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `RaiseGG.gg – ${gameName} in ${countryName}`,
      images: [`/api/og?title=${encodeURIComponent(gameName + ' in ' + countryName)}&sub=raisegg.gg&color=7b61ff`],
    },
  }
}

export default async function SeoLandingPage({ params }: Props) {
  const slug = (await params)['seo-page']
  const parsed = parseSlug(slug)
  if (!parsed) notFound()

  const { game, country } = parsed
  const gameName = GAME_NAMES[game]
  const countryName = COUNTRIES[country]

  const lpSchema = landingPageSchema(game, countryName)
  const vgSchema = videoGameSchema(game as 'cs2' | 'dota2' | 'deadlock')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: gameName, url: `https://raisegg.gg/games/${game}` },
    { name: countryName, url: `https://raisegg.gg/${slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lpSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vgSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4">
          <span className="text-gradient">{gameName}</span> Stake Platform in {countryName}
        </h1>
        <p className="text-muted text-lg mb-8 leading-relaxed">
          RaiseGG.gg is the leading {gameName} stake platform for players in {countryName}.
          Compete in ranked matches, stake USDC, and win instantly via Solana smart contract.
          No Western ping disadvantage — servers built for your region.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { label: 'Platform Fee', value: '10%' },
            { label: 'Payout Speed', value: 'Instant' },
            { label: 'Countries', value: '44' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className="font-orbitron text-2xl font-bold text-gradient mb-1">{stat.value}</div>
              <div className="text-xs text-muted uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        <a href="/api/auth/steam" className="btn-primary text-base px-8 py-4 inline-block">
          Connect Steam & Play in {countryName}
        </a>
      </div>
    </>
  )
}
