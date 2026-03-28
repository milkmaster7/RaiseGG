import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const revalidate = 30

export const metadata: Metadata = {
  title: 'Activity Feed — RaiseGG.gg',
  robots: { index: false, follow: false },
}

type MatchWonItem = {
  type: 'match_won'
  winner: string
  loser: string
  game: string
  amount: number
  currency: string
  time: string
}

type NewPlayerItem = {
  type: 'new_player'
  username: string
  country: string | null
  time: string
}

type FeedItem = MatchWonItem | NewPlayerItem

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

async function getFeed(): Promise<FeedItem[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://raisegg.gg'
    const res = await fetch(`${base}/api/feed`, { next: { revalidate: 30 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.feed ?? []
  } catch {
    return []
  }
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'DOTA 2', deadlock: 'DEADLOCK' }

export default async function FeedPage() {
  const feed = await getFeed()

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Activity Feed', url: 'https://raisegg.gg/feed' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Activity Feed</h1>
        <p className="text-muted text-sm mb-8">Live match results and new players — last 48 hours.</p>

        {feed.length === 0 ? (
          <div className="card text-center py-16 text-muted text-sm">No activity yet. Be the first to play!</div>
        ) : (
          <div className="space-y-2">
            {feed.map((item, i) => (
              <div
                key={i}
                className={`card py-3 flex items-start gap-3 border-l-2 ${
                  item.type === 'match_won' ? 'border-green-500' : 'border-accent-purple'
                }`}
              >
                {item.type === 'match_won' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-orbitron font-bold text-green-400">{item.winner}</span>
                        <span className="text-muted"> beat </span>
                        <span className="font-orbitron font-bold text-white">{item.loser}</span>
                        <span className="text-muted"> · </span>
                        <span className="text-xs text-muted uppercase">{GAME_LABELS[item.game] ?? item.game}</span>
                        <span className="text-muted"> · </span>
                        <span className="text-green-400 font-semibold">${item.amount} {item.currency.toUpperCase()}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted flex-shrink-0">{timeAgo(item.time)}</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-accent-purple mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-orbitron font-bold text-accent-purple">{item.username}</span>
                        <span className="text-muted"> from </span>
                        <span className="text-white">{item.country ?? 'unknown'}</span>
                        <span className="text-muted"> joined</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted flex-shrink-0">{timeAgo(item.time)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
