import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Shield, Zap, Trophy, Users } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase'
import { faqSchema, softwareAppSchema } from '@/lib/schemas'
import { LiveMatchFeed } from '@/components/matches/LiveMatchFeed'
import { Accordion } from '@/components/ui/Accordion'
import { OnlineCounter } from '@/components/home/OnlineCounter'
import { StatsStrip } from '@/components/home/StatsStrip'
import { PingEstimate } from '@/components/home/PingEstimate'

export const revalidate = 60
import { readSessionFromCookies } from '@/lib/session'

export const metadata: Metadata = {
  title: 'CS2, Dota 2 & Deadlock Stake Matches — Win Real USDC/USDT',
  description:
    'Stake USDC or USDT on CS2, Dota 2 and Deadlock matches. The first competitive wagering platform for the Caucasus, Turkey and Balkans — fair play, instant payouts, no trust required.',
  alternates: { canonical: 'https://raisegg.com' },
  openGraph: {
    title: 'RaiseGG – CS2, Dota 2 & Deadlock Stake Matches',
    description: 'Stake USDC or USDT on competitive matches. Instant payouts.',
    url: 'https://raisegg.com',
    images: [{ url: 'https://raisegg.com/og.png', width: 1200, height: 630, alt: 'RaiseGG' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG – CS2, Dota 2 & Deadlock Stake Matches',
    description: 'Stake USDC or USDT on competitive matches. Instant payouts.',
    images: ['https://raisegg.com/og.png'],
  },
}

const GAMES = [
  { name: 'CS2',      href: '/games/cs2',      description: '1v1 stake matches on dedicated servers.',     art: 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg' },
  { name: 'Dota 2',  href: '/games/dota2',     description: 'Auto-verified results via Steam API.',               art: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/blog/play_dota_background.jpg' },
  { name: 'Deadlock', href: '/games/deadlock', description: 'Stake matches for Valve\'s newest game.',  art: 'https://cdn.akamai.steamstatic.com/steam/apps/1422450/library_hero.jpg' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Connect Steam',    description: 'Link your Steam account. We verify rank, hours and VAC status.', icon: Shield },
  { step: '02', title: 'Stake USDC/USDT',  description: 'Set your stake. Funds go into a Solana smart contract — trustless.', icon: Zap },
  { step: '03', title: 'Play & Win',       description: 'Winner gets 90% of the pot instantly. No waiting.', icon: Trophy },
]

const FAQS = [
  { question: 'How does it work?',            answer: 'Connect Steam, stake USDC/USDT, play the match. Winner gets 90% of the pot automatically. Funds are held in a Solana smart contract — nobody can touch them.' },
  { question: 'Are my funds safe?',           answer: 'Yes. Stake funds are held in a Solana smart contract. Neither us nor anyone else can touch them. Funds are only released when a verified match result is confirmed.' },
  { question: 'What is the platform fee?',    answer: 'We take 10% of the pot from each resolved match. The winner receives 90%. No subscriptions, no hidden fees.' },
]

export default async function HomePage() {
  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)

  const faqJsonLd = faqSchema(FAQS)
  const appJsonLd = softwareAppSchema()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd).replace(/</g, '\\u003c') }} />

      {/* ── Hero ── */}
      <section className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-cyan/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">
          <OnlineCounter />
          <h1 className="font-orbitron text-5xl md:text-7xl font-black mb-6 mt-4 leading-tight">
            <span className="text-white">Stake.</span>{' '}
            <span className="text-gradient">Play.</span>{' '}
            <span className="text-white">Win.</span>
          </h1>
          <p className="text-xl text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Stake <strong className="text-white">USDC</strong> on{' '}
            <strong className="text-white">CS2</strong>,{' '}
            <strong className="text-white">Dota 2</strong> &{' '}
            <strong className="text-white">Deadlock</strong>. Winner takes 90%. Instant payout. No trust required.
          </p>
          <Link href="/api/auth/steam" className="btn-primary text-lg px-10 py-4 inline-block">
            Connect Steam & Play
          </Link>
          <p className="text-xs text-muted mt-4">$2 minimum · No KYC · Solana escrow</p>
        </div>
      </section>

      {/* ── Games ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {GAMES.map((game) => (
            <Link key={game.name} href={game.href} className="card-hover group block relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <img src={game.art} alt={`${game.name}`} className="absolute inset-0 h-full w-full object-cover object-center opacity-60 group-hover:opacity-75 transition-opacity" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-r from-space-800 via-space-800/40 to-transparent" />
              </div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-orbitron text-2xl font-bold text-white group-hover:text-gradient transition-all">{game.name}</h3>
                </div>
                <p className="text-muted text-sm">{game.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded bg-accent-cyan/10 border border-accent-cyan/30 mb-5">
                  <step.icon className="w-6 h-6 text-accent-cyan" />
                </div>
                <div className="font-orbitron text-xs text-accent-cyan tracking-widest mb-2">STEP {step.step}</div>
                <h3 className="font-orbitron text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-muted text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ping + Live Matches ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <PingEstimate />
        <div className="flex items-center justify-between mb-6 mt-8">
          <h2 className="section-title flex items-center gap-3">
            <span className="live-dot" aria-hidden="true" /> Live Matches
          </h2>
        </div>
        <LiveMatchFeed />
      </section>


      {/* ── Real Stats ── */}
      <StatsStrip />

      {/* ── FAQ ── */}
      <section className="bg-space-800 border-y border-border py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-8">Questions</h2>
          <Accordion items={FAQS} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-orbitron text-4xl font-black mb-4">
          Ready to <span className="text-gradient">play?</span>
        </h2>
        <p className="text-muted mb-8">Connect Steam. Stake USDC. Win.</p>
        <Link href="/api/auth/steam" className="btn-primary text-lg px-10 py-4 inline-block">
          Connect Steam & Play
        </Link>
        <p className="text-xs text-muted mt-3">$2 minimum · 10% rake · No hidden fees</p>
      </section>
    </>
  )
}
