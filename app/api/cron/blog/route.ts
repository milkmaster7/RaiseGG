import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

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
  'Turkish CS2 community guide: best servers, tournaments, and stake matches in Turkey',
  'CS2 in Istanbul: how the Turkish competitive scene is growing in 2026',
  'Georgian gaming scene: from Tbilisi LAN parties to online stake matches',
  'How to buy USDC with a debit card and start staking in under 5 minutes',
  'USDC vs USDT for esports staking: which stablecoin is better on Solana',
  'RaiseGG beginner guide: from Steam login to your first stake match',
  'How to use the RaiseGG ELO system to find fair matches at your skill level',
  'RaiseGG wallet guide: depositing USDC, withdrawing winnings, and Phantom tips',
  'How to warm up properly before a CS2 stake match — aim drills and mindset',
  'Competitive gaming tips: 5 habits that separate consistent winners from grinders',
  // SEO long-tail — regional
  'Best esports platforms for Turkish players in 2026',
  'CS2 competitive scene in Azerbaijan: Baku gaming community guide',
  'Armenian gaming community: esports tournaments and stake matches',
  'Serbian CS2 players: how to compete for real money online',
  'Croatian esports guide: Dota 2 and CS2 competitive scene',
  'Polish CS2 players: why RaiseGG beats FACEIT for stake matches',
  'Czech Republic gaming scene: competitive CS2 and staking platforms',
  'Uzbekistan esports community: getting started with competitive gaming',
  'Kyrgyzstan gamers: how to play CS2 stake matches from Central Asia',
  'Iranian CS2 community: best servers and competitive platforms in 2026',
  'Greek esports guide: Dota 2 and CS2 competitive scene in Athens',
  'Hungarian gamers: CS2 stake matches and the Budapest gaming scene',
  // SEO long-tail — game-specific
  'CS2 economy guide: how to manage money in competitive matches',
  'Dota 2 micro skills that win stake matches: last hits, denies, and map awareness',
  'Deadlock item build guide for competitive play in 2026',
  'CS2 utility guide: smokes and flashes that win 1v1 duels',
  'Dota 2 warding guide for stake match strategy',
  'How to pick your main in Deadlock: hero roles explained',
  'CS2 movement tips: counter-strafing and jiggle peeking for beginners',
  'Dota 2 mid lane matchups: heroes that dominate 1v1 scenarios',
  // SEO long-tail — crypto/platform
  'What is USDC and why do esports platforms use it for payouts',
  'How blockchain escrow protects your money in esports stake matches',
  'Solana vs Ethereum for esports payouts: speed and cost comparison',
  'How to create a Phantom wallet on mobile and desktop in 2026',
  'Is skill-based gaming gambling? The legal difference explained',
  'Why smart contracts make esports payouts trustless and instant',
  'How to convert USDC to local currency: Turkey, Georgia, Romania guide',
  'The rise of no-KYC gaming platforms: privacy and accessibility',
  // SEO long-tail — strategy
  'Bankroll management for esports staking: the 5% rule',
  'How to analyse your CS2 demos to improve for stake matches',
  'Tilt control: the psychology of competitive gaming for money',
  'How to build a 1v1 practice routine that makes you money',
  'The best time of day to play stake matches (and why it matters)',
  'How to transition from casual gaming to competitive staking',
  'Esports staking glossary: every term you need to know',
  'How leaderboards and ELO ratings keep stake matches fair',
  // SEO long-tail — comparisons
  'RaiseGG vs FACEIT: which is better for competitive CS2 in 2026',
  'RaiseGG vs Discord wagers: why smart contracts beat trust',
  'Best CS2 stake platforms compared: RaiseGG, Gamdom, CSGOEmpire',
  'Where to play Dota 2 for real money in 2026',
  'Top 5 esports platforms for players in Turkey and the Caucasus',
  'Best crypto gaming platforms for competitive players in 2026',
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
    await recordCronRun('blog', 'ok', { message: 'All topics published' })
    return NextResponse.json({ message: 'All topics published' })
  }

  // Pick a random available topic
  const topic = available[Math.floor(Math.random() * available.length)]

  // Call the generate endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://raisegg.com'
  const res = await fetch(`${baseUrl}/api/blog/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ topic }),
  })

  const result = await res.json()
  if (!res.ok) {
    await recordCronRun('blog', 'error', { message: `Failed: ${result.error ?? 'unknown'}` })
    return NextResponse.json({ topic, ...result })
  }

  // Generate Turkish or Russian article on alternate days
  const dayOfMonth = new Date().getDate()
  const extraLanguage = dayOfMonth % 2 === 0 ? 'tr' : 'ru'
  const extraTopic = available[Math.floor(Math.random() * available.length)] ?? topic

  try {
    await fetch(`${baseUrl}/api/blog/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ topic: extraTopic, language: extraLanguage }),
      signal: AbortSignal.timeout(60000),
    })
  } catch {
    // Non-critical — don't fail the main cron
  }

  await recordCronRun('blog', 'ok', { message: `Generated: ${result.title ?? topic} + ${extraLanguage.toUpperCase()}` })
  return NextResponse.json({ topic, ...result })
}
