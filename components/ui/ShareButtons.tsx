'use client'

import { useState } from 'react'
import { Twitter, Send, Link2, Check } from 'lucide-react'

interface ShareButtonsProps {
  url: string
  title: string
  description?: string
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const encodedDesc = encodeURIComponent(description ?? title)

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedDesc}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const btnClass =
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 border border-space-700 bg-space-800 hover:border-accent-cyan/40 hover:bg-space-700 text-muted hover:text-white'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <Twitter className="w-3.5 h-3.5" />
        <span>Tweet</span>
      </a>
      <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <Send className="w-3.5 h-3.5" />
        <span>Telegram</span>
      </a>
      <button onClick={copyLink} className={btnClass}>
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400">Copied!</span>
          </>
        ) : (
          <>
            <Link2 className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  )
}
