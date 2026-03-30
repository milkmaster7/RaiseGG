import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Zap, Trophy, Gift, Users, Clock, ChevronRight, Star } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Get $5 Free USDC — First 50 Players Promo',
  description:
    'Sign up for RaiseGG and get $5 free USDC to play CS2, Dota 2 or Deadlock stake matches. Limited to first 50 players. No deposit required.',
  alternates: { canonical: 'https://raisegg.com/promo' },
  openGraph: {
    title: 'Get $5 Free USDC — RaiseGG Launch Promo',
    description: 'First 50 signups get $5 free. Play CS2, Dota 2 & Deadlock stake matches.',
    url: 'https://raisegg.com/promo',
    images: [{ url: '/api/og?title=%245+Free+USDC&sub=First+50+Players&color=ffc800', width: 1200, height: 630 }],
  },
}

async function getSignupCount() {
  try {
    const supabase = createServiceClient()
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function PromoPage() {
  const signups = await getSignupCount()
  const spotsLeft = Math.max(0, 50 - signups)
  const progress = Math.min(100, (signups / 50) * 100)

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent-cyan/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-accent-gold/20 border border-accent-gold/40 rounded-full px-4 py-1.5 text-sm font-semibold text-accent-gold mb-6">
            <Gift className="w-4 h-4" /> Limited Time — Launch Promo
          </div>

          <h1 className="font-orbitron text-5xl md:text-6xl font-black mb-6 leading-tight">
            <span className="text-accent-gold">$5 Free USDC</span><br />
            <span className="text-white">for First 50 Players</span>
          </h1>

          <p className="text-xl text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
            Sign up for RaiseGG, connect your Steam account, and get <strong className="text-white">$5 USDC</strong> added
            to your balance instantly. No deposit required. Play CS2, Dota 2 or Deadlock stake matches for free.
          </p>

          {/* Progress bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">{signups} claimed</span>
              <span className="text-accent-gold font-bold">{spotsLeft} spots left</span>
            </div>
            <div className="w-full h-3 bg-space-700 rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-gradient-to-r from-accent-gold to-accent-cyan rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Link
            href="/api/auth/steam"
            className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2"
          >
            <Shield className="w-5 h-5" />
            Connect Steam & Claim $5
          </Link>
          <p className="text-xs text-muted mt-3">No deposit needed. No KYC. Takes 30 seconds.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-orbitron text-2xl font-black text-center mb-10">
          <span className="text-gradient">How to Claim</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Connect Steam', desc: 'Click the button above. Authenticate with your Steam account. Done in 10 seconds.', icon: Shield },
            { step: '02', title: 'Get $5 USDC', desc: '$5 USDC is added to your RaiseGG balance automatically. No wallet needed yet.', icon: Gift },
            { step: '03', title: 'Play a Match', desc: 'Use your $5 to enter a $2 or $5 stake match. Win and cash out — or play free tournaments.', icon: Trophy },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded bg-accent-cyan/10 border border-accent-cyan/30 mb-4">
                <s.icon className="w-6 h-6 text-accent-cyan" />
              </div>
              <div className="font-orbitron text-xs text-accent-cyan tracking-widest mb-2">STEP {s.step}</div>
              <h3 className="font-orbitron text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-orbitron text-2xl font-black text-center mb-10">
            <span className="text-gradient">What You Get</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Gift, title: '$5 Free USDC', desc: 'Credited instantly to your RaiseGG balance. No strings.' },
              { icon: Trophy, title: 'Free Daily Tournaments', desc: '$5 USDC prize pool, zero entry fee. Play every day.' },
              { icon: Zap, title: 'Instant Payouts', desc: 'Win a match, get paid in seconds. USDC to your wallet.' },
              { icon: Shield, title: 'Smart Contract Escrow', desc: 'Funds locked in Solana smart contract. Zero scam risk.' },
              { icon: Users, title: '$1 Referral Bonus', desc: 'Invite friends — you both get $1 USDC per signup.' },
              { icon: Star, title: 'ELO Ranking System', desc: 'Compete against players at your skill level. Fair matches.' },
            ].map((item) => (
              <div key={item.title} className="card flex items-start gap-4">
                <div className="w-10 h-10 rounded bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-accent-cyan" />
                </div>
                <div>
                  <h3 className="font-orbitron text-sm font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-muted text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-orbitron text-2xl font-black text-center mb-8">
          <span className="text-gradient">3 Games, Real Stakes</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { game: 'CS2', desc: '1v1 on dedicated 128-tick servers. Automatic result detection.', players: '1.27M' },
            { game: 'Dota 2', desc: 'Play your match, submit match ID. Auto-verified via Steam API.', players: '608K' },
            { game: 'Deadlock', desc: "Valve's newest game. First and only stake platform.", players: '218K' },
          ].map((g) => (
            <div key={g.game} className="card text-center py-8">
              <h3 className="font-orbitron text-2xl font-bold text-accent-cyan mb-2">{g.game}</h3>
              <p className="text-muted text-sm mb-3">{g.desc}</p>
              <span className="text-xs text-muted">{g.players} global players</span>
            </div>
          ))}
        </div>
      </section>

      {/* Urgency CTA */}
      <section className="bg-space-800 border-y border-border py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-accent-gold" />
            <span className="font-orbitron text-sm font-bold text-accent-gold">
              {spotsLeft > 0 ? `Only ${spotsLeft} spots remaining` : 'Promo fully claimed!'}
            </span>
          </div>
          <h2 className="font-orbitron text-3xl font-black mb-4">
            {spotsLeft > 0 ? (
              <>Don&apos;t miss your <span className="text-accent-gold">free $5</span></>
            ) : (
              <>Promo is over, but you can still <span className="text-accent-cyan">play free tournaments</span></>
            )}
          </h2>
          <Link
            href="/api/auth/steam"
            className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2"
          >
            Connect Steam Now <ChevronRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-muted mt-4">
            Works worldwide. 44 countries. CS2, Dota 2 & Deadlock.
          </p>
        </div>
      </section>
    </div>
  )
}
