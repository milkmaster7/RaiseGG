// Cron: Reddit comment monitor
// Searches key subreddits for posts mentioning stake gaming keywords.
// Runs every 6 hours — logs found posts for organic comment opportunities.
// Schedule: 0 */6 * * *

import { NextResponse } from 'next/server'
import { isConfigured, searchPosts, type RedditPost } from '@/lib/reddit-poster'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 60

// ─── Search config ─────────────────────────────────────────────────────────

const SEARCH_SUBREDDITS = [
  'GlobalOffensive',
  'cs2',
  'DotA2',
  'DeadlockTheGame',
  'esports',
  'CryptoCurrency',
  'pcgaming',
] as const

const SEARCH_QUERIES = [
  'stake match',
  'CS2 money',
  'wager CS2',
  '1v1 money',
  'esports betting',
  'FACEIT alternative',
  'CS2 1v1',
  'play for money',
  'wager match',
  'skill based betting',
  'crypto gaming',
  'blockchain esports',
] as const

// ─── Dedup helper ──────────────────────────────────────────────────────────

function deduplicatePosts(posts: RedditPost[]): RedditPost[] {
  const seen = new Set<string>()
  return posts.filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('reddit-monitor', 'error', { message: 'Reddit not configured' })
    return NextResponse.json({ error: 'Reddit not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    const allFound: Array<{
      subreddit: string
      query: string
      post: {
        id: string
        title: string
        permalink: string
        author: string
        score: number
        num_comments: number
        created_utc: number
      }
    }> = []

    let searchCount = 0
    let errorCount = 0

    // Search each subreddit with each query
    // Limit to avoid rate limits: max 3 queries per subreddit per run
    for (const subreddit of SEARCH_SUBREDDITS) {
      // Pick 3 queries to search this run (rotate based on hour)
      const hour = new Date().getUTCHours()
      const queryOffset = (hour / 6) | 0 // 0-3
      const queriesForThisRun = SEARCH_QUERIES
        .slice(queryOffset * 3, queryOffset * 3 + 3)
        .filter(Boolean)

      if (queriesForThisRun.length === 0) continue

      for (const query of queriesForThisRun) {
        searchCount++

        const result = await searchPosts(subreddit, query, 'new', 5)

        if (!result.ok) {
          errorCount++
          continue
        }

        if (result.posts && result.posts.length > 0) {
          for (const post of result.posts) {
            // Skip our own posts
            if (post.author.toLowerCase() === (process.env.REDDIT_USERNAME ?? '').toLowerCase()) {
              continue
            }

            // Skip posts older than 48 hours
            const postAge = Date.now() / 1000 - post.created_utc
            if (postAge > 48 * 3600) continue

            // Skip posts with very low engagement (likely spam)
            if (post.score < 0) continue

            allFound.push({
              subreddit,
              query,
              post: {
                id: post.id,
                title: post.title,
                permalink: `https://reddit.com${post.permalink}`,
                author: post.author,
                score: post.score,
                num_comments: post.num_comments,
                created_utc: post.created_utc,
              },
            })
          }
        }

        // Small delay between API calls to be respectful
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    // Deduplicate by post ID
    const uniquePostIds = new Set<string>()
    const dedupedResults = allFound.filter(f => {
      if (uniquePostIds.has(f.post.id)) return false
      uniquePostIds.add(f.post.id)
      return true
    })

    // Sort by score (highest first) — best comment opportunities
    dedupedResults.sort((a, b) => b.post.score - a.post.score)

    // Take top 20 most relevant
    const topResults = dedupedResults.slice(0, 20)

    const summary = `Searched ${searchCount} queries across ${SEARCH_SUBREDDITS.length} subs. ` +
      `Found ${dedupedResults.length} relevant posts (${errorCount} search errors). ` +
      `Top posts: ${topResults.slice(0, 5).map(r => `r/${r.subreddit}: "${r.post.title.slice(0, 40)}..." (${r.post.score} pts)`).join('; ')}`

    await recordCronRun('reddit-monitor', 'ok', {
      message: summary,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      searchCount,
      errorCount,
      found: topResults.length,
      totalFound: dedupedResults.length,
      results: topResults,
      summary,
    })
  } catch (err) {
    await recordCronRun('reddit-monitor', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
