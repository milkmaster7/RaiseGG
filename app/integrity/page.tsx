import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Eye, Ban, Clock, AlertTriangle, CheckCircle2, Server } from 'lucide-react'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Integrity & Anti-Cheat — Fair Play Guarantee',
  description: 'How RaiseGG keeps matches fair. VAC detection, dedicated servers, automated verification, and our zero-tolerance policy on cheating.',
  alternates: { canonical: 'https://raisegg.com/integrity' },
  openGraph: {
    title: 'RaiseGG – Integrity & Anti-Cheat',
    description: 'Fair play guaranteed. VAC detection, dedicated servers, automated match verification.',
    url: 'https://raisegg.com/integrity',
    images: [{ url: '/api/og?title=Integrity+%26+Anti-Cheat&sub=Fair+Play+Guarantee&color=7b61ff', width: 1200, height: 630 }],
  },
}

const LAYERS = [
  {
    icon: Shield,
    title: 'Account Verification',
    description: 'Before you can play, we verify your Steam account automatically.',
    checks: [
      'Steam account must be 1+ year old',
      'No active VAC bans or Game Bans on CS2',
      'Minimum 100 hours played in the game you queue for',
      'Phone number linked to Steam account (Steam Guard)',
    ],
  },
  {
    icon: Server,
    title: 'Dedicated Match Servers',
    description: 'CS2 stake matches run on our own servers — not community servers, not matchmaking.',
    checks: [
      'MatchZy plugin records every round automatically',
      'Server-side anti-cheat monitoring active during all matches',
      'Demo files (.dem) stored for 90 days for dispute review',
      'Tick-rate and server config locked — no admin abuse',
    ],
  },
  {
    icon: Eye,
    title: 'Automated Result Verification',
    description: 'No human decides who wins. The system verifies results from the source.',
    checks: [
      'CS2: Results pulled directly from MatchZy server logs',
      'Dota 2: Match ID submitted → result verified via Steam Web API',
      'Deadlock: Verified via Valve API endpoints',
      'Payout triggered only after cryptographic verification',
    ],
  },
  {
    icon: AlertTriangle,
    title: 'ELO Abuse Prevention',
    description: 'We detect and prevent ELO manipulation, smurfing and match-fixing.',
    checks: [
      'New accounts start with placement matches before staking',
      'Unusual win/loss patterns flagged for manual review',
      'Minimum stake scales with ELO tier — no high-rank farming low stakes',
      'Repeated matchups between same players rate-limited',
    ],
  },
]

const BANS = [
  { offense: 'Cheating (aimbot, wallhack, exploits)', consequence: 'Permanent ban. Wallet frozen. No appeal.' },
  { offense: 'Smurfing / alt accounts', consequence: 'Both accounts banned. Stakes forfeited.' },
  { offense: 'Match-fixing / intentional loss', consequence: 'Permanent ban for all involved parties.' },
  { offense: 'Abusive behavior / harassment', consequence: '7-day suspension → 30-day → permanent.' },
  { offense: 'Exploiting platform bugs', consequence: 'Permanent ban. Report bugs to earn rewards instead.' },
]

export default function IntegrityPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Integrity', url: 'https://raisegg.com/integrity' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 badge-cyan mb-4 text-sm">
            <Shield className="w-3.5 h-3.5" /> Zero Tolerance
          </div>
          <h1 className="font-orbitron text-4xl sm:text-5xl font-black mb-4">
            <span className="text-gradient">Integrity & Anti-Cheat</span>
          </h1>
          <p className="text-muted text-lg leading-relaxed max-w-2xl">
            When real money is on the line, fair play isn't optional. Here's every layer of
            protection we've built to keep matches clean.
          </p>
        </div>

        {/* Protection Layers */}
        <div className="space-y-6 mb-16">
          {LAYERS.map((layer) => (
            <div key={layer.title} className="card">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center">
                  <layer.icon className="w-5 h-5 text-accent-cyan" />
                </div>
                <div>
                  <h2 className="font-orbitron text-lg font-bold text-white">{layer.title}</h2>
                  <p className="text-muted text-sm mt-1">{layer.description}</p>
                </div>
              </div>
              <ul className="space-y-2 ml-14">
                {layer.checks.map((check) => (
                  <li key={check} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-muted">{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Ban Policy */}
        <div className="mb-16">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Ban className="w-6 h-6 text-red-400" /> Ban Policy
          </h2>
          <div className="space-y-2">
            {BANS.map((ban) => (
              <div key={ban.offense} className="card flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <div className="flex-1">
                  <span className="text-white text-sm font-semibold">{ban.offense}</span>
                </div>
                <div className="text-red-400 text-xs font-semibold sm:text-right flex-shrink-0">{ban.consequence}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dispute Process */}
        <div className="card mb-16">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-accent-cyan flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-orbitron text-lg font-bold text-white mb-2">Dispute Process</h2>
              <p className="text-muted text-sm leading-relaxed mb-3">
                Think something went wrong? You have <strong className="text-white">1 hour</strong> after match
                resolution to raise a dispute. Our team reviews server demos, logs, and API data. If a technical
                issue or cheating is confirmed, the result is overturned and refunds are issued.
              </p>
              <p className="text-muted text-sm">
                Disputes are handled within 24 hours. Reach us at{' '}
                <a href="mailto:disputes@raisegg.com" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">disputes@raisegg.com</a>{' '}
                or via <Link href="/support" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">Support</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted text-sm mb-4">Fair games. Real stakes. No shortcuts.</p>
          <Link href="/play" className="btn-primary px-8 py-3">Play Now</Link>
        </div>
      </div>
    </>
  )
}
