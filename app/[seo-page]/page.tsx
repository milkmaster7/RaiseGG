import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { landingPageSchema, videoGameSchema, breadcrumbSchema } from '@/lib/schemas'
import { RegionLinks } from '@/components/layout/RegionLinks'

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

// Top 15 target countries that get full indexing — all others get noindex
const INDEXED_COUNTRIES = new Set([
  'turkey', 'georgia', 'armenia', 'azerbaijan', 'ukraine', 'russia',
  'kazakhstan', 'romania', 'bulgaria', 'serbia', 'greece', 'poland',
  'iran', 'uzbekistan', 'israel',
])

// ── Country-specific unique data ──────────────────────────────────────────────

type CountryData = {
  pingMs: string
  currency: string
  currencyRate: string
  cs2Players: string
  gamingScene: string
  regionCountries: string[]  // slugs of countries to cross-link within same region
}

const COUNTRY_DATA: Record<string, CountryData> = {
  turkey: {
    pingMs: '5–15 ms',
    currency: 'TRY',
    currencyRate: '1 USDC ≈ 38 Turkish Lira',
    cs2Players: 'Turkey has over 5 million CS2 players, making it one of the top 5 player bases globally',
    gamingScene: 'Turkey is the esports powerhouse of the region. Istanbul hosts major LAN events, and Turkish orgs like Eternal Fire and BBL Esports compete at the highest international level. Internet cafes (net cafes) remain deeply embedded in Turkish gaming culture, giving players access to high-end hardware and a social competitive environment. Binance Turkey supports direct TRY deposits, making crypto staking frictionless for Turkish players.',
    regionCountries: ['georgia', 'armenia', 'azerbaijan', 'iran', 'greece', 'bulgaria'],
  },
  georgia: {
    pingMs: '20–40 ms',
    currency: 'GEL',
    currencyRate: '1 USDC ≈ 2.8 Georgian Lari',
    cs2Players: 'Georgia has an estimated 150,000+ active CS2 players across Steam',
    gamingScene: 'Georgia has a fast-growing esports scene centered around Tbilisi. The country benefits from excellent internet infrastructure for its size, with fiber coverage expanding rapidly. Georgian players frequently compete on CIS servers and have produced notable talents in CS2 and Dota 2. The proximity to Turkey means sub-40ms pings to Istanbul-based servers, making real-time competitive play smooth and fair.',
    regionCountries: ['turkey', 'armenia', 'azerbaijan', 'iran'],
  },
  armenia: {
    pingMs: '25–45 ms',
    currency: 'AMD',
    currencyRate: '1 USDC ≈ 390 Armenian Dram',
    cs2Players: 'Armenia has approximately 80,000 active CS2 players',
    gamingScene: 'Armenia punches above its weight in competitive gaming. Yerevan has a growing network of esports bars and gaming centers, and the Armenian diaspora connects the local scene to communities in Russia, France, and the US. Armenian players typically play on CIS and EU East servers. Crypto adoption in Armenia is high relative to the region, with OKX and Binance both accessible for USDC purchases.',
    regionCountries: ['turkey', 'georgia', 'azerbaijan', 'iran'],
  },
  azerbaijan: {
    pingMs: '30–50 ms',
    currency: 'AZN',
    currencyRate: '1 USDC ≈ 1.7 Azerbaijani Manat',
    cs2Players: 'Azerbaijan has around 120,000 active CS2 players',
    gamingScene: 'Azerbaijan has a competitive gaming scene that is rapidly professionalizing. Baku hosts regular local tournaments, and Azerbaijani players are increasingly visible in CIS-region qualifiers. The government has signaled support for esports development as part of its digital economy strategy. Internet speeds in Baku are among the best in the Caucasus, enabling competitive online play.',
    regionCountries: ['turkey', 'georgia', 'armenia', 'iran'],
  },
  iran: {
    pingMs: '35–55 ms',
    currency: 'IRR',
    currencyRate: '1 USDC ≈ 590,000 Iranian Rial',
    cs2Players: 'Iran has an estimated 2 million+ CS2 players, one of the largest bases in the Middle East',
    gamingScene: 'Iran has one of the largest gaming populations in the Middle East, with CS2 and Dota 2 dominating the competitive scene. Tehran and Isfahan have thriving gaming cafe cultures. Despite international sanctions affecting some platforms, Iranian gamers are highly resourceful and crypto-savvy. Peer-to-peer USDT trading is widely used, making blockchain-based platforms like RaiseGG a natural fit for Iranian competitors.',
    regionCountries: ['turkey', 'georgia', 'armenia', 'azerbaijan'],
  },
  ukraine: {
    pingMs: '15–30 ms',
    currency: 'UAH',
    currencyRate: '1 USDC ≈ 42 Ukrainian Hryvnia',
    cs2Players: 'Ukraine has over 3 million CS2 players and is one of the strongest CS nations historically',
    gamingScene: 'Ukraine is a CS2 powerhouse — home to organizations like Natus Vincere (NAVI) and Monte. Ukrainian players dominate CIS leaderboards and regularly compete in international majors. The country has deep roots in competitive gaming dating back to CS 1.6 era. Despite ongoing challenges, the Ukrainian esports community remains one of the most active and skilled in the world. Crypto adoption surged in recent years, making USDC staking accessible.',
    regionCountries: ['poland', 'romania', 'russia', 'moldova'],
  },
  russia: {
    pingMs: '20–45 ms',
    currency: 'RUB',
    currencyRate: '1 USDC ≈ 93 Russian Ruble',
    cs2Players: 'Russia has the largest CS2 player base in the world, with over 10 million active players',
    gamingScene: 'Russia is the birthplace of many legendary CS players and organizations including Team Spirit, Virtus.pro, and Cloud9. Moscow and Saint Petersburg are major esports hubs with dedicated arenas. The Dota 2 scene is equally massive — Team Spirit won The International 2021. Russian players have unmatched depth of talent across all competitive titles. P2P crypto exchanges provide access to USDC and USDT for staking.',
    regionCountries: ['ukraine', 'kazakhstan', 'belarus', 'poland'],
  },
  kazakhstan: {
    pingMs: '40–65 ms',
    currency: 'KZT',
    currencyRate: '1 USDC ≈ 510 Kazakhstani Tenge',
    cs2Players: 'Kazakhstan has approximately 800,000 active CS2 players',
    gamingScene: 'Kazakhstan is the esports capital of Central Asia. Almaty and Astana host major regional tournaments, and Kazakh organizations like Virtus.pro (originally with Kazakh players) have competed at the highest level. The country has invested in esports infrastructure and has one of the best internet penetration rates in Central Asia. Binance is fully operational in Kazakhstan with KZT support.',
    regionCountries: ['uzbekistan', 'russia', 'kyrgyzstan'],
  },
  romania: {
    pingMs: '30–50 ms',
    currency: 'RON',
    currencyRate: '1 USDC ≈ 4.7 Romanian Leu',
    cs2Players: 'Romania has approximately 500,000 active CS2 players',
    gamingScene: 'Romania has one of the fastest internet speeds in Europe and a proud esports heritage. Bucharest regularly hosts esports events, and Romanian players have been part of notable international rosters. The country is a natural bridge between Western European and Balkan/Eastern European gaming communities. EUR deposits via Binance make USDC acquisition straightforward for Romanian players.',
    regionCountries: ['bulgaria', 'serbia', 'ukraine', 'moldova', 'greece'],
  },
  bulgaria: {
    pingMs: '25–45 ms',
    currency: 'BGN',
    currencyRate: '1 USDC ≈ 1.85 Bulgarian Lev',
    cs2Players: 'Bulgaria has around 300,000 active CS2 players',
    gamingScene: 'Bulgaria has a dedicated competitive gaming community with strong CS2 representation. Sofia has emerging esports venues, and Bulgarian players are regular fixtures in European qualifiers. The country benefits from excellent connectivity to EU servers. With the Bulgarian Lev pegged to the Euro, converting to USDC via Binance EUR deposits is seamless.',
    regionCountries: ['romania', 'serbia', 'greece', 'turkey', 'north-macedonia'],
  },
  serbia: {
    pingMs: '25–40 ms',
    currency: 'RSD',
    currencyRate: '1 USDC ≈ 111 Serbian Dinar',
    cs2Players: 'Serbia has approximately 250,000 active CS2 players',
    gamingScene: 'Serbia has a passionate gaming community with a strong CS legacy. Belgrade is the hub of Serbian esports, hosting local LANs and producing players who compete across Europe. Serbian players are known for their aggressive playstyle and mechanical skill. The Balkan region as a whole produces talent disproportionate to its population size. Binance supports EUR deposits for Serbian users.',
    regionCountries: ['romania', 'bulgaria', 'greece', 'bosnia', 'croatia', 'montenegro'],
  },
  greece: {
    pingMs: '30–50 ms',
    currency: 'EUR',
    currencyRate: '1 USDC ≈ 0.93 Euro',
    cs2Players: 'Greece has around 350,000 active CS2 players',
    gamingScene: 'Greece has a vibrant esports scene, particularly in CS2 and League of Legends. Athens and Thessaloniki have active gaming communities with regular local tournaments. Greek internet infrastructure has improved significantly, with fiber rollouts bringing competitive-grade connections to most urban areas. As a Eurozone country, Greek players can buy USDC directly with EUR on major exchanges.',
    regionCountries: ['turkey', 'bulgaria', 'romania', 'serbia', 'cyprus'],
  },
  poland: {
    pingMs: '20–35 ms',
    currency: 'PLN',
    currencyRate: '1 USDC ≈ 4.05 Polish Zloty',
    cs2Players: 'Poland has over 2.5 million CS2 players, one of the largest communities in Europe',
    gamingScene: 'Poland is a CS2 superpower. The country produced legendary teams like Virtus.pro (the Polish lineup) and players like NEO, TaZ, pashaBiceps, and Snax. Katowice hosts IEM Katowice, one of the most prestigious CS tournaments in the world. Polish gaming culture runs deep, with internet cafes (kafejki) being a foundational part of the scene. Binance supports PLN deposits directly.',
    regionCountries: ['ukraine', 'czech', 'slovakia', 'germany', 'lithuania'],
  },
  uzbekistan: {
    pingMs: '50–75 ms',
    currency: 'UZS',
    currencyRate: '1 USDC ≈ 12,900 Uzbekistani Som',
    cs2Players: 'Uzbekistan has approximately 200,000 active CS2 players',
    gamingScene: 'Uzbekistan has a growing competitive gaming scene, particularly in CS2 and Dota 2. Tashkent is the center of Uzbek esports, with gaming cafes serving as community hubs. The government has shown increasing interest in esports as part of youth development initiatives. Binance is accessible in Uzbekistan, making USDC staking practical for local players.',
    regionCountries: ['kazakhstan', 'kyrgyzstan', 'tajikistan', 'turkmenistan'],
  },
  israel: {
    pingMs: '40–60 ms',
    currency: 'ILS',
    currencyRate: '1 USDC ≈ 3.6 Israeli Shekel',
    cs2Players: 'Israel has approximately 400,000 active CS2 players',
    gamingScene: 'Israel has a strong and well-organized esports ecosystem. Tel Aviv hosts gaming events and has a thriving startup scene that intersects with esports. Israeli players compete primarily on EU servers and have produced notable professional players. The country has high crypto adoption rates and tech-savvy gamers who are comfortable with blockchain-based platforms.',
    regionCountries: ['turkey', 'cyprus', 'jordan', 'greece'],
  },
}

