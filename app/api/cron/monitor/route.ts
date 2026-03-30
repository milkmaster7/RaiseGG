import { NextRequest, NextResponse } from 'next/server'
import {
  runAllChecks,
  recordCronRun,
  shouldAlert,
  setCooldown,
  clearCooldown,
  sendTelegram,
} from '@/lib/monitor'

/**
 * GET /api/cron/monitor — Hourly health monitor
 * Runs all checks, sends Telegram alerts for failures (4h cooldown).
 * Clears cooldown when checks recover.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const checks = await runAllChecks()

    const failures: string[] = []
    const recovered: string[] = []

    for (const check of checks) {
      if (check.status === 'down') {
        const canAlert = await shouldAlert(check.name)
        if (canAlert) {
          failures.push(`<b>${check.name}</b> — ${check.message}`)
          await setCooldown(check.name)
        }
      } else if (check.status === 'operational') {
        // Clear cooldown so next failure alerts immediately
        await clearCooldown(check.name)
        recovered.push(check.name)
      }
    }

    // Send single Telegram alert with all failures
    if (failures.length > 0) {
      const msg = [
        `🔴 <b>RaiseGG Monitor — ${failures.length} issue(s)</b>`,
        '',
        ...failures,
        '',
        `⏱ Check took ${Date.now() - start}ms`,
      ].join('\n')
      await sendTelegram(msg)
    }

    const duration = Date.now() - start
    await recordCronRun('monitor', 'ok', {
      message: `${checks.length} checks, ${failures.length} alerts`,
      durationMs: duration,
    })

    return NextResponse.json({
      ok: true,
      checks: checks.length,
      operational: checks.filter(c => c.status === 'operational').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      down: checks.filter(c => c.status === 'down').length,
      alerts_sent: failures.length,
      recovered: recovered.length,
      duration_ms: duration,
      time: new Date().toISOString(),
    })
  } catch (e) {
    await recordCronRun('monitor', 'error', { message: String(e) })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
