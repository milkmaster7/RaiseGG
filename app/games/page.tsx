import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema } from '@/lib/schemas'
import { Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Games — CS2, Dota 2 & Deadlock Stake Matches',
  description: 'Choose your game. RaiseGG supports CS2, Dota 2 and Deadlock stake matches with instant USDC/USDT payouts.',
  alternates: { canonical: 'https://raisegg.com/games' },
  openGraph: {
    title: 'Games — RaiseGG',
    description: 'CS2, Dota 2 and Deadlock stake matches. Pick your game.',
    url: 'https://raisegg.com/games',
    images: [{ url: '/api/og?title=Games&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Games — RaiseGG',
    images: ['/api/og?title=Games&sub=RaiseGG&color=7b61ff'],
  },
}

const GAMES = [
  {
    href:    '/games/cs2',
    name:    'CS2',
    full:    'Counter-Strike 2',
    badge:   'Most Popular',
    color:   'text-accent-cyan',
    border:  'border-accent-cyan/30 hover:border-accent-cyan/60',
    desc:    'Dedicated servers, automatic result detection, 1v1 and 5v5 stake matches.',
  },
  {
    href:    '/games/dota2',
    name:    'Dota 2',
    full:    'Dota 2',
    badge:   'Fast Payout',
    color:   'text-accent-cyan',
    border:  'border-accent-cyan/30 hover:border-accent-cyan/60',
    desc:    'Verified via Steam API. Submit your match ID and get paid in seconds.',
  },
  {
    href:    '/games/deadlock',
    name:    'Deadlock',
    full:    'Deadlock',
    badge:   'Coming Soon',
    color:   'text-accent-cyan',
    border:  'border-accent-cyan/20 hover:border-accent-cyan/40',
    desc:    "Valve's newest game. Stake matches coming once the match API is available.",
  },
]

export default function GamesPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home',  url: 'https://raisegg.com' },
    { name: 'Games', url: 'https://raisegg.com/games' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-3">
          <span className="text-gradient">Games</span>
        </h1>
        <p className="text-muted text-lg mb-12">Choose your game, stake USDC or USDT and compete for instant payouts.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {GAMES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className={`card-hover group block border ${g.border} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className={`w-5 h-5 ${g.color}`} />
                <span className={`text-xs font-semibold ${g.color} font-orbitron`}>{g.badge}</span>
              </div>
              <h2 className="font-orbitron text-xl font-black text-white mb-2 group-hover:text-gradient transition-all">
                {g.name}
              </h2>
              <p className="text-muted text-sm leading-relaxed">{g.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
