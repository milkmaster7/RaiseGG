/**
 * Cron: Twitter/X engagement bot
 * Searches for popular CS2/Dota2/Deadlock tweets, likes them, replies helpfully,
 * follows relevant accounts. This is the #1 growth strategy on X.
 *
 * Schedule: Every 4 hours (6x/day)
 */

import { NextResponse } from 'next/server'
import { searchTweets, likeTweet, replyToTweet, retweet, followUser } from '@/lib/twitter'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 60

// ─── Search queries (rotates each run) ────────────────────────────────────

const SEARCH_QUERIES = [
  // CS2 conversations
  'CS2 tournament -is:retweet lang:en',
  'CS2 1v1 -is:retweet',
  '"counter strike 2" competitive -is:retweet',
  'CS2 ranked -is:retweet lang:en',
  'CS2 tips -is:retweet',
  'CS2 matchmaking -is:retweet',
  'CS2 skins trade -is:retweet',

  // Dota 2 conversations
  'Dota 2 tournament -is:retweet lang:en',
  'Dota 2 1v1 mid -is:retweet',
  'Dota 2 ranked -is:retweet',
  'Dota 2 MMR -is:retweet',

  // Deadlock
  'Deadlock Valve -is:retweet',
  'Deadlock competitive -is:retweet',

  // Esports general
  'esports tournament free -is:retweet',
  'esports wager -is:retweet',
  'esports betting -is:retweet',

  // Regional
  'CS2 Turkey -is:retweet',
  'esports Balkans -is:retweet',
  'CS2 CIS -is:retweet',

  // Crypto gaming
  'crypto esports -is:retweet',
  'blockchain gaming tournament -is:retweet',
  'USDC esports -is:retweet',
]

// ─── Reply templates (contextual) ─────────────────────────────────────────

const REPLIES: Record<string, string[]> = {
  tournament: [
    'Free daily CS2 tournaments on raisegg.com — $5 USDC prize, no entry fee. Anti-cheat included',
    'If you\'re into tournaments, raisegg.com runs free ones daily with real USDC prizes',
    'We run free CS2 + Dota 2 tournaments daily at raisegg.com — $5 USDC prize pool, 8 players',
  ],
  competitive: [
    'If you want to play for real stakes, raisegg.com has 1v1 matches with blockchain escrow — no scams possible',
    'Competitive players should check raisegg.com — stake matches with on-chain escrow + anti-cheat',
    'For real competitive play, raisegg.com lets you stake USDC on your matches. Blockchain escrow keeps it fair',
  ],
  matchmaking: [
    'Looking for competitive matches? raisegg.com has 1v1 and 5v5 with real money stakes + anti-cheat',
    'raisegg.com is good for this — 1v1 or team matches, USDC stakes, blockchain escrow',
  ],
  skill: [
    'Put your rank where your mouth is — raisegg.com lets you stake real money on your CS2/Dota matches',
    'If your aim is that good, prove it on raisegg.com — 1v1 for USDC with blockchain escrow',
  ],
  betting: [
    'Instead of betting on pros, play for real money yourself on raisegg.com — blockchain escrow, anti-cheat, instant payouts',
    'Rather than betting, why not stake on your own skill? raisegg.com — 1v1 for USDC, escrow protects both sides',
  ],
  crypto: [
    'raisegg.com combines crypto + esports — stake USDC on your CS2/Dota2 matches, blockchain escrow, instant payouts',
    'This is what we\'re building at raisegg.com — crypto-esports with on-chain escrow. Free tournaments daily too',
  ],
  general: [
    'Nice! Check out raisegg.com if you haven\'t — free daily tournaments + stake matches for CS2, Dota 2, Deadlock',
    'CS2 + Dota 2 + Deadlock tournaments daily at raisegg.com — free entry, real USDC prizes',
  ],
}

/** Pick reply category based on tweet text */
function pickCategory(text: string): string {
  const lower = text.toLowerCase()
  if (/tournament|bracket|signup|entry fee|prize pool/i.test(lower)) return 'tournament'
  if (/competitive|pro|elite|premier|major/i.test(lower)) return 'competitive'
  if (/matchmaking|lfg|looking for|queue|lobby/i.test(lower)) return 'matchmaking'
  if (/rank|mmr|elo|level \d|global elite|faceit/i.test(lower)) return 'skill'
  if (/bet|wager|stake|predict|odds/i.test(lower)) return 'betting'
  if (/crypto|blockchain|usdc|solana|web3|token/i.test(lower)) return 'crypto'
  return 'general'
}

/** Pick a random item */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    // Pick 2 random search queries per run
    const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5)
    const queries = shuffled.slice(0, 2)

    const results: Array<{
      query: string
      found: number
      liked: number
      replied: number
      retweeted: number
      followed: number
      errors: string[]
    }> = []

    for (const query of queries) {
      const tweets = await searchTweets(query, 10)
      let liked = 0, replied = 0, retweeted = 0, followed = 0
      const errors: string[] = []

      // Sort by engagement — reply to popular tweets for maximum visibility
      const sorted = tweets
        .filter(t => !t.text.toLowerCase().includes('raisegg')) // Don't reply to our own mentions
        .sort((a, b) => {
          const aScore = (a.metrics?.like_count ?? 0) + (a.metrics?.retweet_count ?? 0) * 3
          const bScore = (b.metrics?.like_count ?? 0) + (b.metrics?.retweet_count ?? 0) * 3
          return bScore - aScore
        })

      // Like the top 5 tweets
      for (const tw of sorted.slice(0, 5)) {
        const ok = await likeTweet(tw.id)
        if (ok) liked++
        await new Promise(r => setTimeout(r, 1000))
      }

      // Reply to the top 2 most popular tweets
      for (const tw of sorted.slice(0, 2)) {
        const category = pickCategory(tw.text)
        const replyText = pick(REPLIES[category])

        const replyId = await replyToTweet(tw.id, replyText)
        if (replyId) {
          replied++
        } else {
          errors.push(`Reply failed on ${tw.id}`)
        }
        await new Promise(r => setTimeout(r, 2000))
      }

      // Retweet the #1 most popular tweet (if it has good engagement)
      if (sorted.length > 0 && (sorted[0].metrics?.like_count ?? 0) >= 5) {
        const ok = await retweet(sorted[0].id)
        if (ok) retweeted++
      }

      // Follow authors of top tweets
      for (const tw of sorted.slice(0, 3)) {
        if (tw.authorId) {
          const ok = await followUser(tw.authorId)
          if (ok) followed++
          await new Promise(r => setTimeout(r, 1000))
        }
      }

      results.push({
        query,
        found: tweets.length,
        liked,
        replied,
        retweeted,
        followed,
        errors,
      })

      // Wait between queries
      await new Promise(r => setTimeout(r, 3000))
    }

    const totalLiked = results.reduce((s, r) => s + r.liked, 0)
    const totalReplied = results.reduce((s, r) => s + r.replied, 0)
    const totalFollowed = results.reduce((s, r) => s + r.followed, 0)

    await recordCronRun('twitter-engage', 'ok', {
      message: `Searched ${queries.length} queries, liked ${totalLiked}, replied ${totalReplied}, followed ${totalFollowed}`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    await recordCronRun('twitter-engage', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
