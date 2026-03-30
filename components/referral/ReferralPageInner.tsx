'use client'

import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Users, DollarSign, UserPlus } from 'lucide-react'

interface ReferralEntry {
  id: string
  referredId: string
  referredUsername: string | null
  bonusClaimed: boolean
  createdAt: string
}

interface ReferralData {
  referralCode: string
  referralLink: string
  referredBy: string | null
  stats: {
    totalReferred: number
    totalEarned: number
    referrals: ReferralEntry[]
  }
}

export function ReferralPageInner() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [applyStatus, setApplyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [applyMessage, setApplyMessage] = useState('')

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

  async function copyCode() {
    if (!data) return
    await navigator.clipboard.writeText(data.referralCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  async function applyCode() {
    if (!inputCode.trim()) return
    setApplyStatus('loading')
    setApplyMessage('')
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: inputCode.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        setApplyStatus('success')
        setApplyMessage(json.message || 'Referral applied!')
        // Refresh data
        const updated = await fetch('/api/referral').then(r => r.json())
        setData(updated)
      } else {
        setApplyStatus('error')
        setApplyMessage(json.error || 'Invalid referral code.')
      }
    } catch {
      setApplyStatus('error')
      setApplyMessage('Something went wrong. Try again.')
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <UserPlus className="w-6 h-6 text-[#00e6ff] mx-auto mb-2" />
          <div className="font-orbitron text-2xl font-black text-white">{data.stats.totalReferred}</div>
          <div className="text-muted text-xs mt-1">Friends Referred</div>
        </div>
        <div className="card text-center">
          <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <div className="font-orbitron text-2xl font-black text-white">${data.stats.totalEarned.toFixed(2)}</div>
          <div className="text-muted text-xs mt-1">Total Earned</div>
        </div>
      </div>

      {/* Your Code & Link */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-5 h-5 text-[#00e6ff]" />
          <h2 className="font-orbitron text-lg font-bold text-white">Your Referral Code</h2>
        </div>
        <p className="text-muted text-sm mb-4">
          Share your code or link. When someone signs up and plays, you both get <span className="text-green-400 font-semibold">$1.00</span> bonus credit.
        </p>

        {/* Code */}
        <div className="mb-3">
          <label className="text-muted text-xs uppercase tracking-wider mb-1 block">Code</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={data.referralCode}
              className="flex-1 bg-[#0f1029] border border-[#1a1b3a] rounded px-3 py-2.5 text-sm text-white font-mono"
            />
            <button onClick={copyCode} className="px-4 py-2.5 text-sm flex items-center gap-1.5 rounded border border-[#1a1b3a] text-[#00e6ff] hover:bg-[#00e6ff]/10 transition-colors">
              {copiedCode ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
        </div>

        {/* Link */}
        <div>
          <label className="text-muted text-xs uppercase tracking-wider mb-1 block">Share Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={data.referralLink}
              className="flex-1 bg-[#0f1029] border border-[#1a1b3a] rounded px-3 py-2.5 text-sm text-white font-mono text-ellipsis overflow-hidden"
            />
            <button onClick={copyLink} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5">
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="card">
        <h2 className="font-orbitron text-sm font-bold text-white mb-3">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <div className="font-orbitron text-xs text-[#00e6ff] mb-1">01</div>
            <p className="text-muted text-xs">Share your code or link with a friend</p>
          </div>
          <div>
            <div className="font-orbitron text-xs text-[#00e6ff] mb-1">02</div>
            <p className="text-muted text-xs">They sign up using your referral</p>
          </div>
          <div>
            <div className="font-orbitron text-xs text-[#00e6ff] mb-1">03</div>
            <p className="text-muted text-xs">You both get $1.00 bonus credit instantly</p>
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
              onKeyDown={e => e.key === 'Enter' && applyCode()}
              className="flex-1 bg-[#0f1029] border border-[#1a1b3a] rounded px-3 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-[#00e6ff]/50 transition-colors"
            />
            <button onClick={applyCode} disabled={applyStatus === 'loading'} className="btn-secondary px-4 py-2.5 text-sm">
              {applyStatus === 'loading' ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {applyStatus === 'success' && <p className="text-green-400 text-xs mt-2">{applyMessage}</p>}
          {applyStatus === 'error' && <p className="text-red-400 text-xs mt-2">{applyMessage}</p>}
        </div>
      )}

      {data.referredBy && (
        <div className="card border border-green-500/20">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            You were referred by a friend. $1.00 bonus applied.
          </p>
        </div>
      )}

      {/* Referral History */}
      {data.stats.referrals.length > 0 && (
        <div className="card">
          <h2 className="font-orbitron text-sm font-bold text-white mb-4">Your Referrals</h2>
          <div className="space-y-2">
            {data.stats.referrals.map(ref => (
              <div key={ref.id} className="flex items-center justify-between py-2 border-b border-[#1a1b3a] last:border-0">
                <div>
                  <span className="text-white text-sm">{ref.referredUsername || 'Anonymous'}</span>
                  <span className="text-muted text-xs ml-2">
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  {ref.bonusClaimed ? (
                    <span className="text-green-400 text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" /> +$1.00
                    </span>
                  ) : (
                    <span className="text-yellow-400 text-xs">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
