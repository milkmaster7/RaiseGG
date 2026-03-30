/**
 * lib/monitor.ts — RaiseGG monitoring + self-heal utilities
 *
 * Uses Supabase tables instead of Redis for cron recording,
 * alert cooldowns, and check results.
 */

import { createServiceClient } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CronRunRecord {
  name: string
  status: 'ok' | 'error'
  message?: string
  duration_ms?: number
  ran_at: string
}

export interface HealthCheck {
  name: string
  category: 'database' | 'api' | 'auth' | 'content' | 'cron' | 'blockchain' | 'notifications' | 'email'
  status: 'operational' | 'degraded' | 'down' | 'unknown'
  message: string
  response_ms?: number
  checked_at: string
}

export interface SelfHealAction {
  action: string
  success: boolean
  detail: string
}

// ─── Retriggerable cron registry ────────────────────────────────────────────

export const RETRIGGERABLE_CRONS = [
  { name: 'main',      path: '/api/cron',           maxAgeMinutes: 10,  requiresAuth: true },
  { name: 'blog',      path: '/api/cron/blog',      maxAgeHours: 72,    requiresAuth: true },
  { name: 'vac-check',        path: '/api/cron/vac-check',        maxAgeHours: 25, requiresAuth: true },
  { name: 'season-reset',     path: '/api/cron/season-reset',     maxAgeHours: 25, requiresAuth: true },
  { name: 'daily-tournament', path: '/api/cron/daily-tournament', maxAgeHours: 25, requiresAuth: true },
  { name: 'weekly-prizes',    path: '/api/cron/weekly-prizes',    maxAgeHours: 170, requiresAuth: true },
  { name: 'match-notify',     path: '/api/cron/match-notify',     maxAgeMinutes: 10, requiresAuth: true },
  { name: 'bounty-refresh',  path: '/api/cron/bounty-refresh',   maxAgeHours: 170,  requiresAuth: true },
] as const

// ─── Record cron run ────────────────────────────────────────────────────────

/**
 * Call at the end of every cron handler to record its status.
 * Upserts into `cron_runs` table (unique on `name`).
 */
export async function recordCronRun(
  name: string,
  status: 'ok' | 'error',
  opts?: { message?: string; durationMs?: number }
): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from('cron_runs')
      .upsert({
        name,
        status,
        message: opts?.message ?? null,
        duration_ms: opts?.durationMs ?? null,
        ran_at: new Date().toISOString(),
      }, { onConflict: 'name' })
  } catch (_) {
    // Best-effort — don't break the cron if recording fails
  }
}

// ─── Alert cooldowns ────────────────────────────────────────────────────────

const COOLDOWN_HOURS = 4

/**
 * Check if we should send an alert for this check (4h cooldown).
 */
export async function shouldAlert(checkName: string): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('monitor_cooldowns')
      .select('alerted_at')
      .eq('check_name', checkName)
      .single()

    if (!data) return true

    const elapsed = Date.now() - new Date(data.alerted_at).getTime()
    return elapsed > COOLDOWN_HOURS * 60 * 60 * 1000
  } catch (_) {
    return true
  }
}

/**
 * Set alert cooldown after sending alert.
 */
export async function setCooldown(checkName: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from('monitor_cooldowns')
      .upsert({
        check_name: checkName,
        alerted_at: new Date().toISOString(),
      }, { onConflict: 'check_name' })
  } catch (_) {
    // best-effort
  }
}

/**
 * Clear cooldown when a check recovers (so next failure alerts immediately).
 */
export async function clearCooldown(checkName: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from('monitor_cooldowns')
      .delete()
      .eq('check_name', checkName)
  } catch (_) {
    // best-effort
  }
}

// ─── Telegram alerts ────────────────────────────────────────────────────────

/**
 * Send a Telegram message. Uses TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env vars.
 * Silently fails if not configured.
 */
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return false

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(5000),
      }
    )
    return res.ok
  } catch (_) {
    return false
  }
}

// ─── Live API checks ────────────────────────────────────────────────────────

/**
 * Check if Supabase is reachable by querying a simple count.
 */
export async function checkSupabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('players').select('id', { count: 'exact', head: true })
    const ms = Date.now() - start
    if (error) {
      return { name: 'Supabase', category: 'database', status: 'down', message: error.message, response_ms: ms, checked_at: new Date().toISOString() }
    }
    return { name: 'Supabase', category: 'database', status: ms > 3000 ? 'degraded' : 'operational', message: `${ms}ms`, response_ms: ms, checked_at: new Date().toISOString() }
  } catch (e) {
    return { name: 'Supabase', category: 'database', status: 'down', message: String(e), response_ms: Date.now() - start, checked_at: new Date().toISOString() }
  }
}

/**
 * Check Steam API with a live request.
 */
