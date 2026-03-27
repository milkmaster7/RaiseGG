import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Zap, Globe, DollarSign } from 'lucide-react'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'About — RaiseGG.gg',
  description: 'RaiseGG.gg is the first competitive CS2, Dota 2 and Deadlock stake platform built for the Caucasus, Turkey and Balkans region.',
  alternates: { canonical: 'https://raisegg.gg/about' },
  openGraph: {
    title: 'About RaiseGG.gg',
    description: 'The first stake platform built for the Caucasus, Turkey and Balkans.',
    url: 'https://raisegg.gg/about',
    images: [{ url: '/api/og?title=About+RaiseGG&sub=RaiseGG.gg&color=7b61ff', width: 1200, height: 630 }],
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
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'About', url: 'https://raisegg.gg/about' },
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
          RaiseGG.gg is the first competitive stake platform for CS2, Dota 2 and Deadlock
          designed specifically for players in the Caucasus, Turkey and Balkans. 44 countries
          that Western platforms have ignored for years.
        </p>

        {/* Values */}
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          {VALUES.map((v) => (
            <div key={v.title} className="card flex gap-4">
              <v.icon className="w-6 h-6 text-accent-purple flex-shrink-0 mt-0.5" />
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
            fees, 400ms finality, and USDC — a dollar-pegged stablecoin that means your $10 stake
            is worth exactly $10, not subject to SOL price swings.
          </p>

          <h2 className="font-orbitron text-2xl font-bold text-white mt-10">The Platform Fee</h2>
          <p>
            We take 10% of the total pot from each completed match. On a $10 stake match, the winner
            receives $18 and we receive $2. That rake funds server costs, development, and regional
            expansion. We don't charge subscriptions, monthly fees, or hidden charges.
          </p>
        </div>

        {/* CTA */}
        <div className="card text-center py-10">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-3">Ready to compete?</h2>
          <p className="text-muted text-sm mb-6">Connect Steam, deposit USDC, and play your first match in under 5 minutes.</p>
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
