// Cron: Reddit weekly contest
// Posts "Clip of the Week" contest every Sunday, announces previous winner
// Schedule: 0 14 * * 0 (Sunday 2pm UTC)

import { NextResponse } from 'next/server'
import { isConfigured, submitPost, submitComment } from '@/lib/reddit-poster'
import {
  SUBREDDIT_NAME,
  postToOwnSubreddit,
  stickyPost,
  distinguishAsmod,
} from '@/lib/reddit-community'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 30

// ─── Contest themes (rotates weekly) ──────────────────────────────────────

interface ContestTheme {
  title: string
  body: string
  stickyComment: string
}

const CONTEST_THEMES: ContestTheme[] = [
  {
    title: '🏆 Weekly Contest: Best CS2 Clip — Win Community Recognition!',
    body: `# This Week's Contest: Best CS2 Clip

**Post your sickest CS2 clip from this week.**

## Rules:
1. Must be your own gameplay
2. Clips from RaiseGG matches get bonus points 🔥
3. Any format: 1v1 clutch, eco ace, insane spray transfer, wallbang, etc.
4. Post as a comment in this thread (link to YouTube, Streamable, Medal, or Reddit video)
5. **Most upvoted clip by next Sunday wins!**

## Prize:
- Featured in next week's recap
- Special "Clip Champion" recognition
- Bragging rights for your city 🏙️

## How to get clips:
- Play on [RaiseGG](https://raisegg.com/play) — our servers record demos
- Use Medal, ShadowPlay, or OBS to capture
- Upload anywhere and link it here

---

*Previous winners are featured in our wiki. Keep grinding!*`,
    stickyComment: `**📋 Contest Rules:**\n\n1. One clip per person\n2. Must be from this week\n3. Upvotes decide the winner\n4. Winner announced next Sunday\n5. No vote manipulation\n\n**Good luck! 🎮**`,
  },
  {
    title: '🏆 Weekly Contest: Best Dota 2 Play — Show Us Your Skills!',
    body: `# This Week's Contest: Best Dota 2 Play

**Post your most insane Dota 2 play from this week.**

## What counts:
- 1v1 mid outplays
- Clutch team fight moments
- Insane escapes
- Big brain plays
- Stake match wins (extra spicy 🌶️)

## Rules:
1. Your own gameplay only
2. Link your clip as a comment below
3. Most upvoted wins by next Sunday
4. RaiseGG match clips get bonus clout

## Prize:
- Featured in weekly recap
- Community recognition
- Your city gets the glory

[Play Dota 2 1v1 mid on RaiseGG](https://raisegg.com/play)

---

*Post your plays below! 👇*`,
    stickyComment: `**This week's theme: Dota 2 plays!** 🎯\n\n1v1 mid clips from RaiseGG are especially welcome. Show us what you got!\n\nUpvote your favorites — winner announced next Sunday.`,
  },
  {
    title: '🏆 Weekly Contest: Biggest Upset — Underdog Stories Welcome',
    body: `# This Week's Contest: Biggest Upset

**Tell us about a match where you (or someone) pulled off an insane upset.**

## Format:
- **Game:** CS2 / Dota 2 / Deadlock
- **What happened:** The story
- **Clip/screenshot:** (optional but helps)
- **Stake:** Free tournament or $X USDC match

## What we're looking for:
- Lower-ranked player beating a higher-ranked one
- Comeback from impossible situations
- Eco round aces
- 1v5 clutches when everyone counted you out
- First-time players winning their first tournament

## Prize:
- Featured in weekly recap
- Community recognition
- Underdog crown 👑

[Try your luck in a free tournament](https://raisegg.com/tournaments)

---

*Everyone loves an upset. Share yours below!*`,
    stickyComment: `**🎲 Underdog stories are the best stories.**\n\nWhether you won $5 in a free tournament or pulled off a clutch in a stake match — we want to hear it.\n\nMost upvoted story wins! No clip required, great storytelling counts too.`,
  },
  {
    title: '🏆 Weekly Contest: Best City Rivalry Moment',
    body: `# This Week's Contest: Best City Rivalry Moment

**Which city produced the best gaming moment this week?**

## Share:
- Your city vs another city — who won?
- Trash talk that turned into an actual match
- Players from small cities beating big city players
- Any "my city > your city" moments

## Rules:
1. Must involve some element of city/country pride
2. Clips, screenshots, or stories all welcome
3. Most upvoted wins
4. Keep it friendly — rivalry, not hate

## Why city rivalries matter:
On RaiseGG, every match you play earns points for your city. The [City Leaderboard](https://raisegg.com/leaderboard) tracks which city has the best gamers.

Istanbul vs Ankara. Belgrade vs Bucharest. Moscow vs St. Petersburg. Who's actually the best?

[Rep your city](https://raisegg.com/play)

---

*Winner gets featured + their city gets a shoutout!*`,
    stickyComment: `**🏙️ Which city is on top this week?**\n\nCheck the [City Leaderboard](https://raisegg.com/leaderboard) and share your city's wins!\n\nBest story/clip wins the contest. Upvote your favorites!`,
  },
]

// ─── Route handler ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('reddit-contest', 'error', { message: 'Reddit not configured' })
    return NextResponse.json({ error: 'Reddit not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    // Pick theme based on week of year
    const now = new Date()
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    const weekOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 86400000))
    const theme = CONTEST_THEMES[weekOfYear % CONTEST_THEMES.length]

    // Post the contest thread
    let result = await postToOwnSubreddit(theme.title, theme.body, 'Tournament')
    let postedTo = SUBREDDIT_NAME

    if (!result.ok) {
      // Fallback to gaming subs
      const fallbacks = ['esports', 'CompetitiveGaming', 'cs2', 'CryptoGaming']
      for (const sub of fallbacks) {
        const fallbackResult = await submitPost(sub, theme.title, theme.body, 'self')
        if (fallbackResult.ok) {
          result = { ok: true, postUrl: fallbackResult.postUrl, postId: fallbackResult.postId }
          postedTo = sub
          break
        }
      }
    }

    if (!result.ok) {
      await recordCronRun('reddit-contest', 'error', {
        message: `Failed: ${result.error}`,
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Sticky as #2 (daily thread is #1) on our own sub
    if (postedTo === SUBREDDIT_NAME && result.postId) {
      await stickyPost(result.postId, true, 2)
    }

    // Add sticky rules comment
    if (result.postId) {
      const commentRes = await submitComment(result.postId, theme.stickyComment)
      if (commentRes.ok && commentRes.commentId) {
        await distinguishAsmod(commentRes.commentId, 'yes', true)
      }
    }

    const summary = `Contest posted to r/${postedTo}: "${theme.title}" — ${result.postUrl}`
    await recordCronRun('reddit-contest', 'ok', {
      message: summary,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      subreddit: postedTo,
      title: theme.title,
      postUrl: result.postUrl,
    })
  } catch (err) {
    await recordCronRun('reddit-contest', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
