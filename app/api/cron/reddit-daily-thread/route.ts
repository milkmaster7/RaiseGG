// Cron: Reddit daily recurring threads
// Posts a themed daily thread to r/RaiseGG (or fallback subs)
// Schedule: 0 12 * * * (noon UTC daily)
// Mon=Match Results, Tue=Trash Talk, Wed=WAYPW, Thu=Tips, Fri=Tournament, Sat=Clips, Sun=Leaderboard

import { NextResponse } from 'next/server'
import { isConfigured, submitPost, submitComment, submitPoll } from '@/lib/reddit-poster'
import {
  SUBREDDIT_NAME,
  postToOwnSubreddit,
  stickyPost,
  distinguishAsmod,
} from '@/lib/reddit-community'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 30

// ─── Thread definitions ───────────────────────────────────────────────────

interface DailyThread {
  day: number // 0=Sun, 1=Mon, ..., 6=Sat
  title: string
  body: string | (() => Promise<string>)
  flair: string
  stickyComment: string
  isPoll?: boolean
  pollOptions?: string[]
}

async function getLeaderboardBody(): Promise<string> {
  try {
    const supabase = createServiceClient()

    const { data: topPlayers } = await supabase
      .from('players')
      .select('username, city, country, elo_cs2, cs2_wins')
      .order('cs2_wins', { ascending: false })
      .limit(10)

    const { data: matchData } = await supabase
      .from('matches')
      .select('id', { count: 'exact' })

    const playerList = topPlayers?.length
      ? topPlayers.map((p, i) =>
          `${i + 1}. **${p.username}** — ${p.city || p.country || 'Unknown'} — ${p.cs2_wins} wins (ELO: ${p.elo_cs2})`
        ).join('\n')
      : '*No players yet — be the first!*'

    const totalMatches = matchData?.length ?? 0

    return `# Weekly Leaderboard & City Rankings

## Top 10 Players This Week

${playerList}

## Stats
- **Total matches played:** ${totalMatches}
- **Games:** CS2, Dota 2, Deadlock

## City Rankings
Check the live city leaderboard: [raisegg.com/leaderboard](https://raisegg.com/leaderboard)

Which city is #1 this week? Rep your city in the comments!

---

## How to Climb
- Win matches → earn ELO → climb the leaderboard
- Free daily tournaments at 3 PM UTC
- Every win counts for your city's ranking

[Play Now](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments)

---

*Rankings reset every Monday. This thread is posted automatically every Sunday.*`
  } catch {
    return `# Weekly Leaderboard & City Rankings

Check the live leaderboard: [raisegg.com/leaderboard](https://raisegg.com/leaderboard)

## This Week's Challenge
Which city will claim the #1 spot? Istanbul? Belgrade? Bucharest? Moscow?

**Drop your city below and let's see who's representing!**

Free daily tournaments at 3 PM UTC — every win earns points for your city.

[Play Now](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments)

---

*Rankings reset every Monday.*`
  }
}

