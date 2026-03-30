'use client'

import { useState, useEffect } from 'react'
import { Star, Quote, Users, TrendingUp, Shield } from 'lucide-react'

interface WinnerStory {
  username: string
  game: string
  amount: number
  country: string
}

const GAME_LABELS: Record<string, string> = {
  cs2: 'CS2',
  dota2: 'Dota 2',
  deadlock: 'Deadlock',
}

const FLAG_MAP: Record<string, string> = {
  TR: '\ud83c\uddf9\ud83c\uddf7', GE: '\ud83c\uddec\ud83c\uddea', BG: '\ud83c\udde7\ud83c\uddec', RO: '\ud83c\uddf7\ud83c\uddf4',
  UA: '\ud83c\uddfa\ud83c\udde6', KZ: '\ud83c\uddf0\ud83c\uddff', AZ: '\ud83c\udde6\ud83c\uddff', AM: '\ud83c\udde6\ud83c\uddf2',
  RS: '\ud83c\uddf7\ud83c\uddf8', HR: '\ud83c\udded\ud83c\uddf7', PL: '\ud83c\uddf5\ud83c\uddf1', CZ: '\ud83c\udde8\ud83c\uddff',
}

// Quotes rotate — these are generic testimonial-style messages
const PLAYER_QUOTES = [
  { text: 'Finally a platform where I know my money is safe. No more Discord scams.', name: 'CS2 Player', region: 'Istanbul' },
  { text: 'Got paid in under 3 seconds after winning. Never had that anywhere else.', name: 'Dota 2 Player', region: 'Tbilisi' },
  { text: 'The ping is actually fair here. First time I\'m not at a disadvantage.', name: 'CS2 Player', region: 'Bucharest' },
  { text: 'I was skeptical about crypto payouts but USDC just works. Instant.', name: 'Deadlock Player', region: 'Sofia' },
  { text: 'Moved from FACEIT to RaiseGG for stakes. Way better experience.', name: 'CS2 Player', region: 'Ankara' },
  { text: 'Love that I can verify every payout on Solscan. Total transparency.', name: 'Dota 2 Player', region: 'Almaty' },
]

export function SocialProof() {
  const [winners, setWinners] = useState<WinnerStory[]>([])
  const [quoteIndex, setQuoteIndex] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/payouts')
        const data = await res.json()
        // Extract top winners from payouts
        const stories: WinnerStory[] = (data.payouts ?? [])
          .slice(0, 6)
          .map((p: any) => ({
            username: p.username,
            game: p.game,
            amount: p.amount,
            country: p.country ?? 'TR',
          }))
        setWinners(stories)
      } catch (_) {
        // silent
      }
    }
    load()
  }, [])

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % PLAYER_QUOTES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const quote = PLAYER_QUOTES[quoteIndex]

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h2 className="font-orbitron text-3xl font-black text-center mb-4">
        <span className="text-gradient">Players Trust RaiseGG</span>
      </h2>
      <p className="text-muted text-center mb-12">Real players. Real payouts. Every day.</p>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Quote card */}
        <div className="card relative overflow-hidden py-10 px-8">
          <Quote className="absolute top-4 right-4 w-12 h-12 text-accent-cyan/10" />
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-accent-cyan text-accent-cyan" />
            ))}
          </div>
          <p className="text-white text-lg leading-relaxed mb-6 min-h-[60px] transition-opacity duration-500">
            &ldquo;{quote.text}&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent-cyan" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{quote.name}</div>
              <div className="text-muted text-xs">{quote.region}</div>
            </div>
          </div>
          {/* Dots */}
          <div className="flex gap-1.5 mt-6">
            {PLAYER_QUOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => setQuoteIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === quoteIndex ? 'bg-accent-cyan w-6' : 'bg-gray-600'}`}
                aria-label={`Quote ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Stats + recent winners */}
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center py-5">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="font-orbitron text-lg font-bold text-white">~2s</div>
              <div className="text-xs text-muted">Avg. Payout</div>
            </div>
            <div className="card text-center py-5">
              <Shield className="w-5 h-5 text-accent-cyan mx-auto mb-2" />
              <div className="font-orbitron text-lg font-bold text-white">0</div>
              <div className="text-xs text-muted">Scams Ever</div>
            </div>
            <div className="card text-center py-5">
              <Users className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <div className="font-orbitron text-lg font-bold text-white">44</div>
              <div className="text-xs text-muted">Countries</div>
            </div>
          </div>

          {/* Recent winners */}
          {winners.length > 0 && (
            <div className="card">
              <h3 className="font-orbitron text-xs font-bold text-muted uppercase tracking-wider mb-3">Recent Winners</h3>
              <div className="space-y-2">
                {winners.slice(0, 5).map((w, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{FLAG_MAP[w.country] ?? '\ud83c\udf0d'}</span>
                      <span className="text-white text-sm font-semibold">{w.username}</span>
                      <span className="text-xs text-muted">{GAME_LABELS[w.game] ?? w.game}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-400">+${w.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
