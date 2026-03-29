import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Shield, Zap, Trophy, Users, TrendingUp, Globe } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase'
import { faqSchema, softwareAppSchema } from '@/lib/schemas'
import { LiveMatchFeed } from '@/components/matches/LiveMatchFeed'

export const revalidate = 60
import { ActiveCounter } from '@/components/ui/ActiveCounter'
import { readSessionFromCookies } from '@/lib/session'

export const metadata: Metadata = {
  title: 'CS2, Dota 2 & Deadlock Stake Matches — Win Real USDC/USDT',
  description:
    'Stake USDC or USDT on CS2, Dota 2 and Deadlock matches. The first competitive wagering platform for the Caucasus, Turkey and Balkans — fair play, instant payouts, no trust required.',
  alternates: { canonical: 'https://raisegg.com' },
  openGraph: {
    title: 'RaiseGG – CS2, Dota 2 & Deadlock Stake Matches',
    description: 'Stake USDC or USDT on competitive matches. Instant payouts. 44 countries.',
    url: 'https://raisegg.com',
    images: [{ url: '/api/og?title=CS2,+Dota+2+%26+Deadlock+Stake+Matches&sub=RaiseGG&color=7b61ff', width: 1200, height: 630, alt: 'RaiseGG' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG – CS2, Dota 2 & Deadlock Stake Matches',
    description: 'Stake USDC or USDT on competitive matches. Instant payouts. 44 countries.',
    images: ['/api/og?title=CS2,+Dota+2+%26+Deadlock+Stake+Matches&sub=RaiseGG&color=7b61ff'],
  },
}

const GAMES = [
  { name: 'CS2',      href: '/games/cs2',      players: '1.27M', description: 'Dedicated servers, 1v1 stake matches.',     badge: 'Most Popular', color: 'cyan'   },
  { name: 'Dota 2',  href: '/games/dota2',     players: '608K',  description: 'Auto-verified results via Steam API.',               badge: 'Fast Payout',  color: 'purple' },
  { name: 'Deadlock', href: '/games/deadlock', players: '218K',  description: 'The only stake platform for Valve\'s newest game.',  badge: 'First & Only', color: 'purple' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Connect Steam',    description: 'Link your Steam account. We verify rank, hours and VAC status automatically.', icon: Shield },
  { step: '02', title: 'Stake USDC/USDT',  description: 'Set your stake. Funds go into a Solana smart contract — trustless, nobody can touch them.', icon: Zap },
  { step: '03', title: 'Play & Win',       description: 'Play the match. Winner gets 90% of the pot instantly. No waiting.', icon: Trophy },
]

// Stats fetched from real DB in the component below

const TRUST_POINTS = [
  { title: 'Trustless Escrow',      description: 'Your stake goes into a Solana smart contract. Nobody — not even us — can touch it until the match resolves.', icon: Shield },
  { title: 'Instant Payouts',       description: 'Winner gets 90% of the pot in seconds. USDC or USDT, straight to your wallet. No waiting, no approval.', icon: Zap },
  { title: 'Built for Your Region', description: 'Optimised servers and low-latency infrastructure for the Caucasus, Turkey, Balkans and Central Asia.', icon: Globe },
]

const FAQS = [
  { question: 'How does stake verification work?',    answer: 'For Dota 2, submit your match ID — our system pulls the result directly from Steam\'s API and pays out automatically. For CS2, matches are played on our dedicated servers and results are recorded automatically.' },
  { question: 'Are my funds safe?',                   answer: 'Yes. Stake funds (USDC or USDT) are held in a Solana smart contract. Neither us nor anyone else can touch them. Funds are only released when a verified match result is confirmed.' },
  { question: 'What countries can play?',             answer: 'We serve 44 countries across the Caucasus, Turkey, Balkans, and surrounding regions — built for players who have historically had poor server options on Western platforms.' },
  { question: 'What is the platform fee?',            answer: 'We take 10% of the pot from each resolved match. The winner receives 90%. No subscriptions, no hidden fees.' },
]

async function getRealStats() {
  const supabase = createServiceClient()
  const [{ count: playerCount }, { count: matchCount }, { data: payouts }] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('eligible', true),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('transactions').select('amount').eq('type', 'win'),
  ])
  const totalPaid = (payouts ?? []).reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0)
  return { players: playerCount ?? 0, matches: matchCount ?? 0, totalPaid }
}

