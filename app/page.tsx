import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Shield, Zap, Trophy, Users, TrendingUp, Globe, Radio, ExternalLink, FileCheck, Coins, Lock, Award, Eye } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase'
import { faqSchema, softwareAppSchema } from '@/lib/schemas'
import { LiveMatchFeed } from '@/components/matches/LiveMatchFeed'
import { Accordion } from '@/components/ui/Accordion'
import { PayoutTicker } from '@/components/home/PayoutTicker'
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup'

export const revalidate = 60
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
  { name: 'CS2',      href: '/games/cs2',      players: '1.27M', description: 'Dedicated servers, 1v1 stake matches.',     badge: 'Most Popular', color: 'cyan',   art: 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg' },
  { name: 'Dota 2',  href: '/games/dota2',     players: '608K',  description: 'Auto-verified results via Steam API.',               badge: 'Fast Payout',  color: 'purple', art: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/juggernaut.png' },
  { name: 'Deadlock', href: '/games/deadlock', players: '218K',  description: 'The only stake platform for Valve\'s newest game.',  badge: 'First & Only', color: 'purple', art: 'https://cdn.akamai.steamstatic.com/steam/apps/1422450/library_hero.jpg' },
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

const TRUST_BADGES = [
  { title: 'On-Chain Escrow',       description: 'Every stake held in a Solana smart contract. Verify on Solscan.', icon: Lock },
  { title: 'Skill-Based Platform',  description: 'Not gambling. Outcomes determined by player skill, not chance.',  icon: Award },
  { title: 'Instant Payouts',       description: 'Winners paid automatically. No withdrawal delays.',               icon: Zap },
  { title: 'Anti-Cheat Protected',  description: 'VAC monitoring, demo recording, automated detection.',            icon: Eye },
  { title: '44 Countries',          description: 'Built for the Caucasus, Turkey, Balkans and beyond.',             icon: Globe },
  { title: 'Trustless Platform',    description: 'Open-source smart contract. No middlemen. Code is the escrow.',   icon: Shield },
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

// Only show stats that have meaningful values — hide zeros
function buildStatItems(stats: { players: number; matches: number; totalPaid: number }) {
  const items: { icon: typeof Globe; value: string; label: string }[] = [
    { icon: Globe, value: '44', label: 'Countries' },
    { icon: Zap, value: '3 Games', label: 'CS2 · Dota 2 · Deadlock' },
  ]
  if (stats.players > 0) {
    items.push({ icon: Users, value: stats.players.toLocaleString(), label: 'Players' })
  }
  if (stats.matches > 0) {
    items.push({ icon: Trophy, value: stats.matches.toLocaleString(), label: 'Matches Played' })
  }
  if (stats.totalPaid > 0) {
    items.push({ icon: TrendingUp, value: `$${stats.totalPaid.toLocaleString()}`, label: 'Paid Out' })
  }
  // Always show 4 items — fill remaining slots with platform highlights
  if (items.length < 4) {
    items.push({ icon: Shield, value: '10%', label: 'Rake — No Hidden Fees' })
  }
  if (items.length < 4) {
    items.push({ icon: TrendingUp, value: 'Instant', label: 'USDC/USDT Payouts' })
  }
  return items.slice(0, 4)
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
            <span className="live-dot" aria-hidden="true" /> Live in 44 Countries
          </div>
          <h1 className="font-orbitron text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="text-white">No Discord Scams.</span><br />
            <span className="text-gradient">Real Stakes. Verified Payouts.</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Stake <strong className="text-white">USDC/USDT</strong> on{' '}
            <strong className="text-white">CS2</strong>,{' '}
            <strong className="text-white">Dota 2</strong> and{' '}
            <strong className="text-white">Deadlock</strong> matches. Funds held in a Solana smart contract — no PayPal middlemen, no trust required. Winner gets paid in seconds.
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
            {buildStatItems(stats).map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-accent-cyan flex-shrink-0" aria-hidden="true" />
                <div>
                  <div className="font-orbitron font-bold text-xl text-accent-cyan">{item.value}</div>
                  <div className="text-xs text-muted uppercase tracking-wider">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Payout Ticker ── */}
      <PayoutTicker />

      {/* ── Live Matches ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title flex items-center gap-3">
            <span className="live-dot" aria-hidden="true" /> Live Matches
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
              <Link key={game.name} href={game.href} className="card-hover group block relative overflow-hidden">
                {/* Background artwork */}
                <div className="absolute inset-0 pointer-events-none">
                  <img src={game.art} alt={`${game.name} gameplay artwork`} className="absolute right-0 top-0 h-full w-2/3 object-cover object-center opacity-10 group-hover:opacity-15 transition-opacity" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-r from-space-800 via-space-800/90 to-transparent" />
                </div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-orbitron text-2xl font-bold text-white group-hover:text-gradient transition-all">{game.name}</h3>
                    <span className="badge-cyan text-xs">{game.badge}</span>
                  </div>
                  <p className="text-muted text-sm mb-4 leading-relaxed">{game.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Global players</span>
                    <span className="font-orbitron font-bold text-accent-cyan">{game.players}</span>
                  </div>
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
                <step.icon className="w-7 h-7 text-accent-cyan" aria-hidden="true" />
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

      {/* ── Fair Ping ── */}
      <section className="bg-space-800 border-y border-border py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 badge-cyan mb-4 text-sm">
                <Radio className="w-3.5 h-3.5" /> Fair Ping
              </div>
              <h2 className="font-orbitron text-3xl font-black mb-4">
                <span className="text-gradient">Fair Ping.</span>{' '}
                <span className="text-white">Fair Play.</span>
              </h2>
              <p className="text-muted leading-relaxed mb-6">
                Every match runs on dedicated servers in <strong className="text-white">Istanbul</strong> with
                equal latency for all players in Turkey, Georgia, and the Balkans. No advantage from geography — only skill decides the winner.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Istanbul, Turkey', ping: '< 15ms', flag: '\ud83c\uddf9\ud83c\uddf7' },
                  { label: 'Tbilisi, Georgia', ping: '~ 25ms', flag: '\ud83c\uddec\ud83c\uddea' },
                  { label: 'Sofia, Bulgaria', ping: '~ 30ms', flag: '\ud83c\udde7\ud83c\uddec' },
                  { label: 'Bucharest, Romania', ping: '~ 20ms', flag: '\ud83c\uddf7\ud83c\uddf4' },
                ].map((loc) => (
                  <div key={loc.label} className="flex items-center justify-between bg-space-700 border border-border rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{loc.flag}</span>
                      <span className="text-sm text-white font-semibold">{loc.label}</span>
                    </div>
                    <span className="font-mono text-sm text-accent-cyan font-bold">{loc.ping}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-accent-cyan/5 rounded-2xl blur-xl" />
              <div className="relative card text-center py-12">
                <Globe className="w-16 h-16 text-accent-cyan mx-auto mb-6 opacity-80" />
                <div className="font-orbitron text-5xl font-black text-accent-cyan mb-2">128 tick</div>
                <p className="text-muted text-sm mb-6">Dedicated servers, not peer-to-peer</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="font-orbitron text-lg font-bold text-white">44</div>
                    <div className="text-xs text-muted">Countries</div>
                  </div>
                  <div>
                    <div className="font-orbitron text-lg font-bold text-white">DDoS</div>
                    <div className="text-xs text-muted">Protected</div>
                  </div>
                  <div>
                    <div className="font-orbitron text-lg font-bold text-white">99.9%</div>
                    <div className="text-xs text-muted">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust & Security ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="font-orbitron text-3xl font-black text-center mb-4">
          <span className="text-gradient">Trust & Security</span>
        </h2>
        <p className="text-muted text-center mb-12">Every layer of the platform is built for transparency and fairness.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.title} className="card text-center py-6 px-3 group hover:border-accent-cyan/40 transition-all">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-accent-cyan/10 border border-accent-cyan/20 mb-4 group-hover:shadow-[0_0_16px_rgba(0,229,255,0.15)] transition-shadow">
                <badge.icon className="w-5 h-5 text-accent-cyan" aria-hidden="true" />
              </div>
              <h3 className="font-orbitron text-xs font-bold text-white mb-2 leading-snug">{badge.title}</h3>
              <p className="text-muted text-[11px] leading-relaxed">{badge.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-10">Common Questions</h2>
          <Accordion items={FAQS} />
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
                <t.icon className="w-6 h-6 text-accent-cyan" aria-hidden="true" />
              </div>
              <h3 className="font-orbitron text-lg font-bold text-white mb-3">{t.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Provably Fair ── */}
      <section className="bg-space-800 border-y border-border py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 badge-cyan mb-4 text-sm">
              <FileCheck className="w-3.5 h-3.5" /> Provably Fair
            </div>
            <h2 className="font-orbitron text-3xl font-black mb-4">
              <span className="text-gradient">Every Payout Verified On-Chain</span>
            </h2>
            <p className="text-muted max-w-2xl mx-auto leading-relaxed">
              Our smart contract is open-source on Solana. Every stake, every payout, every fee — permanently recorded and publicly verifiable. No trust required.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            <div className="card text-center py-8">
              <Coins className="w-8 h-8 text-accent-cyan mx-auto mb-4" />
              <div className="font-orbitron text-2xl font-black text-accent-cyan mb-1">90%</div>
              <p className="text-muted text-sm">To the winner</p>
            </div>
            <div className="card text-center py-8">
              <Shield className="w-8 h-8 text-accent-cyan mx-auto mb-4" />
              <div className="font-orbitron text-2xl font-black text-accent-cyan mb-1">10%</div>
              <p className="text-muted text-sm">Platform fee</p>
            </div>
            <div className="card text-center py-8">
              <Zap className="w-8 h-8 text-accent-cyan mx-auto mb-4" />
              <div className="font-orbitron text-2xl font-black text-accent-cyan mb-1">~2s</div>
              <p className="text-muted text-sm">Payout speed</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-orbitron text-sm font-bold text-white mb-4 uppercase tracking-wider">Smart Contract Addresses</h3>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs text-muted uppercase tracking-wider font-semibold w-20 flex-shrink-0">Program</span>
                <a
                  href="https://solscan.io/account/BqzXnsQCjBb7v9K4wMiFddfMa3dC1tFhxLEgBqyWpZGv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-xs text-accent-cyan hover:text-accent-cyan-glow transition-colors break-all"
                >
                  BqzXnsQCjBb7v9K4wMiFddfMa3dC1tFhxLEgBqyWpZGv
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs text-muted uppercase tracking-wider font-semibold w-20 flex-shrink-0">Treasury</span>
                <a
                  href="https://solscan.io/account/CT7qFYnCwDgDquTxAL8eBQqBvDBqUJemSz3KEZvqc2HW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-xs text-accent-cyan hover:text-accent-cyan-glow transition-colors break-all"
                >
                  CT7qFYnCwDgDquTxAL8eBQqBvDBqUJemSz3KEZvqc2HW
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            </div>
            <p className="text-xs text-muted mt-4">
              Verify any match vault or payout on{' '}
              <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">
                Solscan
              </a>
              . The code is the escrow — nobody, not even us, can alter payouts.
            </p>
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <NewsletterSignup />

      {/* ── Explore More ── */}
      <section className="bg-space-800 border-y border-border py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-8">Explore RaiseGG</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <Link href="/tournaments" className="card-hover py-4">
              <Trophy className="w-5 h-5 text-accent-cyan mx-auto mb-2" aria-hidden="true" />
              <span className="text-white font-semibold">Tournaments</span>
            </Link>
            <Link href="/leaderboard" className="card-hover py-4">
              <TrendingUp className="w-5 h-5 text-accent-cyan mx-auto mb-2" aria-hidden="true" />
              <span className="text-white font-semibold">Leaderboard</span>
            </Link>
            <Link href="/blog" className="card-hover py-4">
              <Globe className="w-5 h-5 text-accent-cyan mx-auto mb-2" aria-hidden="true" />
              <span className="text-white font-semibold">Blog</span>
            </Link>
            <Link href="/about" className="card-hover py-4">
              <Shield className="w-5 h-5 text-accent-cyan mx-auto mb-2" aria-hidden="true" />
              <span className="text-white font-semibold">About Us</span>
            </Link>
          </div>
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
