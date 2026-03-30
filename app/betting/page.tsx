import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/schemas'
import { ExternalLink, Shield, Zap, Globe, Trophy, Star, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Best Esports Betting Sites 2026 — CS2, Dota 2 & Deadlock',
  description:
    'Compare the best esports betting sites for CS2, Dota 2 and Deadlock. Exclusive bonuses from Rivalry, Thunderpick, GG.bet and more. Trusted reviews from RaiseGG.',
  alternates: { canonical: 'https://raisegg.com/betting' },
  keywords: [
    'esports betting sites', 'cs2 betting', 'dota 2 betting', 'deadlock betting',
    'rivalry esports', 'thunderpick review', 'gg.bet bonus', 'esports gambling',
    'cs2 match betting', 'best esports bookmaker', 'crypto esports betting',
  ],
  openGraph: {
    title: 'Best Esports Betting Sites 2026 — CS2, Dota 2 & Deadlock',
    description: 'Compare esports betting sites. Exclusive bonuses from Rivalry, Thunderpick & more.',
    url: 'https://raisegg.com/betting',
    images: [{ url: '/api/og?title=Best+Esports+Betting+Sites&sub=Trusted+Reviews&color=ffc800', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Esports Betting Sites 2026',
    images: ['/api/og?title=Best+Esports+Betting+Sites&sub=Trusted+Reviews&color=ffc800'],
  },
}

const BETTING_SITES = [
  {
    name: 'Rivalry',
    slug: 'rivalry',
    tagline: 'The #1 licensed esports bookmaker',
    rating: 4.8,
    bonus: '100% deposit match up to $100',
    url: 'https://www.rivalry.com',
    highlights: [
      'Licensed in Isle of Man (strict regulation)',
      'CS2, Dota 2, Deadlock & 20+ esports titles',
      'Crypto deposits (BTC, ETH, USDT, USDC)',
      'Live in-play betting with real-time odds',
      'Low minimum bet ($0.10)',
    ],
    games: ['CS2', 'Dota 2', 'Deadlock', 'LoL', 'Valorant'],
    deposit: ['Crypto', 'Card', 'Skrill', 'Jeton'],
    withdrawal: 'Instant crypto, 1-3 days fiat',
    tag: 'Editor\'s Choice',
    tagColor: 'bg-accent-gold/20 text-accent-gold border-accent-gold/40',
  },
  {
    name: 'Thunderpick',
    slug: 'thunderpick',
    tagline: 'Crypto-native esports betting',
    rating: 4.6,
    bonus: '5% cashback on all bets',
    url: 'https://thunderpick.io',
    highlights: [
      'Built for crypto — BTC, ETH, USDT, SOL',
      'CS2 & Dota 2 match betting + live odds',
      'Provably fair casino games alongside esports',
      'No KYC required for crypto deposits',
      'Telegram bot for instant bet notifications',
    ],
    games: ['CS2', 'Dota 2', 'LoL', 'Valorant', 'Starcraft'],
    deposit: ['BTC', 'ETH', 'USDT', 'SOL', 'LTC'],
    withdrawal: 'Instant crypto',
    tag: 'Best for Crypto',
    tagColor: 'bg-accent-purple/20 text-accent-purple border-accent-purple/40',
  },
  {
    name: 'GG.bet',
    slug: 'ggbet',
    tagline: 'Full-spectrum esports & sports betting',
    rating: 4.5,
    bonus: '200% first deposit bonus up to $200',
    url: 'https://gg.bet',
    highlights: [
      'Massive esports coverage — 30+ titles',
      'Live streaming of matches directly on site',
      'Combo bets and accumulators',
      'Available in Turkey, CIS, and Europe',
      'Mobile app for iOS and Android',
    ],
    games: ['CS2', 'Dota 2', 'LoL', 'Valorant', 'Rainbow Six'],
    deposit: ['Card', 'Crypto', 'Skrill', 'Bank Transfer'],
    withdrawal: '1-24 hours',
    tag: 'Biggest Coverage',
    tagColor: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40',
  },
  {
    name: 'Betway Esports',
    slug: 'betway',
    tagline: 'Trusted global brand with esports focus',
    rating: 4.4,
    bonus: 'Up to $30 free bet',
    url: 'https://betway.com/en/esports',
    highlights: [
      'Tier-1 licensed (MGA, UKGC)',
      'Sponsors of major CS2 and Dota 2 tournaments',
      'Competitive odds on tier-1 matches',
      'Cash out feature on live bets',
      'Dedicated esports section',
    ],
    games: ['CS2', 'Dota 2', 'LoL', 'Valorant', 'CoD'],
    deposit: ['Card', 'Skrill', 'Neteller', 'Bank'],
    withdrawal: '24-48 hours',
    tag: 'Most Trusted',
    tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  {
    name: 'Pinnacle',
    slug: 'pinnacle',
    tagline: 'Lowest margins, best odds for sharps',
    rating: 4.3,
    bonus: 'No bonus — lowest margins instead',
    url: 'https://www.pinnacle.com/en/esports',
    highlights: [
      'Industry-lowest margins (best odds)',
      'No bet limits — welcomes winning players',
      'CS2 & Dota 2 deep markets (maps, rounds, handicaps)',
      'Crypto deposits supported',
      'Professional-grade platform for serious bettors',
    ],
    games: ['CS2', 'Dota 2', 'LoL', 'Starcraft', 'Valorant'],
    deposit: ['Crypto', 'Card', 'Skrill', 'Bank'],
    withdrawal: '1-3 days',
    tag: 'Best Odds',
    tagColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
]

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const partial = rating - full
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < full ? 'text-accent-gold fill-accent-gold' : i === full && partial > 0 ? 'text-accent-gold fill-accent-gold/50' : 'text-gray-600'}`}
        />
      ))}
      <span className="ml-1 text-sm font-bold text-white">{rating}</span>
    </div>
  )
}

export default function BettingPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Esports Betting', url: 'https://raisegg.com/betting' },
  ])

  const faqItems = [
    { question: 'What is the best esports betting site for CS2?', answer: 'Rivalry is our top pick for CS2 betting — licensed, great odds, and they accept crypto. Thunderpick is the best option for crypto-native bettors.' },
    { question: 'Can I bet on Dota 2 with crypto?', answer: 'Yes. Thunderpick, Rivalry, and Pinnacle all accept crypto deposits for Dota 2 betting. Thunderpick supports SOL (Solana) in addition to BTC and ETH.' },
    { question: 'What is the difference between betting and staking?', answer: 'Betting means wagering on someone else\'s match outcome. Staking (what RaiseGG offers) means putting your own money on YOUR match — the outcome depends on your skill, not luck.' },
    { question: 'Is esports betting legal?', answer: 'It depends on your country. Sites like Rivalry and Betway are fully licensed. Always check your local regulations before betting.' },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-sm text-muted mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">Esports Betting</span>
          </div>
          <h1 className="font-orbitron text-4xl font-black mb-4">
            <span className="text-gradient">Best Esports Betting Sites</span>
            <span className="text-white"> 2026</span>
          </h1>
          <p className="text-muted text-lg leading-relaxed max-w-3xl">
            We review the top esports betting sites for CS2, Dota 2 and Deadlock players. All sites listed are licensed
            and accept players from Turkey, the Caucasus and the Balkans.
          </p>
        </div>

        {/* Quick note about RaiseGG */}
        <div className="card border-accent-cyan/30 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-accent-cyan" />
            </div>
            <div>
              <h2 className="font-orbitron text-sm font-bold text-white mb-1">Want to stake on YOUR matches instead?</h2>
              <p className="text-muted text-sm leading-relaxed">
                RaiseGG lets you put USDC/USDT on your own CS2, Dota 2 and Deadlock games. It&apos;s not betting — it&apos;s skill-based competition
                with trustless smart contract escrow. Winner takes 90% of the pot instantly.
              </p>
              <Link href="/play" className="inline-flex items-center gap-1 text-accent-cyan text-sm font-semibold mt-2 hover:text-accent-cyan-glow transition-colors">
                Play Now <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Betting Sites */}
        <div className="space-y-6 mb-16">
          {BETTING_SITES.map((site, i) => (
            <div key={site.slug} className="card group hover:border-accent-cyan/30 transition-all" id={site.slug}>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left column */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-orbitron text-xs text-muted">#{i + 1}</span>
                        <h2 className="font-orbitron text-2xl font-bold text-white">{site.name}</h2>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${site.tagColor}`}>
                          {site.tag}
                        </span>
                      </div>
                      <p className="text-muted text-sm">{site.tagline}</p>
                    </div>
                  </div>

                  <StarRating rating={site.rating} />

                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 bg-accent-gold/10 border border-accent-gold/30 rounded px-3 py-1.5 mb-4">
                      <Trophy className="w-3.5 h-3.5 text-accent-gold" />
                      <span className="text-sm font-semibold text-accent-gold">{site.bonus}</span>
                    </div>

                    <ul className="space-y-2">
                      {site.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-sm text-gray-300">
                          <Shield className="w-3.5 h-3.5 text-accent-cyan mt-0.5 flex-shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right column — details */}
                <div className="lg:w-64 flex-shrink-0 space-y-3">
                  <div className="bg-space-700 rounded p-3">
                    <div className="text-xs text-muted uppercase tracking-wider mb-1">Games</div>
                    <div className="flex flex-wrap gap-1">
                      {site.games.map((g) => (
                        <span key={g} className="badge-cyan text-xs">{g}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-space-700 rounded p-3">
                    <div className="text-xs text-muted uppercase tracking-wider mb-1">Deposit Methods</div>
                    <div className="flex flex-wrap gap-1">
                      {site.deposit.map((d) => (
                        <span key={d} className="text-xs text-gray-300 bg-space-800 px-2 py-0.5 rounded">{d}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-space-700 rounded p-3">
                    <div className="text-xs text-muted uppercase tracking-wider mb-1">Withdrawal Speed</div>
                    <span className="text-sm text-white font-semibold">{site.withdrawal}</span>
                  </div>

                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="btn-primary w-full text-center text-sm py-3 flex items-center justify-center gap-2"
                  >
                    Visit {site.name} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Betting vs Staking comparison */}
        <section className="mb-16">
          <h2 className="font-orbitron text-2xl font-black mb-6">
            <span className="text-gradient">Betting vs Staking</span>
            <span className="text-white"> — What&apos;s the Difference?</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-orbitron text-lg font-bold text-accent-gold mb-3">Esports Betting</h3>
              <ul className="space-y-2 text-sm text-muted">
                <li>You wager on <strong className="text-white">other people&apos;s matches</strong></li>
                <li>Outcome based on luck + knowledge</li>
                <li>Bookmaker sets the odds (house edge)</li>
                <li>KYC required at most sites</li>
                <li>Payouts can take days</li>
              </ul>
            </div>
            <div className="card border-accent-cyan/30">
              <h3 className="font-orbitron text-lg font-bold text-accent-cyan mb-3">RaiseGG Staking</h3>
              <ul className="space-y-2 text-sm text-muted">
                <li>You stake on <strong className="text-white">your own matches</strong></li>
                <li>Outcome based purely on <strong className="text-white">your skill</strong></li>
                <li>No house edge — 90/10 split, transparent</li>
                <li>No KYC — just connect Steam</li>
                <li>Payouts in <strong className="text-white">seconds</strong> via Solana</li>
              </ul>
              <Link href="/play" className="btn-primary text-xs px-4 py-2 mt-4 inline-flex items-center gap-1">
                Try Staking <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="font-orbitron text-2xl font-black mb-6 text-gradient">Common Questions</h2>
          <div className="space-y-4">
            {faqItems.map((faq) => (
              <div key={faq.question} className="card">
                <h3 className="font-orbitron text-sm font-bold text-white mb-2">{faq.question}</h3>
                <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Internal links */}
        <section className="border-t border-border pt-8">
          <h2 className="font-orbitron text-lg font-bold text-white mb-4">Related Pages</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/play', label: 'Play Now' },
              { href: '/tournaments', label: 'Tournaments' },
              { href: '/blog', label: 'Blog' },
              { href: '/affiliate', label: 'Affiliate Program' },
              { href: '/referral', label: 'Referral Program' },
              { href: '/leaderboard', label: 'Leaderboard' },
              { href: '/games/cs2', label: 'CS2 Matches' },
              { href: '/games/dota2', label: 'Dota 2 Matches' },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="card-hover py-3 text-center text-sm text-white hover:text-accent-cyan transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
