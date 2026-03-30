import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Eye, Ban, Clock, AlertTriangle, CheckCircle2, Server, Film, Cpu, Users, HelpCircle } from 'lucide-react'
import { breadcrumbSchema, faqSchema } from '@/lib/schemas'
import { IntegrityStats } from '@/components/integrity/IntegrityStats'

export const metadata: Metadata = {
  title: 'Integrity & Anti-Cheat — Fair Play Guarantee',
  description: 'How RaiseGG keeps matches fair. TBAntiCheat, VAC detection, GOTV demo recording, MatchZy match management, and our zero-tolerance policy on cheating.',
  alternates: { canonical: 'https://raisegg.com/integrity' },
  openGraph: {
    title: 'RaiseGG – Integrity & Anti-Cheat',
    description: 'Fair play guaranteed. Multi-layer anti-cheat: TBAntiCheat, VAC, GOTV recordings, automated verification.',
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

const AC_STACK = [
  {
    icon: Cpu,
    title: 'Server-Side: TBAntiCheat',
    description: 'Our CS2 servers run TBAntiCheat — a server-side anti-cheat plugin that detects aimbots, wallhacks, spinbots, and movement exploits in real time. No client install required. Detections trigger automatic kicks and bans.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
  },
  {
    icon: Shield,
    title: 'Valve: VAC Integration',
    description: 'We continuously poll the Steam Web API for VAC bans and Game Bans on all linked accounts. If Valve bans a player — even weeks after a match — we retroactively review and can overturn affected results and refund stakes.',
    color: 'text-accent-cyan',
    bgColor: 'bg-accent-cyan/10 border-accent-cyan/30',
  },
  {
    icon: Film,
    title: 'Demo Analysis: GOTV Recordings',
    description: 'Every CS2 match is automatically recorded via GOTV. Demo files (.dem) are stored for 90 days in Supabase Storage. These demos are used for dispute review, statistical analysis, and community reports. Available for download on the Demos page.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/30',
  },
  {
    icon: Users,
    title: 'Manual Review: Community Disputes',
    description: 'Players can raise disputes within 1 hour of match resolution. Our team reviews server demos, TBAntiCheat logs, stat anomalies, and API verification data. Confirmed cheaters are permanently banned with stakes refunded to victims.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
]

const BANS = [
  { offense: 'Cheating (aimbot, wallhack, exploits)', consequence: 'Permanent ban. Wallet frozen. No appeal.' },
  { offense: 'Smurfing / alt accounts', consequence: 'Both accounts banned. Stakes forfeited.' },
  { offense: 'Match-fixing / intentional loss', consequence: 'Permanent ban for all involved parties.' },
  { offense: 'Abusive behavior / harassment', consequence: '7-day suspension → 30-day → permanent.' },
  { offense: 'Exploiting platform bugs', consequence: 'Permanent ban. Report bugs to earn rewards instead.' },
]

const FAQS = [
  {
    question: 'What anti-cheat does RaiseGG use?',
    answer: 'RaiseGG uses a multi-layer approach: TBAntiCheat (server-side plugin for CS2), Valve Anti-Cheat (VAC) monitoring via Steam API, GOTV demo recording for every match, and MatchZy for automated match management. No client-side software is required.',
  },
  {
    question: 'Do I need to install any anti-cheat software?',
    answer: 'No. All anti-cheat runs server-side. TBAntiCheat monitors gameplay on our CS2 servers directly. You do not need to install any kernel-level drivers or client software.',
  },
  {
    question: 'What happens if my opponent cheats?',
    answer: 'If TBAntiCheat detects cheating during a match, the cheater is kicked and banned immediately. You can also raise a dispute within 1 hour of match resolution. Our team reviews the GOTV demo and server logs. If cheating is confirmed, the match is overturned and your stake is refunded.',
  },
  {
    question: 'How long are match demos stored?',
    answer: 'All GOTV demo recordings are stored for 90 days in secure cloud storage. You can download them anytime from the Demos page. After 90 days, demos are automatically deleted.',
  },
  {
    question: 'Can VAC bans from other games affect my account?',
    answer: 'Only VAC bans and Game Bans specifically on CS2 affect your eligibility. Bans on other games (like CS:GO, TF2, etc.) do not prevent you from playing on RaiseGG, though they may trigger additional verification.',
  },
  {
    question: 'How do you prevent smurfing?',
    answer: 'We require Steam accounts to be at least 1 year old with 100+ hours in the game. New RaiseGG accounts go through placement matches before staking. We also cross-reference FACEIT levels when available and flag statistical outliers for manual review.',
  },
  {
    question: 'What is MatchZy?',
    answer: 'MatchZy is a CS2 server plugin that manages competitive matches. It handles map vetoes, knife rounds, ready-up systems, pause functionality, and automatic demo recording. It ensures every match follows tournament-standard rules.',
  },
]

export default function IntegrityPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Integrity', url: 'https://raisegg.com/integrity' },
  ])
  const faq = faqSchema(FAQS)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }} />

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
            When real money is on the line, fair play isn&apos;t optional. Here&apos;s every layer of
            protection we&apos;ve built to keep matches clean.
          </p>
        </div>

        {/* Live Stats */}
        <div className="mb-16">
          <IntegrityStats />
        </div>

        {/* Anti-Cheat Stack */}
        <div className="mb-16">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Cpu className="w-6 h-6 text-accent-cyan" /> Our Anti-Cheat Stack
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AC_STACK.map((layer) => (
              <div key={layer.title} className="card">
                <div className={`w-10 h-10 rounded border ${layer.bgColor} flex items-center justify-center mb-3`}>
                  <layer.icon className={`w-5 h-5 ${layer.color}`} />
                </div>
                <h3 className="font-orbitron text-sm font-bold text-white mb-2">{layer.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{layer.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Protection Layers */}
        <div className="space-y-6 mb-16">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-2">Protection Layers</h2>
          {LAYERS.map((layer) => (
            <div key={layer.title} className="card">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center">
                  <layer.icon className="w-5 h-5 text-accent-cyan" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white">{layer.title}</h3>
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

        {/* Technical Details */}
        <div className="mb-16">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-accent-cyan" /> How It Works In Detail
          </h2>
          <div className="card space-y-6">
            <div>
              <h3 className="font-orbitron text-sm font-bold text-accent-cyan mb-2">TBAntiCheat — Server-Side Detection</h3>
              <p className="text-muted text-sm leading-relaxed">
                TBAntiCheat runs on every RaiseGG CS2 server. It monitors player behavior server-side:
                aim snapping, through-wall tracking, impossible reaction times, spinbot rotations, and
                bhop/movement exploits. Detections are instant — cheaters are kicked mid-match and
                permanently banned. No false positives from network jitter since all analysis happens
                on the server with full game state access.
              </p>
            </div>
            <div>
              <h3 className="font-orbitron text-sm font-bold text-accent-cyan mb-2">MatchZy — Tournament-Grade Match Management</h3>
              <p className="text-muted text-sm leading-relaxed">
                MatchZy handles the full match lifecycle: ready-up systems, knife rounds, map vetoes,
                tactical pauses, and automatic GOTV demo recording. Every round result is logged with
                timestamps. Match configs are locked so no admin can modify settings mid-game. Results
                are exported directly to our API for trustless verification.
              </p>
            </div>
            <div>
              <h3 className="font-orbitron text-sm font-bold text-accent-cyan mb-2">GOTV Demo Recording</h3>
              <p className="text-muted text-sm leading-relaxed">
                Every CS2 match is recorded via GOTV (Game Observer TV). The .dem file captures all
                player movements, shots, utility usage, and round outcomes from a spectator perspective.
                These demos are uploaded to secure cloud storage and retained for 90 days. Players can
                download their demos from the <Link href="/demos" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">Demos page</Link>,
                and our team uses them for dispute investigation.
              </p>
            </div>
            <div>
              <h3 className="font-orbitron text-sm font-bold text-accent-cyan mb-2">VAC Ban Monitoring</h3>
              <p className="text-muted text-sm leading-relaxed">
                We continuously monitor all linked Steam accounts via the Steam Web API. If a VAC ban or
                Game Ban is issued on any account — even weeks after a match has been played — we retroactively
                review and can overturn affected match results and refund stakes.
              </p>
            </div>
            <div>
              <h3 className="font-orbitron text-sm font-bold text-accent-cyan mb-2">ELO Range Restrictions</h3>
              <p className="text-muted text-sm leading-relaxed">
                Players can only match against opponents within a defined ELO range. High-ranked players
                cannot create low-stake lobbies to farm beginners. Minimum stake amounts scale with your
                tier to keep every match meaningful and fair.
              </p>
            </div>
          </div>
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
                resolution to raise a dispute. Our team reviews server demos, TBAntiCheat logs, and API data.
                If a technical issue or cheating is confirmed, the result is overturned and refunds are issued.
              </p>
              <p className="text-muted text-sm">
                Disputes are handled within 24 hours. Reach us at{' '}
                <a href="mailto:disputes@raisegg.com" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">disputes@raisegg.com</a>{' '}
                or via <Link href="/support" className="text-accent-cyan hover:text-accent-cyan-glow transition-colors">Support</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="font-orbitron text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-accent-cyan" /> Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.question} className="card group">
                <summary className="cursor-pointer list-none flex items-center justify-between">
                  <span className="text-white text-sm font-semibold pr-4">{faq.question}</span>
                  <span className="text-accent-cyan text-lg flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-muted text-sm leading-relaxed mt-3 pt-3 border-t border-border">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted text-sm mb-4">Fair games. Real stakes. No shortcuts.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/play" className="btn-primary px-8 py-3">Play Now</Link>
            <Link href="/demos" className="btn-secondary px-8 py-3">View Demos</Link>
          </div>
        </div>
      </div>
    </>
  )
}
