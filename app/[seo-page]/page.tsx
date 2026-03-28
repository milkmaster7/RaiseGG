import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { landingPageSchema, videoGameSchema, breadcrumbSchema } from '@/lib/schemas'

// Valid games and countries
const GAMES = ['cs2', 'dota2', 'deadlock'] as const
const COUNTRIES: Record<string, string> = {
  // Caucasus & surroundings
  georgia: 'Georgia', turkey: 'Turkey', armenia: 'Armenia',
  azerbaijan: 'Azerbaijan', iran: 'Iran',
  // Central Asia
  kazakhstan: 'Kazakhstan', uzbekistan: 'Uzbekistan', kyrgyzstan: 'Kyrgyzstan',
  tajikistan: 'Tajikistan', turkmenistan: 'Turkmenistan',
  // Eastern Europe
  ukraine: 'Ukraine', russia: 'Russia', belarus: 'Belarus', moldova: 'Moldova',
  poland: 'Poland', czech: 'Czech Republic', slovakia: 'Slovakia',
  hungary: 'Hungary', austria: 'Austria',
  // Baltic
  lithuania: 'Lithuania', latvia: 'Latvia', estonia: 'Estonia',
  // Balkans
  romania: 'Romania', bulgaria: 'Bulgaria', serbia: 'Serbia', greece: 'Greece',
  croatia: 'Croatia', slovenia: 'Slovenia', bosnia: 'Bosnia',
  montenegro: 'Montenegro', albania: 'Albania', kosovo: 'Kosovo',
  'north-macedonia': 'North Macedonia',
  // Eastern Mediterranean
  cyprus: 'Cyprus', israel: 'Israel', jordan: 'Jordan',
  // Northern Europe
  finland: 'Finland', sweden: 'Sweden',
  // Western Europe
  netherlands: 'Netherlands', belgium: 'Belgium', switzerland: 'Switzerland',
  italy: 'Italy', spain: 'Spain', portugal: 'Portugal',
}

const GAME_NAMES: Record<string, string> = {
  cs2: 'Counter-Strike 2', dota2: 'Dota 2', deadlock: 'Deadlock',
}

type CountryGroupContent = {
  groupIntro: string
  exchangeTip: string
  serverTip: string
}

const COUNTRY_GROUP_CONTENT: Record<string, CountryGroupContent> = {
  turkey: {
    groupIntro: `Turkey is one of the top 5 CS2 player bases globally. RaiseGG is purpose-built for Turkish players — no ping disadvantage, no payment barriers. Buy USDC or USDT on Binance Turkey (supports TRY deposits via local bank transfer) and deposit directly to your RaiseGG balance.`,
    exchangeTip: 'Binance Turkey (binance.com/tr) supports TRY deposits via bank transfer. Buy USDC or USDT and withdraw to Solana network.',
    serverTip: 'RaiseGG CS2 servers are optimised for Turkey and surrounding regions. Typical ping: 20–40ms.',
  },
  caucasus: {
    groupIntro: `The Caucasus region — Georgia, Armenia, Azerbaijan and Iran — has a passionate competitive gaming community that has been underserved by Western platforms. RaiseGG was built specifically for this region. Buy USDC or USDT on Binance or OKX (both available in the Caucasus) and start playing within minutes.`,
    exchangeTip: 'Binance and OKX support local payment methods in Georgia, Armenia and Azerbaijan. Buy USDC or USDT and withdraw on the Solana network.',
    serverTip: 'Server locations cover the Caucasus region. Typical ping from Tbilisi, Yerevan and Baku: 25–50ms.',
  },
  balkans: {
    groupIntro: `The Balkans produce some of Europe's most skilled CS2 and Dota 2 players — but Western esports platforms offer little financial reward for that skill. RaiseGG changes that. Buy USDC or USDT on Binance (EUR deposits supported across the region) and compete for real money.`,
    exchangeTip: 'Binance supports EUR bank transfers across Serbia, Romania, Bulgaria, Greece and surrounding countries. USDC and USDT on Solana are the recommended options.',
    serverTip: 'EU West and EU servers provide the best latency for Balkan players. Typical ping: 20–45ms.',
  },
  eastern_europe: {
    groupIntro: `Eastern Europe has one of the world's highest concentrations of competitive CS2 and Dota 2 talent. RaiseGG gives Ukrainian, Polish, Romanian and regional players a platform to turn that skill into real earnings, with instant USDC or USDT payouts via Solana.`,
    exchangeTip: 'Binance and OKX support local currencies and payment methods across Eastern Europe. Buy USDC or USDT on Solana network.',
    serverTip: 'EU servers recommended for Eastern European players. Typical ping: 15–40ms.',
  },
  central_asia: {
    groupIntro: `Central Asia — Kazakhstan, Uzbekistan, Kyrgyzstan, Tajikistan and Turkmenistan — has a growing competitive gaming scene with limited access to skill-based earning platforms. RaiseGG requires only a Steam account and USDC or USDT, both accessible via Binance across the region.`,
    exchangeTip: 'Binance is widely available in Kazakhstan, Uzbekistan and Kyrgyzstan. Buy USDC or USDT and withdraw to Solana network.',
    serverTip: 'CIS region servers provide the best connection for Central Asian players.',
  },
  other: {
    groupIntro: `RaiseGG is open to competitive players across 44 countries. Connect Steam, deposit USDC or USDT via Phantom wallet, and compete in CS2, Dota 2 and Deadlock stake matches with instant payouts.`,
    exchangeTip: 'Buy USDC or USDT on Binance or OKX and withdraw to your Phantom wallet on the Solana network.',
    serverTip: 'Multiple server regions available. Choose the closest region when creating your match.',
  },
}

