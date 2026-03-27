import type { Metadata } from 'next'
import Link from 'next/link'
import { videoGameSchema, breadcrumbSchema } from '@/lib/schemas'
import { Bell, Trophy, Users, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Deadlock Stake Matches — The Only Platform',
  description: 'RaiseGG.gg is the first and only competitive stake platform for Deadlock. Stake USDC, compete, win. Join the Caucasus, Turkey and Balkans Deadlock community.',
  alternates: { canonical: 'https://raisegg.gg/games/deadlock' },
  openGraph: {
    title: 'RaiseGG.gg – Deadlock Stake Matches',
    description: 'The only Deadlock stake platform. Win real USDC.',
    url: 'https://raisegg.gg/games/deadlock',
    images: [{ url: '/api/og?title=Deadlock+Stake+Matches&sub=First+%26+Only&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG.gg – Deadlock Stake Matches',
    images: ['/api/og?title=Deadlock+Stake+Matches&sub=First+%26+Only&color=7b61ff'],
  },
}

export default function DeadlockPage() {
  const gameSchema = videoGameSchema('deadlock')
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Games', url: 'https://raisegg.gg/games' },
    { name: 'Deadlock', url: 'https://raisegg.gg/games/deadlock' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section className="relative bg-gradient-hero border-b border-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-accent-cyan/6 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="badge-purple text-xs">First & Only Platform</span>
            <span className="flex items-center gap-1 text-xs text-yellow-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> Coming Soon
            </span>
          </div>
          <h1 className="font-orbitron text-5xl md:text-6xl font-black mb-4">
            <span className="text-gradient">Deadlock</span> <span className="text-white">Stake Matches</span>
          </h1>
          <p className="text-xl text-muted max-w-xl mb-8 leading-relaxed">
            RaiseGG is the world's first stake platform for Deadlock. Match verification launches the moment Valve opens their API. Register now to be first in queue.
          </p>
          <Link href="/api/auth/steam" className="btn-primary px-8 py-4 text-base inline-block">
            Connect Steam — Get Notified
          </Link>
        </div>
      </section>

      {/* What is Deadlock */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title mb-6">What is Deadlock?</h2>
        <p className="text-muted text-lg leading-relaxed mb-6">
          Deadlock is Valve's third major multiplayer game — a 6v6 hero-based shooter with MOBA elements. Two teams fight across four lanes using heroes with unique abilities, but gunplay is just as important as skill usage.
        </p>
        <p className="text-muted leading-relaxed mb-8">
          Released in early access in 2024, Deadlock already has over 200,000 concurrent players. The skill ceiling is high and MMR is volatile — ideal conditions for competitive staking.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Users,  label: '200K+',      sub: 'Active Players' },
            { icon: Trophy, label: '6v6',         sub: 'Format' },
            { icon: Zap,    label: 'USDC Payout', sub: 'On Win' },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <s.icon className="w-8 h-8 text-accent-purple mx-auto mb-2" />
              <div className="font-orbitron text-2xl font-black text-white mb-1">{s.label}</div>
              <div className="text-xs text-muted">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why first mover matters */}
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-title mb-4">Why Register Now?</h2>
          <p className="text-muted mb-8 leading-relaxed">
            The moment Valve releases public match history for Deadlock, we flip the switch. Players registered before launch get priority lobby access, lower minimum stakes, and first-mover ELO rankings — the equivalent of starting a new season with an empty leaderboard.
          </p>
          <div className="card flex items-start gap-4 text-left">
            <Bell className="w-6 h-6 text-accent-purple flex-shrink-0 mt-1" />
            <div>
              <div className="font-orbitron font-bold text-white mb-1">Get Notified at Launch</div>
              <div className="text-muted text-sm">Connect your Steam account now. We'll alert you the moment Deadlock staking goes live — so you can stake before the competition catches up.</div>
            </div>
          </div>
          <div className="mt-8">
            <Link href="/api/auth/steam" className="btn-primary px-8 py-4 inline-block">Connect Steam & Register Interest</Link>
          </div>
        </div>
      </section>

      {/* Blog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="section-title mb-4">Learn About Deadlock</h2>
        <Link href="/blog/what-is-deadlock-valve" className="card-hover block">
          <div className="badge-purple text-xs mb-2 inline-block">Deadlock</div>
          <h3 className="font-orbitron font-bold text-white mb-1">What is Deadlock? Valve's New Hero Shooter Explained</h3>
          <p className="text-muted text-sm">A quick introduction to Deadlock and why RaiseGG is first to support it for competitive staking.</p>
        </Link>
      </section>
    </>
  )
}
