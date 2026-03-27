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

export function generateStaticParams() {
  const countries = Object.keys(COUNTRIES)
  return GAMES.flatMap((game) =>
    countries.map((country) => ({ 'seo-page': `${game}-platform-${country}` }))
  )
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

        {/* How it works */}
        <div className="mt-16 mb-12">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-8">
            How to Start Playing {gameName} in {countryName}
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Connect Steam', body: 'Log in with your Steam account. No email or ID required.' },
              { step: '02', title: 'Get USDC', body: 'Buy USDC on Binance or OKX and send it to your Phantom wallet.' },
              { step: '03', title: 'Deposit', body: 'Deposit from your wallet to your RaiseGG balance in one click.' },
              { step: '04', title: 'Play & Win', body: 'Create or join a stake match. Win 90% of the pot, paid instantly.' },
            ].map((s) => (
              <div key={s.step} className="card">
                <div className="font-orbitron text-2xl font-black text-gradient mb-2">{s.step}</div>
                <div className="font-semibold text-white text-sm mb-1">{s.title}</div>
                <div className="text-muted text-xs leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Local FAQ */}
        <div className="mb-12">
          <h2 className="font-orbitron text-xl font-bold text-white mb-6">
            Common Questions from {countryName} Players
          </h2>
          <div className="space-y-3">
            {[
              {
                q: `Is ${gameName} staking legal in ${countryName}?`,
                a: `RaiseGG operates as a skill-based competition — outcomes depend entirely on player skill, not chance. It is your responsibility to verify local laws before playing.`,
              },
              {
                q: 'Do I need to verify my identity?',
                a: 'No KYC. A Steam account in good standing is the only requirement.',
              },
              {
                q: 'How do I get USDC?',
                a: `Buy USDC on Binance or OKX (available in ${countryName}). Withdraw to your Phantom wallet on the Solana network, then deposit to RaiseGG.`,
              },
              {
                q: 'How fast are payouts?',
                a: 'USDC arrives in your wallet within 30 seconds of match resolution via Solana.',
              },
            ].map((item) => (
              <div key={item.q} className="card">
                <div className="font-semibold text-white text-sm mb-1">{item.q}</div>
                <div className="text-muted text-sm leading-relaxed">{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="card text-center py-8">
          <p className="text-muted text-sm mb-4">
            Join {countryName} players already competing on RaiseGG.
          </p>
          <a href="/api/auth/steam" className="btn-primary px-8 py-3 inline-block">
            Start Playing — Connect Steam
          </a>
        </div>
      </div>
    </>
  )
}
