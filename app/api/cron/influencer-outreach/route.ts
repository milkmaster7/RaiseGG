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
import { searchTweets, replyToTweet, likeTweet, sendDM, getUserIdByHandle } from '@/lib/twitter'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'edge'
export const maxDuration = 30

// ── Casual reply templates (rotate to avoid spam detection) ──────────────

// Public replies — mix of pure engagement and soft DM nudges.
// ~50% just casual engagement, ~50% with DM nudge. Keeps it natural.
const REPLY_TEMPLATES = [
  // Pure engagement — no mention of DMs
  { text: () => `clean 🔥`, nudge: false },
  { text: () => `that play was nasty 💀`, nudge: false },
  { text: () => `W content as always`, nudge: false },
  { text: () => `sheesh 🎯`, nudge: false },
  { text: () => `underrated account fr`, nudge: false },
  { text: () => `bro doesn't miss`, nudge: false },
  { text: () => `facts`, nudge: false },
  { text: () => `the game needs more of this`, nudge: false },
  { text: () => `actual good take`, nudge: false },
  { text: () => `this clip is insane`, nudge: false },
  { text: () => `finally someone said it 💯`, nudge: false },
  { text: () => `respect the grind 💪`, nudge: false },
  // DM nudge — casual + check DMs
  { text: () => `clean 🔥 yo check your DMs real quick`, nudge: true },
  { text: () => `W content. hey check DMs when you get a sec 🤝`, nudge: true },
  { text: () => `sheesh 🎯 dropped you a message`, nudge: true },
  { text: () => `bro doesn't miss 🔥 check your DMs`, nudge: true },
  { text: () => `big W. check DMs when you can 👊`, nudge: true },
  { text: () => `actual good take 💯 DM'd you real quick`, nudge: true },
]

// DM templates — the actual pitch. Private only.
const DM_TEMPLATES = [
  (name: string) =>
    `hey ${name}! we're building raisegg.com — CS2 & Dota 2 1v1 stake matches for real money (USDC). blockchain escrow, instant payouts.\n\nwe're looking for creators to try it out and post about it. paid ofc. what would something like that cost with you?`,

  (name: string) =>
    `yo ${name} — we run a competitive staking platform for CS2/Dota2. players bet on themselves in 1v1s, winner takes 90%.\n\nlooking for people to showcase it. interested in a paid collab? what's your rate?`,

  (name: string) =>
    `hey ${name}, quick one — we built raisegg.com, a skill-based wager platform for CS2 & Dota 2. think matchmaking but with real money on the line.\n\nwould you be open to a paid promo? what do you usually charge?`,
]

// ── Target handles (from influencer research) ────────────────────────────