const DAILY_THREADS: DailyThread[] = [
  // Sunday (0)
  {
    day: 0,
    title: '📊 Weekly Leaderboard & City Rankings — Who\'s #1?',
    flair: 'Leaderboard',
    body: getLeaderboardBody,
    stickyComment: `**How city rankings work:**\n\n- Win a match → +3 points for your city\n- Win a tournament → +10 points\n- Set your city at [raisegg.com/profile](https://raisegg.com/profile)\n\nTop 3 cities get special recognition next week!`,
  },
  // Monday (1)
  {
    day: 1,
    title: '🏆 Match Result Monday — Share Your Wins, Losses & Clutch Moments',
    flair: 'Match Result',
    body: `# Match Result Monday

**Share your matches from this week!**

Whether you won $20 in a stake match, clutched a 1v1, or got absolutely destroyed — post it here.

## Format (optional):
- **Game:** CS2 / Dota 2 / Deadlock
- **Mode:** 1v1 / 2v2 / 5v5
- **Stake:** Free tournament / $X USDC
- **Result:** W/L
- **Highlight:** What happened?

## Why share?
- Best stories get upvoted to the top
- We feature the best plays in our weekly recap
- Flex on the community (or share your pain)

---

[Play a match now](https://raisegg.com/play) | [Free tournaments daily at 3 PM UTC](https://raisegg.com/tournaments)

*This thread is posted every Monday. Share everything!*`,
    stickyComment: `**New here?** RaiseGG is a competitive gaming platform for CS2, Dota 2, and Deadlock. Play 1v1 matches for USDC with blockchain escrow, or join free daily tournaments.\n\n[Get Started](https://raisegg.com) | [How It Works](https://www.reddit.com/r/RaiseGG/wiki/escrow)`,
  },
  // Tuesday (2)
  {
    day: 2,
    title: '🗣️ Trash Talk Tuesday — Your City vs Everyone Else',
    flair: 'City Rivalry',
    body: `# Trash Talk Tuesday

**Rules: Talk trash about other cities' gaming skills. Defend your own. No actual hate.**

This is friendly competition. Which city/country has the best gamers?

Some talking points:
- Istanbul thinks they run CS2 — do they?
- Belgrade vs Bucharest — eternal rivalry
- Moscow and St. Petersburg can't agree on anything, including who's better at Dota
- Athens has been quiet... too quiet
- Tbilisi is coming up fast

## How to back it up
Play a match on RaiseGG and prove your city is the best. Every win counts for your city's leaderboard.

[City Leaderboard](https://raisegg.com/leaderboard) | [Free Tournament](https://raisegg.com/tournaments)

---

*Talk trash, but keep it gaming-related. This thread is posted every Tuesday.*`,
    stickyComment: `**Remember:** This is friendly trash talk about gaming skills. No actual hate speech, discrimination, or personal attacks. Keep it about the games! 🎮`,
  },
  // Wednesday (3)
  {
    day: 3,
    title: '🎮 What Are You Playing Wednesday — CS2, Dota 2, or Deadlock?',
    flair: 'Discussion',
    body: `# What Are You Playing Wednesday?

**What's your game this week?**

- Grinding CS2 ranked?
- Spamming Dota 2 1v1 mids?
- Trying Deadlock for the first time?
- Something else entirely?

## Questions:
1. What game are you playing the most right now?
2. What's your current rank/MMR?
3. What's your goal for this week?
4. Any game you're thinking about switching to?

## On RaiseGG this week:
- Free daily tournaments at 3 PM UTC
- 1v1 stake matches available 24/7
- New city leaderboard standings

[Play Now](https://raisegg.com/play)

---

*This thread is posted every Wednesday.*`,
    stickyComment: `**Poll: What's your main game?**\n\nUpvote the comment below that matches your main game, or reply with something else!`,
  },
  // Thursday (4)
  {
    day: 4,
    title: '💡 Tips & Tricks Thursday — Share Your Best Strats',
    flair: 'Guide',
    body: `# Tips & Tricks Thursday

**Share a tip that made you a better player.**

Any game, any skill level. Could be:
- A CS2 smoke/flash you just learned
- A Dota 2 lane trick that wins you the first 5 minutes
- A Deadlock combo that people don't expect
- Mental game advice for playing under pressure
- How to manage economy in 1v1s

## This Week's Topic: **Playing Under Pressure**
How do you stay calm when there's money on the line? Stake matches hit different when it's your own USDC.

Share your strategies for keeping your cool.

---

[Practice for free](https://raisegg.com/tournaments) | [Wiki: Tips](https://www.reddit.com/r/RaiseGG/wiki/getting-started)

*This thread is posted every Thursday.*`,
    stickyComment: `**Tip of the week from the community will be featured in next Sunday's recap!** Drop your best tip below. 👇`,
  },
  // Friday (5)
  {
    day: 5,
    title: '🏟️ Free Tournament Friday — Sign Up for Today\'s Tournament!',
    flair: 'Tournament',
    body: `# Free Tournament Friday!

**Today's free tournament starts at 3 PM UTC.**

## Details:
- **Entry:** FREE — no deposit needed
- **Prize:** $5 USDC to the winner
- **Format:** 8-player single elimination, BO1
- **Games:** CS2 1v1
- **Servers:** EU (Frankfurt/Istanbul)
- **Anti-cheat:** VAC + MatchZy

## How to Join:
1. Go to [raisegg.com/tournaments](https://raisegg.com/tournaments)
2. Click "Join Tournament"
3. Show up at 3 PM UTC
4. Win $5 USDC

## Weekend Schedule:
- Friday 3 PM UTC — CS2 1v1
- Saturday 3 PM UTC — Dota 2 1v1 mid
- Sunday 3 PM UTC — CS2 1v1

**Who's joining today?** Drop a comment!

---

*This thread is posted every Friday.*`,
    stickyComment: `**🚨 Tournament starts at 3 PM UTC today!**\n\n[Sign up here](https://raisegg.com/tournaments)\n\nGood luck everyone! 🎮`,
  },
  // Saturday (6)
  {
    day: 6,
    title: '🎬 Clip of the Week — Post Your Best Plays!',
    flair: 'Clip / Highlight',
    body: `# Clip of the Week

**Post your best gaming clips from this week!**

Any game, any format:
- Insane CS2 clutches
- Dota 2 outplays
- Deadlock highlights
- Tournament moments
- Stake match wins (with reactions!)

## How to post:
- Upload to Reddit, YouTube, Streamable, Medal, or any clip platform
- Include the game and context
- Bonus points for stake match clips (nothing hits like winning money)

## Weekly Winner
The most upvoted clip by next Saturday gets featured in the weekly recap and earns community recognition!

---

[Play a match](https://raisegg.com/play) | [Record your next clutch](https://raisegg.com/tournaments)

*This thread is posted every Saturday.*`,
    stickyComment: `**🏆 Clip of the Week Contest!**\n\nMost upvoted clip by next Saturday wins a shoutout in the weekly recap.\n\nUpvote your favorites! Quality > quantity. 🎬`,
  },
]