// Fallback data for non-indexed countries
function getCountryData(country: string): CountryData {
  if (COUNTRY_DATA[country]) return COUNTRY_DATA[country]

  // Generate reasonable defaults based on region
  const group = getCountryGroup(country)
  const countryName = COUNTRIES[country] || country
  const regionDefaults: Record<string, Partial<CountryData>> = {
    caucasus: { pingMs: '30–55 ms', gamingScene: `${countryName} is part of the Caucasus gaming region with growing competitive communities.` },
    balkans: { pingMs: '25–50 ms', gamingScene: `${countryName} contributes to the Balkans' strong competitive gaming tradition.` },
    eastern_europe: { pingMs: '20–40 ms', gamingScene: `${countryName} is part of the Eastern European gaming scene with deep CS roots.` },
    central_asia: { pingMs: '50–80 ms', gamingScene: `${countryName} has a developing esports scene with growing interest in competitive titles.` },
    other: { pingMs: '30–60 ms', gamingScene: `${countryName} has active competitive gaming communities across multiple titles.` },
  }
  const defaults = regionDefaults[group] || regionDefaults.other
  return {
    pingMs: defaults.pingMs || '30–60 ms',
    currency: '—',
    currencyRate: 'Check current rates on Binance or OKX',
    cs2Players: `${countryName} has an active and growing CS2 player community`,
    gamingScene: defaults.gamingScene || `${countryName} has active competitive gaming communities.`,
    regionCountries: [],
  }
}

