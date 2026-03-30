'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface WeeklyStats {
  username: string
  matchesPlayed: number
  wins: number
  losses: number
  winRate: number
  eloChange: number
  biggestWin: number
  currentStreak: number
  loginStreak: number
  totalEarned: number
  rank: number
  peakElo: number
  weekStart: string
  weekEnd: string
}

export function HighlightsClient() {
  const [data, setData] = useState<WeeklyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/highlights')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-space-700 rounded w-64" />
          <div className="h-[400px] bg-space-700 rounded" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black text-gradient mb-4">Your Week in Review</h1>
        <p className="text-muted">Could not load weekly stats. Play some matches to generate your highlight reel!</p>
        <Link href="/play" className="btn-primary mt-4 inline-block">Find a Match</Link>
      </div>
    )
  }

  const imageUrl = `/api/highlights/image?username=${encodeURIComponent(data.username)}&matches=${data.matchesPlayed}&wins=${data.wins}&losses=${data.losses}&winRate=${data.winRate}&eloChange=${data.eloChange}&biggestWin=${data.biggestWin}&streak=${data.currentStreak}&totalEarned=${data.totalEarned}&rank=${data.rank}`

  const fullImageUrl = typeof window !== 'undefined' ? `${window.location.origin}${imageUrl}` : imageUrl

  const shareText = `My week on RaiseGG: ${data.wins}W/${data.losses}L (${data.winRate}% WR), ${data.eloChange >= 0 ? '+' : ''}${data.eloChange} ELO. Stake. Play. Win.`

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullImageUrl)}`
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(fullImageUrl)}&text=${encodeURIComponent(shareText)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullImageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const statCards = [
    { label: 'Matches', value: data.matchesPlayed },
    { label: 'Wins', value: data.wins, color: 'text-green-400' },
    { label: 'Losses', value: data.losses, color: 'text-red-400' },
    { label: 'Win Rate', value: `${data.winRate}%` },
    { label: 'ELO Change', value: `${data.eloChange >= 0 ? '+' : ''}${data.eloChange}`, color: data.eloChange >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Biggest Win', value: data.biggestWin > 0 ? `$${data.biggestWin.toFixed(2)}` : '-', color: 'text-green-400' },
    { label: 'Win Streak', value: data.currentStreak },
    { label: 'Total Earned', value: `${data.totalEarned >= 0 ? '+' : ''}$${data.totalEarned.toFixed(2)}`, color: data.totalEarned >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Rank', value: `#${data.rank}`, color: 'text-accent-cyan' },
  ]

  const weekStart = new Date(data.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekEnd = new Date(data.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-orbitron text-3xl font-black text-gradient">Your Week in Review</h1>
        <Link href="/dashboard" className="text-xs text-muted hover:text-white transition-colors">
          Back to Dashboard
        </Link>
      </div>
      <p className="text-muted text-sm mb-8">{weekStart} - {weekEnd}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="card text-center">
            <div className={`font-orbitron text-2xl font-bold mb-1 ${stat.color ?? 'text-white'}`}>
              {stat.value}
            </div>
            <div className="text-[10px] text-muted uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Preview image */}
      <div className="card mb-8">
        <h2 className="font-orbitron font-bold text-white text-sm mb-4">Shareable Card Preview</h2>
        <div className="rounded overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Weekly highlights card"
            className="w-full"
            loading="lazy"
          />
        </div>
      </div>

      {/* Share buttons */}
      <div className="flex flex-wrap gap-3">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#1da1f2]/20 text-[#1da1f2] border border-[#1da1f2]/30 hover:bg-[#1da1f2]/30 transition-colors font-orbitron text-xs font-bold uppercase tracking-wider"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Share on X
        </a>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/30 hover:bg-[#0088cc]/30 transition-colors font-orbitron text-xs font-bold uppercase tracking-wider"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          Share on Telegram
        </a>
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-space-700 text-white border border-border hover:bg-space-600 transition-colors font-orbitron text-xs font-bold uppercase tracking-wider"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.622a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.25 9.879" />
          </svg>
          {copied ? 'Copied!' : 'Copy Image URL'}
        </button>
      </div>
    </div>
  )
}
