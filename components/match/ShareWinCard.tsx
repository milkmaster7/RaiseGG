'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface ShareWinCardProps {
  matchId: string
  playerId: string
  game: string
  payout: number
  opponentUsername: string
}

const GAME_LABELS: Record<string, string> = {
  cs2: 'CS2',
  dota2: 'Dota 2',
  deadlock: 'Deadlock',
}

export function ShareWinCard({ matchId, playerId, game, payout, opponentUsername }: ShareWinCardProps) {
  const [copied, setCopied] = useState(false)

  const pnlCardUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://raisegg.com'}/api/pnl-card/${matchId}?player=${playerId}`
  const gameLabel = GAME_LABELS[game] ?? game
  const tweetText = `Just won $${payout.toFixed(2)} on @RaiseGG playing ${gameLabel}! ${pnlCardUrl}`

  const shareTweet = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
      '_blank'
    )
  }

  const copyLink = () => {
    navigator.clipboard.writeText(pnlCardUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCard = async () => {
    try {
      const res = await fetch(pnlCardUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raisegg-win-${matchId.slice(0, 8)}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(pnlCardUrl, '_blank')
    }
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-gray-900 p-6 text-center">
      {/* Victory banner */}
      <div className="mb-4">
        <div className="text-4xl mb-2">&#127942;</div>
        <h2 className="font-orbitron text-2xl font-black text-emerald-400">VICTORY!</h2>
        <p className="font-orbitron text-3xl font-bold text-white mt-1">
          +${payout.toFixed(2)}
        </p>
        <p className="text-muted text-sm mt-1">
          vs {opponentUsername} &bull; {gameLabel}
        </p>
      </div>

      {/* PnL Card Preview */}
      <div className="mb-6 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 mx-auto max-w-sm">
        <img
          src={pnlCardUrl}
          alt="PnL Card"
          className="w-full"
          loading="lazy"
        />
      </div>

      {/* Share buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={shareTweet}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Share on X
        </Button>
        <Button variant="secondary" onClick={copyLink}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
        <Button variant="cyan" onClick={downloadCard}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </Button>
      </div>
    </div>
  )
}