const TARGET_HANDLES = [
  // Wave 1 — small accounts only. Engage publicly, DM privately later.
  // Turkey
  { handle: 'csgomini', name: 'mini', lang: 'tr', tier: 1 },
  { handle: 'rammus53', name: 'rammus', lang: 'tr', tier: 1 },
  { handle: 'cs2turkiye', name: 'CS2 Turkiye', lang: 'tr', tier: 1 },
  { handle: 'csgoturkiyewp', name: 'CSGO Turkiye', lang: 'tr', tier: 1 },
  { handle: 'KegriClips', name: 'Kegri', lang: 'tr', tier: 1 },
  { handle: 'export2turkey', name: 'CS Turkey', lang: 'tr', tier: 1 },
  { handle: 'csturkeycom', name: 'CS Turkey Com', lang: 'tr', tier: 1 },
  { handle: 'TSLFaceit', name: 'TSL', lang: 'tr', tier: 1 },
  { handle: 'wicadiacs', name: 'wicadiacs', lang: 'tr', tier: 1 },
  { handle: 'hmzsnmz_', name: 'hmz', lang: 'tr', tier: 1 },
  { handle: 'Dota2TUR', name: 'Dota2 TR', lang: 'tr', tier: 1 },
  // Balkans
  { handle: 'balkancspro', name: 'Balkan CS', lang: 'en', tier: 1 },
  { handle: 'EsportsBulgaria', name: 'Esports BG', lang: 'bg', tier: 1 },
  { handle: 'Team_Bulgaria_', name: 'Team BG', lang: 'bg', tier: 1 },
  { handle: 'croatia_team', name: 'Croatia', lang: 'hr', tier: 1 },
  { handle: 'FESKEsports', name: 'FESK', lang: 'en', tier: 1 },
  { handle: 'XPortalesports', name: 'XPortal', lang: 'en', tier: 1 },
  { handle: 'oxygenncs', name: 'oxygen', lang: 'bg', tier: 1 },
  // CIS
  { handle: 'CS2CIS', name: 'CS2 CIS', lang: 'ru', tier: 1 },
  { handle: 'dota2ukraine', name: 'Dota2 UA', lang: 'ru', tier: 1 },
  { handle: 'cisdota2', name: 'CIS Dota', lang: 'ru', tier: 1 },
  { handle: 'dimasickCSGO', name: 'dimasick', lang: 'ru', tier: 1 },
  // Caucasus
  { handle: 'azesfederation', name: 'AZ Esports', lang: 'az', tier: 1 },
  // Global CS2 community
  { handle: 'Minaleyy_CS2', name: 'Minaleyy', lang: 'en', tier: 1 },
  { handle: 'Ozzny_CS2', name: 'Ozzny', lang: 'en', tier: 1 },
  { handle: 'iamcs2kitchen', name: 'CS2 Kitchen', lang: 'en', tier: 1 },
  { handle: 'ThourCS2', name: 'Thour', lang: 'en', tier: 1 },
  { handle: 'cavebets', name: 'Cave', lang: 'en', tier: 1 },
  { handle: 'CTBets1', name: 'CT Bets', lang: 'en', tier: 1 },
  { handle: 'csgopred', name: 'CSGO Pred', lang: 'en', tier: 1 },

  // Wave 2 & 3 — LOCKED. User will say when.
  // { handle: 'rootthegamer', name: 'root', lang: 'tr', tier: 2 },
  // { handle: 'CalyxCSGO', name: 'Calyx', lang: 'tr', tier: 2 },
  // { handle: 'FlankEsports', name: 'Flank', lang: 'tr', tier: 2 },
  // { handle: 'AlexaTvv', name: 'Alexa', lang: 'ro', tier: 2 },
  // { handle: 'XANTAREScsgo', name: 'XANTARES', lang: 'tr', tier: 3 },
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

  // Tier 1 only — wave 2 & 3 locked until user says go
  const candidates = TARGET_HANDLES
    .filter(t => t.tier === 1 && !contactedSet.has(t.handle))

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

  // Step 1: Like their tweet
  await likeTweet(tweet.id)

  // Step 2: Get their user ID for DM
  const targetUserId = await getUserIdByHandle(target.handle)

  // Step 3: Send DM with the business pitch
  let dmSent = false
  let dmError: string | null = null
  if (targetUserId) {
    const dmIdx = Math.floor(Math.random() * DM_TEMPLATES.length)
    const dmText = DM_TEMPLATES[dmIdx](target.name)
    const dmResult = await sendDM(targetUserId, dmText)
    dmSent = dmResult.sent
    dmError = dmResult.error ?? null
  }

  // Step 4: Pick reply — only use DM nudge templates if DM actually went through
  const pool = dmSent
    ? REPLY_TEMPLATES  // can use any (including "check DMs")
    : REPLY_TEMPLATES.filter(t => !t.nudge)  // pure engagement only
  const pick = pool[Math.floor(Math.random() * pool.length)]
  const message = pick.text()

  // Step 5: Reply publicly
  const result = await replyToTweet(tweet.id, message)

  // Record in DB
  await supabase.from('influencer_outreach').insert({
    handle: target.handle,
    name: target.name,
    tier: target.tier,
    tweet_id: tweet.id,
    reply_id: result.id,
    template_idx: 0,
    dm_sent: dmSent,
    dm_error: dmError,
    status: result.id ? 'sent' : 'failed',
    error: result.error ?? null,
  })

  return NextResponse.json({
    status: result.id ? 'sent' : 'failed',
    handle: target.handle,
    tweet: tweet.id,
    reply: result.id,
    dm_sent: dmSent,
  })
}
