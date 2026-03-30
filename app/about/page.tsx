import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Zap, Globe, DollarSign } from 'lucide-react'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'About RaiseGG',
  description: 'RaiseGG is the first competitive CS2, Dota 2 and Deadlock stake platform built for the Caucasus, Turkey and Balkans region.',
  alternates: { canonical: 'https://raisegg.com/about' },
  openGraph: {
    title: 'About RaiseGG',
    description: 'The first stake platform built for the Caucasus, Turkey and Balkans.',
    url: 'https://raisegg.com/about',
    images: [{ url: '/api/og?title=About+RaiseGG&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About RaiseGG',
    images: ['/api/og?title=About+RaiseGG&sub=RaiseGG&color=7b61ff'],
  },
}

const VALUES = [
  {
    icon: Shield,
    title: 'Trustless by Design',
    body: 'Stakes are held in a Solana smart contract. The code pays the winner — no human approval, no delays, no chance of funds going missing.',
  },
  {
    icon: Zap,
    title: 'Instant Payouts',
    body: 'Winnings hit your wallet in under 30 seconds. No withdrawal queues, no KYC holds, no "processing" periods.',
  },
  {
    icon: Globe,
    title: 'Built for This Region',
    body: '44 countries across the Caucasus, Turkey and Balkans. Servers optimised for your ping, not for Western players. A platform that actually knows where you are.',
  },
  {
    icon: DollarSign,
    title: 'Simple, Honest Fees',
    body: '10% rake on completed matches. No subscription. No premium tier. No hidden charges. You know exactly what you\'re paying before you stake.',
  },
]

export default function AboutPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'About', url: 'https://raisegg.com/about' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl sm:text-5xl font-black mb-6 text-gradient leading-tight">
          Built for the Caucasus.<br />Built to be Fair.
        </h1>
        <p className="text-muted text-lg leading-relaxed max-w-2xl mb-12">
          RaiseGG is the first competitive stake platform for CS2, Dota 2 and Deadlock
          designed specifically for players in the Caucasus, Turkey and Balkans. 44 countries
          that Western platforms have ignored for years.
        </p>

        {/* Values */}
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          {VALUES.map((v) => (
            <div key={v.title} className="card flex gap-4">
              <v.icon className="w-6 h-6 text-accent-cyan flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-white mb-1">{v.title}</h2>
                <p className="text-muted text-sm leading-relaxed">{v.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Story */}
        <div className="space-y-6 text-muted leading-relaxed mb-16">
          <h2 className="font-orbitron text-2xl font-bold text-white">The Problem We're Solving</h2>
          <p>
            Every serious CS2 or Dota 2 player in Georgia, Turkey, Armenia, or Serbia knows the
            frustration: you want to prove you're better than someone and put something on the line,
            but there's no safe way to do it. PayPal bets go wrong. Crypto trades on Discord get
            scammed. Betting sites don't pay. Traditional platforms have no financial stakes.
          </p>
          <p>
            RaiseGG removes all of that friction. The smart contract is the escrow. The Steam API
            is the referee. You compete, the code pays. No trust required on either side.
          </p>

          <h2 className="font-orbitron text-2xl font-bold text-white mt-10">Why Solana?</h2>
          <p>
            We looked at Ethereum (too expensive — gas fees would eat small stakes), PayPal and
            Stripe (don't support this use case in most of our target countries), and traditional
            banking (excludes large parts of our player base). Solana gives us sub-cent transaction
            fees, 400ms finality, and stablecoins (USDC and USDT) — dollar-pegged tokens that mean
            your $10 stake is worth exactly $10, not subject to SOL price swings.
          </p>

          <h2 className="font-orbitron text-2xl font-bold text-white mt-10">The Platform Fee</h2>
          <p>
            We take 10% of the total pot from each completed match. On a $10 stake match, the winner
            receives $18 and we receive $2. That rake funds server costs, development, and regional
            expansion. We don't charge subscriptions, monthly fees, or hidden charges.
          </p>
        </div>

        {/* Mission */}
        <div className="mb-16">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-6">Who Builds This</h2>
          <div className="card">
            <p className="text-muted text-sm leading-relaxed mb-4">
              RaiseGG is built by a small, independent team of competitive gamers and engineers
              who grew up playing CS and Dota in the Caucasus and Turkey — and got tired of
              being ignored by Western platforms.
            </p>
            <p className="text-muted text-sm leading-relaxed mb-4">
              No venture capital. No corporate parent. Just builders who play the same games
              you do, on the same servers, in the same region.
            </p>
            <p className="text-muted text-sm leading-relaxed">
              Questions? Reach us at{' '}
              <a href="mailto:hello@raisegg.com" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">hello@raisegg.com</a>{' '}
              or in our{' '}
              <a href="https://t.me/raise_GG" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">Telegram</a>.
            </p>
          </div>
        </div>

        {/* Smart Contract Transparency */}
        <div className="card mb-8">
          <h2 className="font-orbitron text-xl font-bold text-white mb-4">Smart Contract Transparency</h2>
          <p className="text-muted text-sm leading-relaxed mb-4">
            RaiseGG runs on a publicly verifiable Solana smart contract. All vaults and payouts can be inspected on-chain by anyone.
          </p>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-xs text-muted uppercase tracking-wider font-semibold w-24 flex-shrink-0">Program</span>
              <a
                href="https://solscan.io/account/BqzXnsQCjBb7v9K4wMiFddfMa3dC1tFhxLEgBqyWpZGv"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-accent-cyan hover:text-accent-cyan-glow transition-colors break-all"
              >
                BqzXnsQCjBb7v9K4wMiFddfMa3dC1tFhxLEgBqyWpZGv ↗
              </a>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-xs text-muted uppercase tracking-wider font-semibold w-24 flex-shrink-0">Treasury</span>
              <a
                href="https://solscan.io/account/CT7qFYnCwDgDquTxAL8eBQqBvDBqUJemSz3KEZvqc2HW"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-accent-cyan hover:text-accent-cyan-glow transition-colors break-all"
              >
                CT7qFYnCwDgDquTxAL8eBQqBvDBqUJemSz3KEZvqc2HW ↗
              </a>
            </div>
          </div>
        </div>

        {/* Community */}
        <div className="mb-8">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-4">Community</h2>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            Join 500+ players on our Telegram. Get match alerts, find opponents, talk strategy.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <a
              href="https://t.me/raise_GG"
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-center gap-4 hover:border-accent-cyan/40 transition-colors group"
            >
              <span className="text-2xl">✈️</span>
              <div>
                <div className="font-orbitron font-bold text-white text-sm group-hover:text-gradient transition-all">Telegram</div>
                <div className="text-xs text-muted">t.me/raisegg · 500+ players</div>
              </div>
            </a>
            <a
              href="https://twitter.com/RaiseGG"
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-center gap-4 hover:border-accent-cyan/40 transition-colors group"
            >
              <span className="text-2xl">𝕏</span>
              <div>
                <div className="font-orbitron font-bold text-white text-sm group-hover:text-gradient transition-all">Twitter / X</div>
                <div className="text-xs text-muted">@RaiseGG · Updates &amp; announcements</div>
              </div>
            </a>
          </div>
          <p className="text-xs text-muted">
            Press &amp; partnerships:{' '}
            <a href="mailto:hello@raisegg.com" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">
              hello@raisegg.com
            </a>
          </p>
        </div>

        {/* CTA */}
        <div className="card text-center py-10">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-3">Ready to compete?</h2>
          <p className="text-muted text-sm mb-6">Connect Steam, deposit USDC or USDT, and play your first match in under 5 minutes.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/api/auth/steam" className="btn-primary px-6 py-3">
              Connect Steam
            </a>
            <Link href="/how-it-works" className="btn-secondary px-6 py-3">
              How It Works
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
