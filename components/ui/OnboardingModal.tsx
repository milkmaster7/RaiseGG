'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export function OnboardingModal({ hasBalance }: { hasBalance: boolean }) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (hasBalance) return
    const done = localStorage.getItem('rgg_onboarding_done')
    if (!done) setShow(true)
  }, [hasBalance])

  const dismiss = () => {
    localStorage.setItem('rgg_onboarding_done', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card max-w-md w-full relative">
        <button onClick={dismiss} className="absolute top-4 right-4 text-muted hover:text-white text-xl">×</button>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded ${s <= step ? 'bg-accent-purple' : 'bg-space-700'}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="font-orbitron text-xl font-black text-gradient mb-2">Welcome to RaiseGG</h2>
            <p className="text-muted text-sm mb-6">You&apos;re connected via Steam. Now set up your wallet to start competing for real money.</p>
            <button onClick={() => setStep(2)} className="btn-primary w-full">Get Started →</button>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="font-orbitron text-lg font-black text-white mb-2">Step 1 — Get a Wallet</h2>
            <p className="text-muted text-sm mb-4">Install <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-accent-purple hover:underline">Phantom</a> (free browser extension). Create a wallet and keep your seed phrase safe offline.</p>
            <p className="text-muted text-sm mb-6">Then buy USDC or USDT on Binance or OKX and withdraw to your Phantom address on the <strong className="text-white">Solana</strong> network.</p>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">Next →</button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="font-orbitron text-lg font-black text-white mb-2">Step 2 — Deposit & Play</h2>
            <p className="text-muted text-sm mb-4">Connect your Phantom wallet on the Wallet page and deposit USDC or USDT. Minimum stake is $2.</p>
            <p className="text-muted text-sm mb-6">Your funds are held in a Solana smart contract — not in our bank account. You&apos;re in control.</p>
            <div className="flex gap-3">
              <button onClick={dismiss} className="btn-secondary flex-1">Later</button>
              <Link href="/dashboard/wallet" onClick={dismiss} className="btn-primary flex-1 text-center">Go to Wallet →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
