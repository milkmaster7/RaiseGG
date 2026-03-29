'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'

interface Props {
  username: string
  opponent: string
  game: string
  result: 'win' | 'loss'
  payout: number
  stake: number
  eloDelta?: string
}

export function PnlShareButton({ username, opponent, game, result, payout, stake, eloDelta = '+0' }: Props) {
  const [open, setOpen] = useState(false)

  const cardUrl = `https://raisegg.com/api/pnl-card?username=${encodeURIComponent(username)}&opponent=${encodeURIComponent(opponent)}&game=${encodeURIComponent(game)}&result=${result}&payout=${payout.toFixed(2)}&stake=${stake.toFixed(2)}&elo=${encodeURIComponent(eloDelta)}`

  const shareText = result === 'win'
    ? `Just won $${payout.toFixed(2)} on ${game} 🏆 @RaiseGG`
    : `${game} match vs ${opponent} on @RaiseGG`

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(cardUrl)}`
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(cardUrl)}&text=${encodeURIComponent(shareText)}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(cardUrl)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-accent-cyan hover:text-accent-cyan-glow text-xs flex items-center gap-1 transition-colors"
        title="Share PnL Card"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-cyan hover:underline">X</a>
      <span className="text-border">·</span>
      <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-cyan hover:underline">TG</a>
      <span className="text-border">·</span>
      <button onClick={copyLink} className="text-xs text-accent-cyan hover:underline">Copy</button>
      <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-white ml-1">✕</button>
    </div>
  )
}
