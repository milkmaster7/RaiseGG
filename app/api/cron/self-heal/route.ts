import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  RETRIGGERABLE_CRONS,
  recordCronRun,
  sendTelegram,
  type SelfHealAction,
  type CronRunRecord,
} from '@/lib/monitor'

/**
 * GET /api/cron/self-heal — Runs every 2 hours
 * Detects stale crons and retriggers them automatically.
 * Sends ONE Telegram summary of all actions taken.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const actions: SelfHealAction[] = []

  try {
    const supabase = createServiceClient()

    // ── 1. Stale cron detection + retrigger ─────────────────────────
    const { data: runs } = await supabase
      .from('cron_runs')
      .select('*')

    const cronRecords = new Map(
      (runs ?? []).map((r: CronRunRecord) => [r.name, r])
    )

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://raisegg.com'

    for (const cron of RETRIGGERABLE_CRONS) {
      const record = cronRecords.get(cron.name)
      const maxMs = ('maxAgeHours' in cron ? cron.maxAgeHours * 60 : cron.maxAgeMinutes) * 60 * 1000

      let isStale = false
      let reason = ''

      if (!record) {
        isStale = true
        reason = 'Never ran before'
      } else {
        const age = Date.now() - new Date(record.ran_at).getTime()
        if (age > maxMs) {
          isStale = true
          reason = `Was ${Math.round(age / 60000)}m stale`
        } else if (record.status === 'error') {
          isStale = true
          reason = `Last run errored: ${record.message ?? 'unknown'}`
        }
      }

      if (isStale) {
        try {
          // Build auth headers
          const headers: Record<string, string> = {}
          if (cron.requiresAuth) {
            headers['authorization'] = `Bearer ${secret}`
          }

          const res = await fetch(`${baseUrl}${cron.path}`, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(30000),
          })

          if (res.ok) {
            actions.push({ action: `Retriggered ${cron.name}`, success: true, detail: reason })
          } else {
            actions.push({ action: `Retrigger ${cron.name}`, success: false, detail: `HTTP ${res.status}` })
          }
        } catch (e) {
          actions.push({ action: `Retrigger ${cron.name}`, success: false, detail: String(e) })
        }
      }
    }

    // ── 2. Cancel expired matches (safety net) ──────────────────────
    // The main cron does this every 5 min, but if it's stale, do it here too
    try {
      const { cancelExpiredMatches } = await import('@/lib/matches')
      await cancelExpiredMatches()
      // Don't add to actions unless it was actually needed (covered by main cron)
    } catch (_) {
      // best-effort
    }

    // ── 3. Clean stale push subscriptions ───────────────────────────
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('push_subscriptions')
        .delete()
        .lt('created_at', thirtyDaysAgo)

      if (count && count > 0) {
        actions.push({ action: 'Cleaned stale push subscriptions', success: true, detail: `Removed ${count} subscription(s) older than 30d` })
      }
    } catch (_) {
      // table may not exist yet
    }

    // ── Send summary ────────────────────────────────────────────────
    const duration = Date.now() - start

    if (actions.length > 0) {
      const fixed = actions.filter(a => a.success).length
      const failed = actions.filter(a => !a.success).length

      const lines = [
        `🤖 <b>RaiseGG Self-Heal — ${actions.length} action(s)</b>`,
        '',
        ...actions.map(a => `${a.success ? '✅' : '❌'} ${a.action} — ${a.detail}`),
      ]

      if (failed > 0) {
        lines.push('', `⚠️ ${failed} action(s) need manual attention`)
      }

      await sendTelegram(lines.join('\n'))

      await recordCronRun('self-heal', failed > 0 ? 'error' : 'ok', {
        message: `${fixed} fixed, ${failed} failed`,
        durationMs: duration,
      })
    } else {
      await recordCronRun('self-heal', 'ok', {
        message: 'All systems healthy, no actions needed',
        durationMs: duration,
      })
    }

    return NextResponse.json({
      ok: true,
      actions,
      summary: {
        total: actions.length,
        fixed: actions.filter(a => a.success).length,
        failed: actions.filter(a => !a.success).length,
      },
      duration_ms: duration,
      time: new Date().toISOString(),
    })
  } catch (e) {
    await recordCronRun('self-heal', 'error', { message: String(e) })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
