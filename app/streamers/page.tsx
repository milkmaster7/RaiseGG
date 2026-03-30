import type { Metadata } from 'next'
import {
  DollarSign,
  Monitor,
  Zap,
  Star,
  Users,
  TrendingUp,
} from 'lucide-react'
import StreamerApplicationForm from './form'

export const metadata: Metadata = {
  title: 'Stream on RaiseGG — Earn While You Play',
  description:
    'Join the RaiseGG Streamer Partnership Program. Get revenue share, custom overlays, priority matchmaking, and featured placement. Apply now.',
  openGraph: {
    title: 'Stream on RaiseGG — Earn While You Play',
    description:
      'Revenue share, custom overlays, priority matchmaking. Join the streamer program for CS2, Dota 2 & Deadlock.',
    url: 'https://raisegg.gg/streamers',
  },
}

const BENEFITS = [
  {
    icon: DollarSign,
    title: 'Revenue Share',
    desc: 'Earn a percentage of every referred player\'s rake. The more you stream, the more you earn.',
  },
  {
    icon: Monitor,
    title: 'Custom Stream Overlay',
    desc: 'Get a branded RaiseGG overlay showing live match stakes, results, and your referral link.',
  },
  {
    icon: Zap,
    title: 'Priority Matchmaking',
    desc: 'Skip the queue. Get matched faster so your stream stays action-packed.',
  },
  {
    icon: Star,
    title: 'Featured on Homepage',
    desc: 'Live streamers get featured on the RaiseGG homepage, driving viewers to your channel.',
  },
  {
    icon: Users,
    title: 'Affiliate Link',
    desc: 'Custom raisegg.gg/ref/yourname link. Every signup earns you recurring revenue.',
  },
  {
    icon: TrendingUp,
    title: 'Growth Dashboard',
    desc: 'Track clicks, signups, matches played by referrals, and total earnings in real time.',
  },
]

const STEPS = [
  { step: '01', title: 'Apply', desc: 'Fill out the form below with your Twitch info and favorite games.' },
  { step: '02', title: 'Get Approved', desc: 'We review applications within 48 hours. Most active streamers get fast-tracked.' },
  { step: '03', title: 'Get Your Link', desc: 'Receive your custom affiliate link, overlay assets, and streamer badge.' },
  { step: '04', title: 'Earn Per Referral', desc: 'Every player who signs up through your link earns you revenue share on their matches.' },
]

const REQUIREMENTS = [
  '50+ average concurrent viewers on Twitch',
  'Active in CS2, Dota 2, or Deadlock',
  'Stream at least 3 times per week',
  'Genuine interest in competitive esports and stake matches',
  'Must be 18+ years old',
  'Willingness to feature RaiseGG overlay during streams',
]

export default function StreamersPage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(0,230,255,0.08),transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="badge-cyan mb-4 mx-auto">Streamer Partnership</div>
          <h1 className="font-orbitron text-4xl md:text-5xl font-black text-gradient mb-5 leading-tight">
            Stream on RaiseGG — Earn While You Play
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Turn your stream into a revenue stream. Get paid for every player you bring to the platform — plus exclusive perks only for partnered streamers.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#apply" className="btn-primary text-base">
              Apply Now
            </a>
            <a href="#benefits" className="btn-secondary text-base">
              See Benefits
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-space-950/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-orbitron text-2xl font-bold text-gradient">$$$</div>
            <div className="text-xs text-muted uppercase tracking-wider mt-1">Revenue Share</div>
          </div>
          <div>
            <div className="font-orbitron text-2xl font-bold text-gradient">48h</div>
            <div className="text-xs text-muted uppercase tracking-wider mt-1">Approval Time</div>
          </div>
          <div>
            <div className="font-orbitron text-2xl font-bold text-gradient">3</div>
            <div className="text-xs text-muted uppercase tracking-wider mt-1">Supported Games</div>
          </div>
        </div>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────────────── */}
      <section id="benefits" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-orbitron text-2xl font-bold text-white text-center mb-10">
          Streamer Benefits
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map(b => (
            <div key={b.title} className="card-hover group">
              <b.icon className="w-6 h-6 text-accent-cyan mb-3 group-hover:text-accent-cyan-glow transition-colors" />
              <h3 className="font-orbitron text-sm font-bold text-white mb-2">{b.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="bg-space-950/50 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-orbitron text-2xl font-bold text-white text-center mb-10">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(s => (
              <div key={s.step} className="card text-center">
                <div className="font-orbitron text-3xl font-black text-accent-cyan/30 mb-3">{s.step}</div>
                <h3 className="font-orbitron text-sm font-bold text-white mb-2">{s.title}</h3>
                <p className="text-muted text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Requirements ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-orbitron text-2xl font-bold text-white text-center mb-8">
          Requirements
        </h2>
        <div className="card max-w-2xl mx-auto">
          <ul className="space-y-3">
            {REQUIREMENTS.map((req, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Zap className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Application Form ──────────────────────────────────────────────── */}
      <section id="apply" className="bg-space-950/50 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-orbitron text-2xl font-bold text-white text-center mb-8">
            Apply for Streamer Partnership
          </h2>
          <StreamerApplicationForm />
        </div>
      </section>
    </div>
  )
}
