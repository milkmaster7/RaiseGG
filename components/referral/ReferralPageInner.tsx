'use client'

import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Users } from 'lucide-react'

export function ReferralPageInner() {
  const [data, setData] = useState<{ referralCode: string; referralLink: string; referredBy: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [applyStatus, setApplyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  async function copyLink() {
    if (!data) return
    await navigator.clipboard.writeText(data.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function applyCode() {
    if (!inputCode.trim()) return
    setApplyStatus('loading')
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: inputCode.trim() }),
      })
      if (res.ok) {
        setApplyStatus('success')
        const updated = await fetch('/api/referral').then(r => r.json())
        setData(updated)
      } else {
        setApplyStatus('error')
      }
    } catch {
      setApplyStatus('error')
    }
  }

  if (loading) return <div className="card animate-pulse h-48" />

  if (!data) {
    return (
      <div className="card text-center py-12">
        <Users className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-muted mb-4">Log in to see your referral link.</p>
        <a href="/api/auth/steam" className="btn-primary px-6 py-2.5 text-sm">Connect Steam</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Your Link */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-5 h-5 text-accent-purple" />
          <h2 className="font-orbitron text-lg font-bold text-white">Your Referral Link</h2>
        </div>
        <p className="text-muted text-sm mb-4">Share this link. When someone signs up and plays their first match, you both earn a bonus.</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={data.referralLink}
            className="flex-1 bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white font-mono"
          />
          <button onClick={copyLink} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5">
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="card">
        <h2 className="font-orbitron text-sm font-bold text-white mb-3">How Referrals Work</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <div className="font-orbitron text-xs text-accent-cyan mb-1">01</div>
            <p className="text-muted text-xs">Share your link with a friend</p>
          </div>
          <div>
            <div className="font-orbitron text-xs text-accent-cyan mb-1">02</div>
            <p className="text-muted text-xs">They sign up and play their first match</p>
          </div>
          <div>
            <div className="font-orbitron text-xs text-accent-cyan mb-1">03</div>
            <p className="text-muted text-xs">You both earn a bonus reward</p>
          </div>
        </div>
      </div>

      {/* Apply a code */}
      {!data.referredBy && (
        <div className="card">
          <h2 className="font-orbitron text-sm font-bold text-white mb-3">Have a Referral Code?</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste referral code"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              className="flex-1 bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
            />
            <button onClick={applyCode} disabled={applyStatus === 'loading'} className="btn-secondary px-4 py-2.5 text-sm">
              {applyStatus === 'loading' ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {applyStatus === 'success' && <p className="text-green-400 text-xs mt-2">Referral applied successfully!</p>}
          {applyStatus === 'error' && <p className="text-red-400 text-xs mt-2">Invalid or already used code.</p>}
        </div>
      )}

      {data.referredBy && (
        <div className="card">
          <p className="text-muted text-sm">You were referred by a friend. Bonus earned on first match.</p>
        </div>
      )}
    </div>
  )
}
