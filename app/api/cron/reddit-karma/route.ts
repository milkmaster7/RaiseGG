// Cron: Reddit karma builder
// Comments on popular posts + upvotes to build account karma
// Schedule: every 15 min — posts 1 comment per run (rate limit safe)
// vercel.json: "0,15,30,45 * * * *" or "*/15 * * * *"

import { NextResponse } from 'next/server'
import { isConfigured, getRedditToken } from '@/lib/reddit-poster'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 25

const REDDIT_API = 'https://oauth.reddit.com'
const UA = 'web:com.raisegg.app:v1.0.0'

// Subreddits to comment on (high traffic, easy karma)
const KARMA_SUBS = [
  'AskReddit', 'worldnews', 'gaming', 'todayilearned',
  'mildlyinteresting', 'Showerthoughts', 'news', 'funny',
  'pics', 'videos', 'movies', 'Music',
  'science', 'technology', 'sports', 'aww',
  'food', 'EarthPorn', 'space', 'dataisbeautiful',
  'explainlikeimfive', 'LifeProTips', 'GetMotivated',
  'nottheonion', 'UpliftingNews', 'memes',
]

// Natural-sounding comments per sub category
const COMMENT_BANK: Record<string, string[]> = {
  AskReddit: [
    'Saving this thread, some of these answers are genuinely brilliant.',
    'This is one of those questions that sounds simple but the more you think about it the more complex it gets.',
    'The diversity of answers here really shows how different everyone\'s experiences are. Love it.',
    'I\'ve been scrolling through this for 20 minutes now and I\'m not even close to done.',
    'Some of these responses genuinely changed my perspective. Reddit at its best.',
    'This thread is proof that AskReddit is still the best sub on this site.',
    'I never thought about it this way before. Great question.',
    'Why is this so relatable lmao',
  ],
  worldnews: [
    'The geopolitical implications of this are going to be felt for years.',
    'Context is everything with stories like this. Always read beyond the headline.',
    'This has been developing for a while now. Glad it\'s finally getting attention.',
    'I really hope more people pay attention to this. It matters.',
    'The comments here are more informative than most news articles I\'ve read on this.',
  ],
  news: [
    'This is a much bigger deal than most people realize.',
    'The fact that this isn\'t front page everywhere is concerning.',
    'Following this story closely. The developments keep getting more interesting.',
    'Really well reported. We need more journalism like this.',
  ],
  gaming: [
    'This brings back memories. Gaming was something else back then.',
    'The level of detail in this is actually insane when you zoom in.',
    'Still one of the most underrated games out there.',
    'This community finds the most incredible stuff. Never change.',
    'I\'ve been gaming for years and this is the first time I noticed that.',
    'The developers really outdid themselves with this one.',
  ],
  todayilearned: [
    'This is one of those facts I\'m definitely going to bring up in conversation later.',
    'How have I gone my entire life without knowing this?',
    'The rabbit hole on this topic is insanely deep. Worth reading more about.',
    'History is genuinely stranger than fiction sometimes.',
    'Just spent 30 minutes reading about this. Fascinating stuff.',
  ],
  mildlyinteresting: [
    'This is perfectly mildly interesting. Exactly what this sub is for.',
    'The little things in life really are the most fascinating sometimes.',
    'I would have walked right past this. Good eye!',
    'Nature is endlessly creative honestly.',
  ],
  Showerthoughts: [
    'You just broke my brain with this one.',
    'This is genuinely one of the best shower thoughts I\'ve seen.',
    'I\'m going to be thinking about this all day now.',
    'The simplest observations are always the most profound.',
    'Why does this make so much sense??',
  ],
  funny: [
    'I did NOT expect that ending lmao',
    'This got me way harder than it should have.',
    'I keep coming back to this and laughing every time.',
    'The timing on this is absolutely perfect.',
  ],
  science: [
    'This is a genuinely exciting development. The implications are huge.',
    'The methodology here is really solid. Great research.',
    'Been following this field for a while and this is a major step forward.',
  ],
  technology: [
    'The pace of progress here is honestly staggering.',
    'Really curious to see where this goes in the next few years.',
    'This is the kind of innovation that actually matters.',
  ],
  _default: [
    'This is exactly the kind of content I come to Reddit for.',
    'Underrated post. More people should see this.',
    'Great post, thanks for sharing this.',
    'The comments here are really adding to the discussion. Love this community.',
    'I\'ve been thinking about this exact thing lately. Glad someone posted about it.',
    'This deserves way more attention than it\'s getting.',
  ],
}

function pickComment(sub: string): string {
  const pool = COMMENT_BANK[sub] || COMMENT_BANK._default
  return pool[Math.floor(Math.random() * pool.length)]
}

async function redditFetch(token: string, endpoint: string, method = 'GET', body?: string) {
  const res = await fetch(`${REDDIT_API}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': UA,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  })
  return res.json()
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    return NextResponse.json({ error: 'Reddit not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    const token = await getRedditToken()

    // Pick a random sub from the list
    const now = new Date()
    const minuteSlot = now.getUTCHours() * 4 + Math.floor(now.getUTCMinutes() / 15)
    const sub = KARMA_SUBS[minuteSlot % KARMA_SUBS.length]

    // Get hot posts
    const hot = await redditFetch(token, `/r/${sub}/hot?limit=10`)
    const posts = hot?.data?.children || []

    let commented = false
    let upvoted = 0
    let commentedOn = ''
    let commentText = ''

    for (const post of posts) {
      const p = post.data
      if (!p || p.stickied || p.locked || p.archived) continue

      // Upvote every post
      try {
        await redditFetch(token, '/api/vote', 'POST',
          new URLSearchParams({ id: p.name, dir: '1' }).toString()
        )
        upvoted++
      } catch {}

      // Comment on ONE post per run (rate limit safe)
      if (!commented && p.num_comments > 5 && p.score > 50) {
        const comment = pickComment(sub)
        try {
          const result = await redditFetch(token, '/api/comment', 'POST',
            new URLSearchParams({
              thing_id: p.name,
              text: comment,
              api_type: 'json',
            }).toString()
          )

          const errors = (result as any)?.json?.errors
          if (!errors || errors.length === 0) {
            commented = true
            commentedOn = p.title.substring(0, 60)
            commentText = comment
          }
        } catch {}
      }

      // Also upvote some top comments
      if (upvoted <= 3) {
        try {
          const commentsData = await redditFetch(token, `/comments/${p.id}?limit=3&sort=top`)
          const topComments = commentsData?.[1]?.data?.children || []
          for (const c of topComments.slice(0, 2)) {
            if (c.data?.name) {
              await redditFetch(token, '/api/vote', 'POST',
                new URLSearchParams({ id: c.data.name, dir: '1' }).toString()
              )
            }
          }
        } catch {}
      }
    }

    const summary = commented
      ? `r/${sub}: upvoted ${upvoted}, commented on "${commentedOn}" — "${commentText.substring(0, 40)}..."`
      : `r/${sub}: upvoted ${upvoted}, no comment (rate limited or no suitable post)`

    await recordCronRun('reddit-karma', 'ok', {
      message: summary,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      sub,
      upvoted,
      commented,
      commentedOn,
      summary,
    })
  } catch (err) {
    await recordCronRun('reddit-karma', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