function getCountryGroup(country: string): string {
  if (country === 'turkey') return 'turkey'
  if (['georgia', 'armenia', 'azerbaijan', 'iran'].includes(country)) return 'caucasus'
  if (['romania', 'bulgaria', 'serbia', 'greece', 'croatia', 'slovenia', 'bosnia', 'montenegro', 'albania', 'kosovo', 'north-macedonia', 'cyprus'].includes(country)) return 'balkans'
  if (['ukraine', 'russia', 'belarus', 'moldova', 'poland', 'czech', 'slovakia', 'hungary', 'austria', 'lithuania', 'latvia', 'estonia'].includes(country)) return 'eastern_europe'
  if (['kazakhstan', 'uzbekistan', 'kyrgyzstan', 'tajikistan', 'turkmenistan'].includes(country)) return 'central_asia'
  return 'other'
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
    title: `${gameName} Stake Platform in ${countryName} — Win USDC/USDT`,
    description: `The leading ${gameName} stake platform for players in ${countryName}. Join RaiseGG.gg, compete in ranked lobbies and win real USDC or USDT. ${countryName} players welcome.`,
    alternates: { canonical: `https://raisegg.gg/${slug}` },
    openGraph: {
      title: `RaiseGG.gg – ${gameName} in ${countryName}`,
      description: `${gameName} stake matches for ${countryName} players. Win real USDC or USDT.`,
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
  const groupContent = COUNTRY_GROUP_CONTENT[getCountryGroup(country)]

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
          Compete in ranked matches, stake USDC or USDT, and win instantly via Solana smart contract.
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

        {/* Regional context */}
        <div className="mt-12 mb-4 grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="font-orbitron text-xs text-muted uppercase tracking-widest mb-2">About {countryName} Players</div>
            <p className="text-muted text-sm leading-relaxed">{groupContent.groupIntro}</p>
          </div>
          <div className="card space-y-4">
            <div>
              <div className="font-orbitron text-xs text-muted uppercase tracking-widest mb-1">Exchange Tip</div>
              <p className="text-muted text-sm leading-relaxed">{groupContent.exchangeTip}</p>
            </div>
            <div>
              <div className="font-orbitron text-xs text-muted uppercase tracking-widest mb-1">Server Info</div>
              <p className="text-muted text-sm leading-relaxed">{groupContent.serverTip}</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16 mb-12">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-8">
            How to Start Playing {gameName} in {countryName}
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Connect Steam', body: 'Log in with your Steam account. No email or ID required.' },
              { step: '02', title: 'Get USDC/USDT', body: 'Buy USDC or USDT on Binance or OKX and send it to your Phantom wallet.' },
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
                q: 'How do I get USDC or USDT?',
                a: `Buy USDC or USDT on Binance or OKX (available in ${countryName}). Withdraw to your Phantom wallet on the Solana network, then deposit to RaiseGG.`,
              },
              {
                q: 'How fast are payouts?',
                a: 'USDC or USDT arrives in your wallet within 30 seconds of match resolution via Solana.',
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