export async function checkSteamApi(): Promise<HealthCheck> {
  const start = Date.now()
  const key = process.env.STEAM_API_KEY
  if (!key) return { name: 'Steam API', category: 'api', status: 'down', message: 'STEAM_API_KEY not set', checked_at: new Date().toISOString() }

  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=76561198000000000`,
      { signal: AbortSignal.timeout(8000) }
    )
    const ms = Date.now() - start
    if (!res.ok) return { name: 'Steam API', category: 'api', status: 'down', message: `HTTP ${res.status}`, response_ms: ms, checked_at: new Date().toISOString() }
    return { name: 'Steam API', category: 'api', status: ms > 5000 ? 'degraded' : 'operational', message: `${ms}ms`, response_ms: ms, checked_at: new Date().toISOString() }
  } catch (e) {
    return { name: 'Steam API', category: 'api', status: 'down', message: String(e), response_ms: Date.now() - start, checked_at: new Date().toISOString() }
  }
}

/**
 * Check Gemini API with a live models request.
 */
export async function checkGeminiApi(): Promise<HealthCheck> {
  const start = Date.now()
  const key = process.env.GEMINI_API_KEY
  if (!key) return { name: 'Gemini API', category: 'api', status: 'down', message: 'GEMINI_API_KEY not set', checked_at: new Date().toISOString() }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const ms = Date.now() - start
    if (!res.ok) return { name: 'Gemini API', category: 'api', status: 'down', message: `HTTP ${res.status}`, response_ms: ms, checked_at: new Date().toISOString() }
    return { name: 'Gemini API', category: 'api', status: ms > 5000 ? 'degraded' : 'operational', message: `${ms}ms`, response_ms: ms, checked_at: new Date().toISOString() }
  } catch (e) {
    return { name: 'Gemini API', category: 'api', status: 'down', message: String(e), response_ms: Date.now() - start, checked_at: new Date().toISOString() }
  }
}

/**
 * Check Solana RPC with a live getHealth request.
 */
export async function checkSolanaRpc(): Promise<HealthCheck> {
  const start = Date.now()
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com'

  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
      signal: AbortSignal.timeout(8000),
    })
    const ms = Date.now() - start
    if (!res.ok) return { name: 'Solana RPC', category: 'blockchain', status: 'down', message: `HTTP ${res.status}`, response_ms: ms, checked_at: new Date().toISOString() }
    const json = await res.json()
    const healthy = json.result === 'ok'
    return {
      name: 'Solana RPC',
      category: 'blockchain',
      status: healthy ? (ms > 3000 ? 'degraded' : 'operational') : 'down',
      message: healthy ? `${ms}ms` : (json.error?.message ?? 'unhealthy'),
      response_ms: ms,
      checked_at: new Date().toISOString(),
    }
  } catch (e) {
    return { name: 'Solana RPC', category: 'blockchain', status: 'down', message: String(e), response_ms: Date.now() - start, checked_at: new Date().toISOString() }
  }
}

/**
 * Check SMTP by connecting to the mail server.
 */
export async function checkSmtp(): Promise<HealthCheck> {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return { name: 'SMTP Email', category: 'email', status: 'down', message: 'SMTP not configured', checked_at: new Date().toISOString() }

  try {
    const nodemailer = await import('nodemailer')
    const start = Date.now()
    const transporter = nodemailer.default.createTransport({
      host: 'mail.privateemail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 8000,
    })
    await transporter.verify()
    const ms = Date.now() - start
    return { name: 'SMTP Email', category: 'email', status: ms > 5000 ? 'degraded' : 'operational', message: `${ms}ms`, response_ms: ms, checked_at: new Date().toISOString() }
  } catch (e) {
    return { name: 'SMTP Email', category: 'email', status: 'down', message: String(e), checked_at: new Date().toISOString() }
  }
}

/**
 * Check VAPID/push notification config.
 */
export async function checkPushNotifications(): Promise<HealthCheck> {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) {
    return { name: 'Push Notifications', category: 'notifications', status: 'down', message: 'VAPID keys not configured', checked_at: new Date().toISOString() }
  }
  return { name: 'Push Notifications', category: 'notifications', status: 'operational', message: 'VAPID configured', checked_at: new Date().toISOString() }
}

/**
 * Check session/auth config.
 */
export async function checkAuth(): Promise<HealthCheck> {
  const sessionSecret = process.env.SESSION_SECRET
  const steamKey = process.env.STEAM_API_KEY
  if (!sessionSecret) return { name: 'Auth Config', category: 'auth', status: 'down', message: 'SESSION_SECRET not set', checked_at: new Date().toISOString() }
  if (!steamKey) return { name: 'Auth Config', category: 'auth', status: 'degraded', message: 'STEAM_API_KEY not set', checked_at: new Date().toISOString() }
  return { name: 'Auth Config', category: 'auth', status: 'operational', message: 'Session + Steam configured', checked_at: new Date().toISOString() }
}

/**
 * Check Solana escrow program config.
 */
export async function checkEscrowConfig(): Promise<HealthCheck> {
  const programId = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID
  const treasury = process.env.NEXT_PUBLIC_TREASURY_SOL
  const authorityKey = process.env.SOLANA_AUTHORITY_PRIVATE_KEY
  if (!programId || programId.startsWith('PLACEHOLDER')) {
    return { name: 'Escrow Config', category: 'blockchain', status: 'down', message: 'Program ID not set', checked_at: new Date().toISOString() }
  }
  if (!treasury) {
    return { name: 'Escrow Config', category: 'blockchain', status: 'degraded', message: 'Treasury not set', checked_at: new Date().toISOString() }
  }
  if (!authorityKey) {
    return { name: 'Escrow Config', category: 'blockchain', status: 'degraded', message: 'Authority key not set', checked_at: new Date().toISOString() }
  }
  return { name: 'Escrow Config', category: 'blockchain', status: 'operational', message: 'Program + Treasury + Authority configured', checked_at: new Date().toISOString() }
}

/**
 * Check cron freshness — are crons running on schedule?
 */
export async function checkCronFreshness(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = []
  try {
    const supabase = createServiceClient()
    const { data: runs } = await supabase
      .from('cron_runs')
      .select('*')

    const cronRecords = new Map((runs ?? []).map((r: CronRunRecord) => [r.name, r]))

    for (const cron of RETRIGGERABLE_CRONS) {
      const record = cronRecords.get(cron.name)
      const maxMs = ('maxAgeHours' in cron ? cron.maxAgeHours * 60 : cron.maxAgeMinutes) * 60 * 1000

      if (!record) {
        checks.push({
          name: `Cron: ${cron.name}`,
          category: 'cron',
          status: 'unknown',
          message: 'Never ran',
          checked_at: new Date().toISOString(),
        })
        continue
      }

      const age = Date.now() - new Date(record.ran_at).getTime()
      if (age > maxMs * 2) {
        checks.push({
          name: `Cron: ${cron.name}`,
          category: 'cron',
          status: 'down',
          message: `Last ran ${Math.round(age / 60000)}m ago (max ${Math.round(maxMs / 60000)}m)`,
          checked_at: new Date().toISOString(),
        })
      } else if (record.status === 'error') {
        checks.push({
          name: `Cron: ${cron.name}`,
          category: 'cron',
          status: 'degraded',
          message: `Error: ${record.message ?? 'unknown'}`,
          checked_at: new Date().toISOString(),
        })
      } else {
        checks.push({
          name: `Cron: ${cron.name}`,
          category: 'cron',
          status: 'operational',
          message: `Last ran ${Math.round(age / 60000)}m ago`,
          checked_at: new Date().toISOString(),
        })
      }
    }
  } catch (_) {
    checks.push({
      name: 'Cron Monitoring',
      category: 'cron',
      status: 'unknown',
      message: 'Could not read cron_runs table',
      checked_at: new Date().toISOString(),
    })
  }
  return checks
}

/**
 * Check blog content freshness.
 */
export async function checkBlogContent(): Promise<HealthCheck> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('ai_blog_posts')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return { name: 'Blog Content', category: 'content', status: 'unknown', message: 'No blog posts found', checked_at: new Date().toISOString() }
    }

    const age = Date.now() - new Date(data.created_at).getTime()
    const days = Math.round(age / (24 * 60 * 60 * 1000))

    if (days > 7) {
      return { name: 'Blog Content', category: 'content', status: 'degraded', message: `Last post ${days}d ago`, checked_at: new Date().toISOString() }
    }
    return { name: 'Blog Content', category: 'content', status: 'operational', message: `Last post ${days}d ago`, checked_at: new Date().toISOString() }
  } catch (_) {
    return { name: 'Blog Content', category: 'content', status: 'unknown', message: 'Check failed', checked_at: new Date().toISOString() }
  }
}

// ─── Run all checks ─────────────────────────────────────────────────────────

export async function runAllChecks(): Promise<HealthCheck[]> {
  const [
    supabaseCheck,
    steamCheck,
    geminiCheck,
    solanaCheck,
    smtpCheck,
    pushCheck,
    authCheck,
    escrowCheck,
    cronChecks,
    blogCheck,
  ] = await Promise.allSettled([
    checkSupabase(),
    checkSteamApi(),
    checkGeminiApi(),
    checkSolanaRpc(),
    checkSmtp(),
    checkPushNotifications(),
    checkAuth(),
    checkEscrowConfig(),
    checkCronFreshness(),
    checkBlogContent(),
  ])

  const checks: HealthCheck[] = []
  const settled = [supabaseCheck, steamCheck, geminiCheck, solanaCheck, smtpCheck, pushCheck, authCheck, escrowCheck, blogCheck]
  for (const result of settled) {
    if (result.status === 'fulfilled') checks.push(result.value as HealthCheck)
    else checks.push({ name: 'Unknown', category: 'api', status: 'down', message: String(result.reason), checked_at: new Date().toISOString() })
  }

  // Cron checks returns an array
  if (cronChecks.status === 'fulfilled') {
    checks.push(...(cronChecks.value as HealthCheck[]))
  }

  return checks
}
