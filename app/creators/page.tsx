'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  Link2,
  Award,
  Headphones,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  Zap,
} from 'lucide-react'

// ─── Benefits ──────────────────────────────────────────────────────────────────
const BENEFITS = [
  {
    icon: DollarSign,
    title: '5% Revenue Share',
    desc: "Earn 5% of every referred player's rake for 6 months. They play, you earn.",
  },
  {
    icon: Link2,
    title: 'Custom Referral Link',
    desc: 'Get a branded raisegg.com/ref/yourname link to share with your audience.',
  },
  {
    icon: Award,
    title: 'Creator Badge',
    desc: 'Stand out with a verified creator badge on your RaiseGG profile.',
  },
  {
    icon: Headphones,
    title: 'Priority Support',
    desc: 'Direct line to our team. Issues resolved in hours, not days.',
  },
  {
    icon: Sparkles,
    title: 'Early Access',
    desc: 'Test new features, games, and tournaments before anyone else.',
  },
  {
    icon: TrendingUp,
    title: 'Growth Tools',
    desc: 'Real-time analytics dashboard showing clicks, signups, and earnings.',
  },
]

// ─── FAQ ────────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'How much can I earn?',
    a: 'You earn 5% of the platform rake from every match your referred players play, for 6 full months after they sign up. Top creators earn $500+/month.',
  },
  {
    q: 'When do I get paid?',
    a: 'Earnings are credited to your RaiseGG wallet in real-time as USDC. Withdraw anytime via Phantom wallet.',
  },
  {
    q: 'What are the requirements?',
    a: '100+ followers on Twitch, YouTube, Kick, TikTok or Twitter/X — OR an active gaming community (Discord server, forum, etc). We review every application manually.',
  },
  {
    q: 'Can I promote on multiple platforms?',
    a: 'Absolutely. Your referral link works everywhere. Share it on stream, in videos, tweets, Discord — wherever your audience is.',
  },
  {
    q: 'How long does approval take?',
    a: 'Most applications are reviewed within 24-48 hours. You will receive an email notification.',
  },
  {
    q: 'What games are supported?',
    a: 'CS2, Dota 2, and Deadlock. More games are being added regularly.',
  },
]

// ─── Form ───────────────────────────────────────────────────────────────────────
interface FormData {
  name: string
  platform: string
  channelUrl: string
  audienceSize: string
  reason: string
}

export default function CreatorsPage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    platform: 'twitch',
    channelUrl: '',
    audienceSize: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [approvedCreators, setApprovedCreators] = useState<{ username: string; platform: string }[]>([])

  useEffect(() => {
    fetch('/api/creators')
      .then(r => r.ok ? r.json() : { creators: [] })
      .then(d => setApprovedCreators(d.creators || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.channelUrl || !form.audienceSize) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          platform: form.platform,
          channel_url: form.channelUrl,
          audience_size: parseInt(form.audienceSize),
          reason: form.reason,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const update = (field: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(0,230,255,0.08),transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="badge-cyan mb-4 mx-auto">Creator Program</div>
          <h1 className="font-orbitron text-4xl md:text-5xl font-black text-gradient mb-5 leading-tight">
            Grow with RaiseGG
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Earn revenue share by bringing players to the platform. Stream it, share it, build your community — and get paid for every match your referrals play.
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
            <div className="font-orbitron text-2xl font-bold text-gradient">5%</div>
            <div className="text-xs text-muted uppercase tracking-wider mt-1">Revenue Share</div>
          </div>
          <div>
            <div className="font-orbitron text-2xl font-bold text-gradient">6 mo</div>
            <div className="text-xs text-muted uppercase tracking-wider mt-1">Earning Period</div>
          </div>
          <div>
            <div className="font-orbitron text-2xl font-bold text-gradient">USDC</div>
            <div className="text-xs text-muted uppercase tracking-wider mt-1">Instant Payouts</div>
          </div>
        </div>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────────────── */}
      <section id="benefits" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-orbitron text-2xl font-bold text-white text-center mb-10">
          Creator Benefits
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
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Apply', desc: 'Fill out the application form below. We review within 48 hours.' },
              { step: '02', title: 'Share', desc: 'Get your custom referral link and share it with your audience.' },
              { step: '03', title: 'Earn', desc: 'Every match your referrals play earns you 5% of the rake, paid in USDC.' },
            ].map(s => (
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
            {[
              '100+ followers on Twitch, YouTube, Kick, TikTok, or Twitter/X',
              'OR an active community presence (Discord server, forum, clan)',
              'Genuine interest in competitive esports (CS2, Dota 2, Deadlock)',
              'Willingness to create content or promote RaiseGG to your audience',
              'Must be 18+ years old',
            ].map((req, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Zap className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Social Proof ──────────────────────────────────────────────────── */}
      {approvedCreators.length > 0 && (
        <section className="bg-space-950/50 border-y border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <h2 className="font-orbitron text-lg font-bold text-white mb-6">
              <Users className="inline w-5 h-5 text-accent-cyan mr-2" />
              Approved Creators
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {approvedCreators.map((c, i) => (
                <span key={i} className="badge-cyan">
                  {c.username} &middot; {c.platform}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Application Form ──────────────────────────────────────────────── */}
      <section id="apply" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-orbitron text-2xl font-bold text-white text-center mb-8">
          Apply to the Creator Program
        </h2>

        {submitted ? (
          <div className="card max-w-lg mx-auto text-center">
            <div className="w-14 h-14 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="font-orbitron text-lg font-bold text-white mb-2">Application Submitted!</h3>
            <p className="text-muted text-sm mb-4">
              We will review your application within 48 hours. Check your dashboard for status updates.
            </p>
            <Link href="/dashboard" className="btn-secondary inline-block">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card max-w-lg mx-auto space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm text-muted mb-1.5 font-medium">Your Name</label>
              <input
                type="text"
                className="input"
                placeholder="John Doe"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                required
              />
            </div>

            {/* Platform */}
            <div>
              <label className="block text-sm text-muted mb-1.5 font-medium">Platform</label>
              <select
                className="input"
                value={form.platform}
                onChange={e => update('platform', e.target.value)}
              >
                <option value="twitch">Twitch</option>
                <option value="youtube">YouTube</option>
                <option value="kick">Kick</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter/X</option>
                <option value="discord">Discord Community</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Channel URL */}
            <div>
              <label className="block text-sm text-muted mb-1.5 font-medium">Channel / Profile URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://twitch.tv/yourchannel"
                value={form.channelUrl}
                onChange={e => update('channelUrl', e.target.value)}
                required
              />
            </div>

            {/* Audience Size */}
            <div>
              <label className="block text-sm text-muted mb-1.5 font-medium">Audience Size</label>
              <input
                type="number"
                className="input"
                placeholder="1000"
                min="1"
                value={form.audienceSize}
                onChange={e => update('audienceSize', e.target.value)}
                required
              />
              <p className="text-xs text-muted mt-1">Total followers/subscribers across your main platform.</p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm text-muted mb-1.5 font-medium">Why do you want to join?</label>
              <textarea
                className="input min-h-[100px] resize-y"
                placeholder="Tell us about your community and how you plan to promote RaiseGG..."
                value={form.reason}
                onChange={e => update('reason', e.target.value)}
                rows={4}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !form.name || !form.channelUrl || !form.audienceSize}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        )}
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="bg-space-950/50 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-orbitron text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="card">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-sm font-semibold text-white pr-4">{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-accent-cyan flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <p className="text-muted text-sm mt-3 leading-relaxed animate-fade-in">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
