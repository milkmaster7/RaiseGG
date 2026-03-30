/**
 * GET /api/cron/seo-backlinks
 *
 * Weekly SEO cron for RaiseGG:
 * - Pings search engines with sitemap
 * - Submits URLs via IndexNow (Bing, Yandex, Naver)
 * - Publishes articles to Dev.to (if API key set)
 *
 * Schedule: 0 6 * * 1 (Monday 6am UTC)
 */

import { NextResponse } from 'next/server'
import {
  pingSearchEngines,
  submitIndexNow,
  publishToDevTo,
  generateBacklinkArticle,
  BACKLINK_TARGETS,
} from '@/lib/seo-backlinks'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 60

const SITE_URL = 'https://raisegg.gg'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const results: Record<string, unknown> = {}

  try {
    // 1. Ping search engines
    const pingResult = await pingSearchEngines()
    results.searchEnginePings = pingResult.results

    // 2. Submit key URLs via IndexNow
    const urls = [
      SITE_URL,
      `${SITE_URL}/play`,
      `${SITE_URL}/leaderboard`,
      `${SITE_URL}/tournaments`,
      `${SITE_URL}/blog`,
      `${SITE_URL}/cs2`,
      `${SITE_URL}/dota2`,
      `${SITE_URL}/deadlock`,
    ]
    const indexNowResult = await submitIndexNow(urls)
    results.indexNow = { submitted: urls.length, ...indexNowResult }

    // 3. Publish article to Dev.to (weekly)
    if (process.env.DEVTO_API_KEY) {
      const supabase = createServiceClient()
      const { data: lastRun } = await supabase
        .from('cron_runs')
        .select('created_at')
        .eq('name', 'seo-backlinks-devto')
        .eq('status', 'ok')
        .order('created_at', { ascending: false })
        .limit(1)

      const weekMs = 7 * 24 * 3600 * 1000
      const lastPublish = lastRun?.[0]?.created_at ? new Date(lastRun[0].created_at).getTime() : 0

      if (Date.now() - lastPublish >= weekMs) {
        const article = generateBacklinkArticle()
        const devtoResult = await publishToDevTo(article)
        results.devto = devtoResult

        if (devtoResult.ok) {
          await recordCronRun('seo-backlinks-devto', 'ok', {
            message: `Published: ${devtoResult.url}`,
            durationMs: 0,
          })
        }
      } else {
        results.devto = { skipped: true, reason: 'published recently' }
      }
    } else {
      results.devto = { skipped: true, reason: 'no DEVTO_API_KEY' }
    }

    // 4. Report backlink target status
    results.backlinkTargets = {
      total: BACKLINK_TARGETS.length,
      topPriority: BACKLINK_TARGETS.filter(t => (t.da ?? 0) >= 80).map(t => t.name),
    }

    await recordCronRun('seo-backlinks', 'ok', {
      message: `Pinged engines, IndexNow ${urls.length} URLs`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, ...results })
  } catch (err: any) {
    await recordCronRun('seo-backlinks', 'error', {
      message: err.message,
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