// ─── Fallback subs for when r/RaiseGG isn't available ─────────────────────

const FALLBACK_SUBS_BY_DAY: Record<number, string[]> = {
  0: ['esports', 'CompetitiveGaming'],      // Sunday — Leaderboard
  1: ['cs2', 'GlobalOffensive'],             // Monday — Match Results
  2: ['balkans_irl', 'AskBalkans'],          // Tuesday — Trash Talk
  3: ['pcgaming', 'Games'],                  // Wednesday — WAYPW
  4: ['learndota2', 'TrueDoTA2'],            // Thursday — Tips
  5: ['esports', 'CompetitiveGaming'],       // Friday — Tournament
  6: ['cs2', 'GlobalOffensive'],             // Saturday — Clips
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('reddit-daily-thread', 'error', { message: 'Reddit not configured' })
    return NextResponse.json({ error: 'Reddit not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    const dayOfWeek = new Date().getUTCDay() // 0=Sun ... 6=Sat
    const thread = DAILY_THREADS.find(t => t.day === dayOfWeek)

    if (!thread) {
      return NextResponse.json({ error: 'No thread for today' }, { status: 400 })
    }

    // Resolve body (may be async function for Supabase data)
    const body = typeof thread.body === 'function' ? await thread.body() : thread.body

    // Try posting to r/RaiseGG first
    let result = await postToOwnSubreddit(thread.title, body, thread.flair)
    let postedTo = SUBREDDIT_NAME

    // Fallback to relevant gaming subs
    if (!result.ok) {
      const fallbacks = FALLBACK_SUBS_BY_DAY[dayOfWeek] || ['esports']
      for (const sub of fallbacks) {
        const fallbackResult = await submitPost(sub, thread.title, body, 'self')
        if (fallbackResult.ok) {
          result = { ok: true, postUrl: fallbackResult.postUrl, postId: fallbackResult.postId }
          postedTo = sub
          break
        }
      }
    }

    if (!result.ok) {
      await recordCronRun('reddit-daily-thread', 'error', {
        message: `Failed to post daily thread: ${result.error}`,
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Sticky the post if we're on our own sub
    if (postedTo === SUBREDDIT_NAME && result.postId) {
      await stickyPost(result.postId, true, 1)
    }

    // Add the sticky comment
    if (result.postId && thread.stickyComment) {
      const { submitComment: sc } = await import('@/lib/reddit-poster')
      const commentRes = await sc(result.postId, thread.stickyComment)
      if (commentRes.ok && commentRes.commentId) {
        // Distinguish as mod and sticky the comment
        await distinguishAsmod(commentRes.commentId, 'yes', true)
      }
    }

    const summary = `Daily thread posted to r/${postedTo}: "${thread.title}" — ${result.postUrl}`
    await recordCronRun('reddit-daily-thread', 'ok', {
      message: summary,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      day: dayOfWeek,
      subreddit: postedTo,
      title: thread.title,
      postUrl: result.postUrl,
      postId: result.postId,
    })
  } catch (err) {
    await recordCronRun('reddit-daily-thread', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
