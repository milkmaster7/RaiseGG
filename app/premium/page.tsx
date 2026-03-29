'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface PremiumStatus {
  active: boolean
  premiumUntil: string | null
}

const BENEFITS = [
  {
    icon: (
      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Priority Matchmaking',
    desc: 'Get matched first in the queue — never wait in line.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Advanced Stats Dashboard',
    desc: 'Win% by ELO range, performance graphs, and deep analytics.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: '2% Rake Discount',
    desc: 'Pay only 8% rake instead of 10% on all matches. More winnings in your pocket.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'Exclusive Premium Badge',
    desc: 'Stand out with a golden Premium badge on your profile.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: 'Early Access',
    desc: 'Be the first to try new features, games, and modes.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Custom PnL Card Backgrounds',
    desc: 'Unlock exclusive backgrounds for your win share cards.',
  },
]

export default function PremiumPage() {
  const [status, setStatus] = useState<PremiumStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/premium')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const subscribe = async () => {
    setSubscribing(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Subscription failed')
        return
      }
      setSuccess('Premium activated! Enjoy your benefits.')
      setStatus({ active: true, premiumUntil: data.premiumUntil })
    } finally {
      setSubscribing(false)
    }
  }

  const cancel = async () => {
    setCancelling(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Cancel failed')
        return
      }
      setSuccess('Subscription cancelled. Premium remains active until expiry.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-sm font-semibold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          PREMIUM
        </div>
        <h1 className="font-orbitron text-4xl font-black mb-3 text-gradient">
          RaiseGG Premium
        </h1>
        <p className="text-xl text-muted">
          Unlock the full RaiseGG experience for just{' '}
          <span className="text-white font-bold">$2/month</span>
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-3 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-3 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-sm text-center">
          {success}
        </div>
      )}

      {/* Current Status */}
      {status?.active && (
        <Card className="mb-8">
          <div className="p-6 text-center">
            <div className="inline-flex items-center gap-2 text-emerald-400 font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Premium Active
            </div>
            <p className="text-muted text-sm">
              Your premium is active until{' '}
              <span className="text-white font-semibold">
                {status.premiumUntil
                  ? new Date(status.premiumUntil).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })
                  : 'N/A'}
              </span>
            </p>
          </div>
        </Card>
      )}

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {BENEFITS.map((benefit, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 flex gap-4"
          >
            <div className="shrink-0 mt-0.5">{benefit.icon}</div>
            <div>
              <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
              <p className="text-muted text-sm">{benefit.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        {loading ? (
          <div className="h-12 w-48 bg-gray-800 rounded animate-pulse mx-auto" />
        ) : status?.active ? (
          <Button variant="ghost" onClick={cancel} loading={cancelling}>
            Cancel Subscription
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={subscribe} loading={subscribing}>
            Subscribe — $2 USDC/month
          </Button>
        )}
      </div>
    </div>
  )
}
