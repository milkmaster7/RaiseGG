/**
 * Influencer Outreach Cron — Finds CS2/Dota2 influencers and engages naturally.
 *
 * Strategy:
 * - Runs 3x/week (Tue, Thu, Sat)
 * - Each run: picks 1 influencer, finds their latest tweet, replies casually
 * - 10+ message variations to avoid looking spammy
 * - Tracks who we've contacted to never double-hit
 * - Also discovers new streamers via Twitch API and adds to the list
 *
 * Schedule: 0 15 * * 2,4,6 (Tue/Thu/Sat 3pm UTC)
 */

import { NextResponse } from 'next/server'
import { searchTweets, replyToTweet, likeTweet } from '@/lib/twitter'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'edge'
export const maxDuration = 30

// ── Casual reply templates (rotate to avoid spam detection) ──────────────

const REPLY_TEMPLATES = [
  (name: string) =>
    `yo ${name} — we built a CS2/Dota2 stake platform, 1v1s for real money (USDC). looking for creators to try it out + do a paid promo. interested? DM us 🤝`,

  (name: string) =>
    `${name} sick content 🔥 we run a 1v1 wager site for CS2 & Dota 2 — blockchain escrow, instant payouts. want to do a paid collab? hit our DMs`,

  (name: string) =>
    `hey ${name}! we're raisegg — players stake USDC on their own CS2/Dota matches. looking for someone to showcase it. paid ofc. lmk if interested 👊`,

  (name: string) =>
    `${name} big fan. we built something you might like — real money 1v1 stake matches for CS2/Dota2. want to try it + post about it? we pay for promos. DM open`,

  (name: string) =>
    `love the content ${name}! quick q — would you be down for a paid partnership? we run a CS2/Dota2 stake platform (think real money 1v1s). DM us if curious`,

  (name: string) =>
    `${name} 💪 we're building a skill-based wager platform for CS2 & Dota 2 — $2 min, instant payout, blockchain escrow. looking for creators. paid promo. interested?`,

  (name: string) =>
    `hey ${name}, we run raisegg.com — 1v1 stake matches for CS2 & Dota 2. your audience would love it. open to a paid collab? DM us`,

  (name: string) =>
    `${name} your stream goes hard 🎯 we got a CS2 wagering platform — players bet on themselves. want to try it on stream + get paid to promo it? lmk`,

  (name: string) =>
    `respect the grind ${name}! we're raisegg, a real-money 1v1 platform for CS2/Dota2. looking for creators in your region for paid promos. down to chat?`,

  (name: string) =>
    `${name} — ever tried staking on your own CS2/Dota matches? that's what we built. blockchain escrow, anti-cheat, instant payouts. want to do a paid review? DM 🤙`,

  (name: string) =>
    `yo ${name} we're looking for CS2/Dota streamers for paid promos on our wager platform. $2-$100 stakes, real money, instant payout. interested? slide in our DMs`,

  (name: string) =>
    `${name} — we run a competitive staking platform for CS2 & Dota 2. think matchmaking but with real money on the line. want to try it + collab? paid ofc`,
]

// ── Target handles (from influencer research) ────────────────────────────

const TARGET_HANDLES = [
  // Wave 1 — small, cheap, high volume
  { handle: 'csgomini', name: 'mini', lang: 'tr', tier: 1 },
  { handle: 'rammus53', name: 'rammus', lang: 'tr', tier: 1 },
  { handle: 'cs2turkiye', name: 'CS2 Turkiye', lang: 'tr', tier: 1 },
  { handle: 'Minaleyy_CS2', name: 'Minaleyy', lang: 'en', tier: 1 },
  { handle: 'Ozzny_CS2', name: 'Ozzny', lang: 'en', tier: 1 },
  { handle: 'dimasickCSGO', name: 'dimasick', lang: 'ru', tier: 1 },

  // Wave 2 — mid-tier
  { handle: 'rootthegamer', name: 'root', lang: 'tr', tier: 2 },
  { handle: 'CalyxCSGO', name: 'Calyx', lang: 'tr', tier: 2 },
  { handle: 'FlankEsports', name: 'Flank', lang: 'tr', tier: 2 },
  { handle: 'AlexaTvv', name: 'Alexa', lang: 'ro', tier: 2 },

  // Wave 3 — big names (later)
  { handle: 'XANTAREScsgo', name: 'XANTARES', lang: 'tr', tier: 3 },
]

export async function GET(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get already-contacted handles from DB
  const { data: contacted } = await supabase
    .from('influencer_outreach')
    .select('handle')

  const contactedSet = new Set((contacted ?? []).map((r: any) => r.handle))

  // Pick next target — wave 1 first, then wave 2, skip wave 3 for now
  const candidates = TARGET_HANDLES
    .filter(t => t.tier <= 2 && !contactedSet.has(t.handle))

  if (candidates.length === 0) {
    return NextResponse.json({ status: 'all_contacted', count: contactedSet.size })
  }

  // Pick one randomly from available candidates
  const target = candidates[Math.floor(Math.random() * candidates.length)]

  // Find their latest tweet
  const tweets = await searchTweets(`from:${target.handle}`, 5)

  if (!tweets || tweets.length === 0) {
    // Record attempt so we don't retry endlessly
    await supabase.from('influencer_outreach').insert({
      handle: target.handle,
      name: target.name,
      tier: target.tier,
      status: 'no_tweets_found',
    })
    return NextResponse.json({ status: 'no_tweets', handle: target.handle })
  }

  // Pick a recent tweet (not a retweet if possible)
  const tweet = tweets[0]

  // Pick a random message template
  const templateIdx = Math.floor(Math.random() * REPLY_TEMPLATES.length)
  const message = REPLY_TEMPLATES[templateIdx](target.name)

  // Like their tweet first (friendly gesture)
  await likeTweet(tweet.id)

  // Reply
  const result = await replyToTweet(tweet.id, message)

  // Record in DB
  await supabase.from('influencer_outreach').insert({
    handle: target.handle,
    name: target.name,
    tier: target.tier,
    tweet_id: tweet.id,
    reply_id: result.id,
    template_idx: templateIdx,
    status: result.id ? 'sent' : 'failed',
    error: result.error ?? null,
  })

  return NextResponse.json({
    status: result.id ? 'sent' : 'failed',
    handle: target.handle,
    tweet: tweet.id,
    reply: result.id,
  })
}
