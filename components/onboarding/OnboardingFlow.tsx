'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, Wallet, Swords, Target, Rocket } from 'lucide-react'

const STEPS = [
  {
    icon: Zap,
    title: 'Welcome to RaiseGG',
    body: 'The first competitive staking platform for CS2, Dota 2 and Deadlock. Put your skills on the line, stake USDC/USDT, and win real money against real opponents.',
    sub: 'Trustless payouts via Solana smart contracts. Your funds are always in your control.',
  },
  {
    icon: Wallet,
    title: 'Connect Your Wallet',
    body: 'Install Phantom (free browser extension) and create a Solana wallet. Buy USDC or USDT on any exchange and withdraw to your Phantom address on the Solana network.',
    sub: 'Minimum deposit is $2. Funds are held in a smart contract, not a bank.',
    link: { href: '/how-it-works', label: 'How it works' },
  },
  {
    icon: Swords,
    title: 'Your First Match',
    body: 'Browse open lobbies or create your own. Choose your game, set a stake amount, and wait for an opponent. Once matched, play your game — the winner takes the pot minus a small rake.',
    sub: 'Matches are verified through game APIs. No trust required.',
  },
  {
    icon: Target,
    title: 'Practice Mode',
    body: 'Not ready to stake real money? Start with $0 practice matches. Same matchmaking, same competition — zero risk. Build your confidence and learn the platform before going live.',
    sub: 'Practice matches still count toward achievements and leaderboard placement.',
  },
  {
    icon: Rocket,
    title: "You're Ready!",
    body: 'You know the basics. Jump into a match, climb the leaderboard, and start earning. Good luck out there.',
    sub: null,
    cta: true,
  },
]

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small delay for mount animation
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  const dismiss = () => {
    localStorage.setItem('raisegg_onboarded', '1')
    setVisible(false)
    setTimeout(onComplete, 200)
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="card max-w-lg w-full relative animate-slide-up">
        {/* Skip button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted hover:text-white text-sm font-medium transition-colors"
        >
          Skip
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center shadow-glow-sm">
            <Icon className="w-7 h-7 text-accent-cyan" />
          </div>
        </div>

        {/* Content */}
        <h2 className="font-orbitron text-xl font-black text-gradient text-center mb-3">
          {current.title}
        </h2>
        <p className="text-gray-300 text-sm leading-relaxed text-center mb-3">
          {current.body}
        </p>
        {current.sub && (
          <p className="text-muted text-xs text-center mb-2">{current.sub}</p>
        )}
        {'link' in current && current.link && (
          <div className="text-center mb-2">
            <Link
              href={current.link.href}
              onClick={dismiss}
              className="text-accent-cyan hover:text-accent-cyan-glow text-sm font-medium underline underline-offset-2 transition-colors"
            >
              {current.link.label} &rarr;
            </Link>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 my-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                i === step
                  ? 'bg-accent-cyan shadow-glow-sm scale-110'
                  : i < step
                  ? 'bg-accent-cyan/40'
                  : 'bg-space-600'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
          )}
          {isLast ? (
            <Link
              href="/play"
              onClick={dismiss}
              className="btn-primary flex-1 text-center"
            >
              Start Playing
            </Link>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary flex-1"
            >
              Next &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