// ── Region grouping ───────────────────────────────────────────────────────────

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

export const dynamicParams = false

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
  if (!parsed) notFound()

  const { game, country } = parsed
  const gameName = GAME_NAMES[game]
  const countryName = COUNTRIES[country]
  const isIndexed = INDEXED_COUNTRIES.has(country)

  return {
    title: `${gameName} Stake Platform in ${countryName} — Win USDC/USDT`,
    description: `The leading ${gameName} stake platform for players in ${countryName}. Join RaiseGG, compete in ranked lobbies and win real USDC or USDT. ${countryName} players welcome.`,
    ...(!isIndexed && { robots: { index: false, follow: true } }),
    alternates: {
      canonical: `https://raisegg.com/${slug}`,
    },
    openGraph: {
      title: `RaiseGG – ${gameName} in ${countryName}`,
      description: `${gameName} stake matches for ${countryName} players. Win real USDC or USDT.`,
      url: `https://raisegg.com/${slug}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(gameName + ' in ' + countryName)}&sub=raisegg.com&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `RaiseGG – ${gameName} in ${countryName}`,
      images: [`/api/og?title=${encodeURIComponent(gameName + ' in ' + countryName)}&sub=raisegg.com&color=7b61ff`],
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
  const countryData = getCountryData(country)
  const isIndexed = INDEXED_COUNTRIES.has(country)

  const lpSchema = landingPageSchema(game, countryName)
  const vgSchema = videoGameSchema(game as 'cs2' | 'dota2' | 'deadlock')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: gameName, url: `https://raisegg.com/games/${game}` },
    { name: countryName, url: `https://raisegg.com/${slug}` },
  ])

  // Build region cross-links for indexed countries
  const regionLinks = countryData.regionCountries
    .filter((slug) => COUNTRIES[slug])
    .map((slug) => ({ slug, name: COUNTRIES[slug] }))

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
          RaiseGG is the leading {gameName} stake platform for players in {countryName}.
          Compete in ranked matches, stake USDC or USDT, and win instantly via Solana smart contract.
          No Western ping disadvantage — servers built for your region.
        </p>

        {/* Country-specific stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Platform Fee', value: '10%' },
            { label: 'Payout Speed', value: 'Instant' },
            { label: `Ping from ${countryName}`, value: countryData.pingMs },
            { label: 'Local Rate', value: countryData.currencyRate.split('≈')[0]?.includes('USDC') ? countryData.currencyRate : countryData.currency !== '—' ? `≈ ${countryData.currencyRate.split('≈')[1]?.trim() || countryData.currencyRate}` : 'See exchange' },
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

        {/* Country-specific gaming scene — unique content per country */}
        {isIndexed && (
          <div className="mt-12 mb-4">
            <div className="card">
              <h2 className="font-orbitron text-lg font-bold text-white mb-3">
                {gameName} Scene in {countryName}
              </h2>
              <p className="text-muted text-sm leading-relaxed mb-4">{countryData.gamingScene}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-white/5 rounded p-3">
                  <div className="font-orbitron text-xs text-accent-cyan uppercase tracking-widest mb-1">Player Base</div>
                  <p className="text-muted text-sm">{countryData.cs2Players}</p>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="font-orbitron text-xs text-accent-cyan uppercase tracking-widest mb-1">Currency</div>
                  <p className="text-muted text-sm">{countryData.currencyRate}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regional context */}
        <div className={`${isIndexed ? 'mb-4' : 'mt-12 mb-4'} grid md:grid-cols-2 gap-4`}>
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

        {/* Cross-links to related countries in the same region */}
        {isIndexed && regionLinks.length > 0 && (
          <div className="mb-8">
            <div className="card">
              <div className="font-orbitron text-xs text-muted uppercase tracking-widest mb-3">
                Also Available Nearby
              </div>
              <div className="flex flex-wrap gap-2">
                {regionLinks.map((link) => (
                  <a
                    key={link.slug}
                    href={`/${game}-platform-${link.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-accent-cyan hover:underline transition-colors"
                  >
                    {gameName} in {link.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-16 mb-12">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-8">
            How to Start Playing {gameName} in {countryName}
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Connect Steam', body: 'Log in with your Steam account. No email or ID required.' },
              { step: '02', title: 'Get USDC/USDT', body: `Buy USDC or USDT on Binance or OKX${countryData.currency !== '—' ? ` using ${countryData.currency}` : ''} and send it to your Phantom wallet.` },
              { step: '03', title: 'Deposit', body: 'Deposit from your wallet to your RaiseGG balance in one click.' },
              { step: '04', title: 'Play & Win', body: `Create or join a stake match. Win 90% of the pot, paid instantly. Expected ping from ${countryName}: ${countryData.pingMs}.` },
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
                q: `How do I get USDC or USDT in ${countryName}?`,
                a: `Buy USDC or USDT on Binance or OKX (available in ${countryName}). ${countryData.currency !== '—' ? `Current rate: ${countryData.currencyRate}. ` : ''}Withdraw to your Phantom wallet on the Solana network, then deposit to RaiseGG.`,
              },
              {
                q: `What ping will I get from ${countryName}?`,
                a: `Players in ${countryName} typically experience ${countryData.pingMs} ping to RaiseGG servers, which is well within competitive range for ${gameName}.`,
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

        <RegionLinks currentGame={game} currentCountry={country} />
      </div>
    </>
  )
}
