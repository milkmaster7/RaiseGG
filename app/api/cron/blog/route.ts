import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Topics pool — Gemini picks one that hasn't been published yet
const TOPIC_POOL = [
  'CS2 warmup routine: the 15-minute pre-match ritual top players use',
  'How to manage your bankroll when playing stake matches in CS2',
  'The best CS2 maps for 1v1 duels and why',
  'Dota 2 hero picks for stake matches — which heroes win 1v1 scenarios',
  'How to improve your CS2 aim in 30 days without spending money',
  'CS2 crosshair settings used by the top players from Turkey and Georgia',
  'Why competitive gaming in Ukraine is exploding and where to play',
  'Deadlock: hero tier list for competitive stake play',
  'How to climb the RaiseGG leaderboard faster — ELO strategy guide',
  'CS2 stake tips for Romanian players: getting started with USDC',
  'The mental game: how to handle losing a high-stakes match',
  'Dota 2 draft strategy for stake matches — picks that win money',
  'How to find your peak play hours for competitive gaming',
  'CS2 tips for Kazakh players: servers, settings, and stake strategy',
  'Deadlock game sense: the skill that separates stake winners from losers',
  'How to read your opponent in a CS2 1v1 stake match',
  'The economics of esports staking: when does it make sense?',
  'Dota 2 support vs carry in stake matches — which role earns more?',
  'CS2 for Balkan players: community, ping, and platform tips',
  'How to set up a Phantom wallet and buy USDC in under 10 minutes',
  'The difference between ELO systems in CS2, FACEIT and RaiseGG',
  'Why no-KYC stake platforms are growing in restricted markets',
  'CS2 1v1 format guide: map pool, rules, and winning strategies',
  'Dota 2 match ID verification: what RaiseGG checks and why',
  'How Solana makes instant esports payouts possible',
]

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get already-published AI topics
  const { data: existing } = await supabase
    .from('ai_blog_posts')
    .select('title')

  const publishedTitles = new Set((existing ?? []).map((r: { title: string }) => r.title.toLowerCase()))

  // Find first unpublished topic (fuzzy: just check if any word from topic matches)
  const available = TOPIC_POOL.filter((topic) => {
    const words = topic.toLowerCase().split(' ').filter(w => w.length > 5)
    return !words.some(w => Array.from(publishedTitles).some(t => t.includes(w)))
  })

  if (available.length === 0) {
    return NextResponse.json({ message: 'All topics published' })
  }

  // Pick a random available topic
  const topic = available[Math.floor(Math.random() * available.length)]

  // Call the generate endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://raisegg.gg'
  const res = await fetch(`${baseUrl}/api/blog/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ topic }),
  })

  const result = await res.json()
  return NextResponse.json({ topic, ...result })
}
