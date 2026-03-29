'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'

interface AffiliateStats {
  referralCode: string
  referralLink: string
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  tier: 'starter' | 'silver' | 'gold'
  tierRate: number
  history: {
    date: string
    referredPlayer: string
    winAmount: number
    commission: number
  }[]
}

interface CreatorApp {
  status: 'pending' | 'approved' | 'rejected'
}

const TIERS = [
  { name: 'Starter', range: '0–9 referrals', rate: '5%', min: 0, color: 'text-gray-400' },
  { name: 'Silver', range: '10–49 referrals', rate: '7.5%', min: 10, color: 'text-gray-300' },
  { name: 'Gold', range: '50+ referrals', rate: '10%', min: 50, color: 'text-amber-400' },
]

export default function AffiliatePage() {
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copiedTweet, setCopiedTweet] = useState(false)
  const [creatorApp, setCreatorApp] = useState<CreatorApp | null>(null)
  const [creatorForm, setCreatorForm] = useState({ platform: 'twitch', handle: '', followerCount: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/affiliate')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    // Check creator application status
    const checkCreator = async () => {
      const res = await fetch('/api/affiliate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'creator_status' }) })
      if (res.ok) {
        const data = await res.json()
        if (data.application) setCreatorApp(data.application)
      }
    }
    checkCreator()
  }, [fetchStats])

  const copyLink = () => {
    if (!stats) return
    navigator.clipboard.writeText(stats.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyCode = () => {
    if (!stats) return
    navigator.clipboard.writeText(stats.referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tweetText = stats
    ? `I just won on @RaiseGG! Stake on your skills in CS2, Dota 2 & Deadlock. Sign up with my code: ${stats.referralCode} → raisegg.com/?ref=${stats.referralCode}`
    : ''

  const shareTweet = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank')
  }

  const copyTweet = () => {
    navigator.clipboard.writeText(tweetText)
    setCopiedTweet(true)
    setTimeout(() => setCopiedTweet(false), 2000)
  }

  const submitCreatorApp = async () => {
    if (!creatorForm.handle || !creatorForm.followerCount) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/affiliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_creator',
          platform: creatorForm.platform,
          handle: creatorForm.handle,
          followerCount: parseInt(creatorForm.followerCount),
        }),
      })
      if (res.ok) {
        setCreatorApp({ status: 'pending' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-64" />
          <div className="h-4 bg-gray-800 rounded w-96" />
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-800 rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="font-orbitron text-3xl font-black mb-4 text-gradient">Affiliate Program</h1>
        <p className="text-muted mb-4">Please log in to access the affiliate dashboard.</p>
        <a href="/api/auth/steam">
          <Button variant="primary">Sign in with Steam</Button>
        </a>
      </div>
    )
  }

  const currentTier = TIERS.find(t =>
    stats.tier === 'gold' ? t.name === 'Gold' :
    stats.tier === 'silver' ? t.name === 'Silver' : t.name === 'Starter'
  )!

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Affiliate Program</h1>
      <p className="text-muted mb-8">Earn commissions when your referrals win matches.</p>

      {/* Referral Code */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="font-orbitron text-lg font-bold text-white mb-3">Your Referral Code</h2>
          <div className="flex items-center gap-3 mb-4">
            <code className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-lg font-mono text-cyan-400 select-all flex-1 truncate">
              {stats.referralCode}
            </code>
            <Button variant="cyan" size="sm" onClick={copyCode}>
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <code className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-300 flex-1 truncate">
              {stats.referralLink}
            </code>
            <Button variant="secondary" size="sm" onClick={copyLink}>
              Copy Link
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Referrals" value={stats.totalReferrals} />
        <StatCard label="Active Referrals" value={stats.activeReferrals} />
        <StatCard label="Total Earnings" value={`$${stats.totalEarnings.toFixed(2)}`} accent />
      </div>

      {/* Tier Progress */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="font-orbitron text-lg font-bold text-white mb-4">Commission Tiers</h2>
          <div className="space-y-3">
            {TIERS.map(tier => {
              const isActive = tier.name.toLowerCase() === stats.tier
              return (
                <div
                  key={tier.name}
                  className={`flex items-center justify-between p-3 rounded border ${
                    isActive
                      ? 'border-cyan-500/50 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                    <span className={`font-semibold ${tier.color}`}>{tier.name}</span>
                    <span className="text-muted text-sm">{tier.range}</span>
                  </div>
                  <span className={`font-orbitron font-bold ${isActive ? 'text-cyan-400' : 'text-muted'}`}>
                    {tier.rate}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Share Section */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="font-orbitron text-lg font-bold text-white mb-4">Share Your Link</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={shareTweet}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Tweet
            </Button>
            <Button variant="secondary" onClick={copyTweet}>
              {copiedTweet ? 'Copied!' : 'Copy Tweet'}
            </Button>
          </div>
          <p className="text-muted text-xs mt-3 italic">"{tweetText}"</p>
        </div>
      </Card>

      {/* Earnings History */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="font-orbitron text-lg font-bold text-white mb-4">Earnings History</h2>
          {stats.history.length === 0 ? (
            <p className="text-muted text-sm">No referral earnings yet. Share your link to start earning!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-muted text-left">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Referred Player</th>
                    <th className="pb-2 pr-4 text-right">Win Amount</th>
                    <th className="pb-2 text-right">Your Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.history.map((entry, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2 pr-4 text-gray-300">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4 text-white">{entry.referredPlayer}</td>
                      <td className="py-2 pr-4 text-right text-gray-300">${entry.winAmount.toFixed(2)}</td>
                      <td className="py-2 text-right text-emerald-400 font-semibold">
                        +${entry.commission.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Creator Program */}
      <Card>
        <div className="p-6">
          <h2 className="font-orbitron text-lg font-bold text-white mb-2">Creator Program</h2>
          <p className="text-muted text-sm mb-4">
            Streamers and content creators with 1,000+ followers can apply for our Creator Program.
            Get a custom landing page, higher commission rates, and promotional support.
          </p>

          {creatorApp ? (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded border ${
              creatorApp.status === 'approved'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : creatorApp.status === 'rejected'
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
            }`}>
              {creatorApp.status === 'approved' && 'Approved — Welcome to the Creator Program!'}
              {creatorApp.status === 'rejected' && 'Application was not approved at this time.'}
              {creatorApp.status === 'pending' && 'Application under review. We will get back to you soon.'}
            </div>
          ) : (
            <div className="space-y-3 max-w-md">
              <div>
                <label className="block text-sm text-muted mb-1">Platform</label>
                <select
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                  value={creatorForm.platform}
                  onChange={e => setCreatorForm(f => ({ ...f, platform: e.target.value }))}
                >
                  <option value="twitch">Twitch</option>
                  <option value="youtube">YouTube</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="tiktok">TikTok</option>
                  <option value="kick">Kick</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Handle / Channel URL</label>
                <input
                  type="text"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                  placeholder="@yourhandle or channel URL"
                  value={creatorForm.handle}
                  onChange={e => setCreatorForm(f => ({ ...f, handle: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Follower Count</label>
                <input
                  type="number"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                  placeholder="1000"
                  value={creatorForm.followerCount}
                  onChange={e => setCreatorForm(f => ({ ...f, followerCount: e.target.value }))}
                />
              </div>
              <Button
                variant="primary"
                onClick={submitCreatorApp}
                loading={submitting}
                disabled={!creatorForm.handle || !creatorForm.followerCount}
              >
                Apply for Creator Program
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
