// Cron: Auto-run pending SQL migrations on deploy
// Schedule: Every 5 minutes (catches new deploys quickly, skips if nothing pending)
// Also runs on-demand via POST

import { NextResponse } from 'next/server'
import { runPendingMigrations, isBootstrapped } from '@/lib/migrations'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 30

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    // Check if bootstrap SQL has been run
    const bootstrapped = await isBootstrapped()
    if (!bootstrapped) {
      return NextResponse.json({
        error: 'Not bootstrapped — run the bootstrap SQL once in Supabase SQL Editor',
        bootstrap: `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, ran_at TIMESTAMPTZ NOT NULL DEFAULT now(), success BOOLEAN NOT NULL DEFAULT true, error TEXT); CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE query; RETURN json_build_object('ok', true); EXCEPTION WHEN OTHERS THEN RETURN json_build_object('ok', false, 'error', SQLERRM); END; $$;`,
      }, { status: 400 })
    }

    const result = await runPendingMigrations()

    if (result.ran.length === 0) {
      // Nothing to run — don't spam the monitor
      return NextResponse.json({ ok: true, message: 'No pending migrations', skipped: result.skipped.length })
    }

    const failed = result.ran.filter(r => !r.success)
    const succeeded = result.ran.filter(r => r.success)

    await recordCronRun('migrations', failed.length > 0 ? 'error' : 'ok', {
      message: `Ran ${succeeded.length} migrations${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: failed.length === 0,
      ran: result.ran,
      skipped: result.skipped.length,
      total: result.total,
    })
  } catch (err) {
    await recordCronRun('migrations', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