export default async function HomePage() {
  // Logged-in users skip the marketing page and go straight to live matches
  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)
  if (playerId) redirect('/play')

  const stats = await getRealStats()
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
          <div className="inline-flex items-center gap-2 badge-cyan mb-6 text-sm">
            <span className="live-dot" /> 44 Countries — No Competition
          </div>
          <h1 className="font-orbitron text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="text-gradient">STAKE.</span>{' '}<span className="text-white">PLAY.</span>{' '}<span className="text-gradient">WIN.</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            The first competitive stake platform for <strong className="text-white">CS2</strong>,{' '}
            <strong className="text-white">Dota 2</strong> and <strong className="text-white">Deadlock</strong> built for the Caucasus, Turkey and Balkans. Instant USDC/USDT payouts. Zero trust required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/api/auth/steam" className="btn-primary text-base px-8 py-4">Connect Steam & Play</Link>
            <Link href="/how-it-works" className="btn-secondary text-base px-8 py-4">How It Works</Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-border bg-space-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-accent-cyan flex-shrink-0" />
              <div>
                <div className="font-orbitron font-bold text-xl text-accent-cyan">44</div>
                <div className="text-xs text-muted uppercase tracking-wider">Countries</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-accent-cyan flex-shrink-0" />
              <div>
                <div className="font-orbitron font-bold text-xl text-accent-cyan">{stats.players.toLocaleString()}</div>
                <div className="text-xs text-muted uppercase tracking-wider"><ActiveCounter /></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-accent-cyan flex-shrink-0" />
              <div>
                <div className="font-orbitron font-bold text-xl text-accent-cyan">{stats.matches.toLocaleString()}</div>
                <div className="text-xs text-muted uppercase tracking-wider">Matches Played</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-accent-cyan flex-shrink-0" />
              <div>
                <div className="font-orbitron font-bold text-xl text-accent-cyan">${stats.totalPaid.toLocaleString()}</div>
                <div className="text-xs text-muted uppercase tracking-wider">Paid Out</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Matches ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title flex items-center gap-3">
            <span className="live-dot" /> Live Matches
          </h2>
          <Link href="/play" className="text-sm text-accent-cyan hover:text-accent-cyan-glow transition-colors">
            View all →
          </Link>
        </div>
        <LiveMatchFeed />
      </section>

      {/* ── Games ── */}
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-4">Choose Your Game</h2>
          <p className="text-muted text-center mb-10">Three games. One platform. Real money on the line.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {GAMES.map((game) => (
              <Link key={game.name} href={game.href} className="card-hover group block">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-orbitron text-2xl font-bold text-white group-hover:text-gradient transition-all">{game.name}</h3>
                  <span className="badge-cyan text-xs">{game.badge}</span>
                </div>
                <p className="text-muted text-sm mb-4 leading-relaxed">{game.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Global players</span>
                  <span className="font-orbitron font-bold text-accent-cyan">{game.players}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="section-title text-center mb-4">How It Works</h2>
        <p className="text-muted text-center mb-16">Three steps. No trust required.</p>
        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded bg-accent-cyan/10 border border-accent-cyan/30 mb-6">
                <step.icon className="w-7 h-7 text-accent-cyan" />
              </div>
              <div className="font-orbitron text-xs text-accent-cyan tracking-widest mb-2">STEP {step.step}</div>
              <h3 className="font-orbitron text-lg font-bold text-white mb-3">{step.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/how-it-works" className="btn-secondary px-8 py-3">Full Explainer</Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-10">Common Questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.question} className="card">
                <h3 className="font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/faq" className="text-accent-cyan hover:text-accent-cyan-glow text-sm transition-colors">View all FAQs →</Link>
          </div>
        </div>
      </section>

      {/* ── Why RaiseGG ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="font-orbitron text-3xl font-black text-center mb-4">
          <span className="text-gradient">Why RaiseGG</span>
        </h2>
        <p className="text-muted text-center mb-10">No PayPal middlemen. No Discord scams. Just code.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {TRUST_POINTS.map((t) => (
            <div key={t.title} className="card text-center py-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded bg-accent-cyan/10 border border-accent-cyan/30 mb-5">
                <t.icon className="w-6 h-6 text-accent-cyan" />
              </div>
              <h3 className="font-orbitron text-lg font-bold text-white mb-3">{t.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="font-orbitron text-4xl font-black mb-4">
          Ready to <span className="text-gradient">compete?</span>
        </h2>
        <p className="text-muted mb-8 text-lg">Connect your Steam account and start staking in under 2 minutes.</p>
        <Link href="/api/auth/steam" className="btn-primary text-base px-10 py-4 inline-block">
          Connect Steam & Start Playing
        </Link>
        <p className="text-xs text-muted mt-3">$2 minimum stake · No KYC · Instant payouts</p>
      </section>
    </>
  )
}
