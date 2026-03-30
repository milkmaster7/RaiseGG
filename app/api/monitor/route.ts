import { NextResponse } from 'next/server'
import { runAllChecks, type HealthCheck } from '@/lib/monitor'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/monitor — Returns live health status of all services.
 * Consumed by the status dashboard. No auth required (public status page).
 */
export async function GET() {
  const start = Date.now()
  const checks = await runAllChecks()
  const elapsed = Date.now() - start

  // Group by category
  const grouped: Record<string, HealthCheck[]> = {}
  for (const check of checks) {
    if (!grouped[check.category]) grouped[check.category] = []
    grouped[check.category].push(check)
  }

  // Overall status
  const hasDown = checks.some(c => c.status === 'down')
  const hasDegraded = checks.some(c => c.status === 'degraded')
  const overall = hasDown ? 'outage' : hasDegraded ? 'degraded' : 'operational'

  return NextResponse.json({
    status: overall,
    checks,
    grouped,
    totalChecks: checks.length,
    operational: checks.filter(c => c.status === 'operational').length,
    degraded: checks.filter(c => c.status === 'degraded').length,
    down: checks.filter(c => c.status === 'down').length,
    unknown: checks.filter(c => c.status === 'unknown').length,
    elapsed_ms: elapsed,
    checked_at: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  })
}
