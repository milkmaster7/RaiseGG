import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── Platform credentials to check ─────────────────────────────────────────
const PLATFORMS = [
  { label: 'Telegram Userbot', envVar: 'TELEGRAM_SESSION', icon: '📱' },
  { label: 'Telegram Bot', envVar: 'TELEGRAM_BOT_TOKEN', icon: '🤖' },
  { label: 'Discord Bot', envVar: 'DISCORD_BOT_TOKEN', icon: '💬' },
  { label: 'VK', envVar: 'VK_ACCESS_TOKEN', icon: '🔵' },
  { label: 'HLTV', envVar: 'HLTV_COOKIE', icon: '🎯' },
  { label: 'Steam', envVar: 'STEAM_SESSION_COOKIE', icon: '🎮' },
  { label: 'Twitch', envVar: 'TWITCH_CLIENT_ID', icon: '📺' },
  { label: 'Twitter/X', envVar: 'TWITTER_API_KEY', icon: '🐦' },
]

// ─── Automated channels ────────────────────────────────────────────────────
const AUTOMATED_CHANNELS = [
  { label: 'Telegram channel posting', frequency: 'Every 6h', requires: 'TELEGRAM_BOT_TOKEN', icon: '📢' },
  { label: 'Marketing group posts', frequency: 'Every 6h', requires: 'TELEGRAM_SESSION', icon: '📣' },
  { label: 'Discord LFG posts', frequency: 'Every 8h', requires: 'DISCORD_BOT_TOKEN', icon: '🎮' },
  { label: 'VK community posts', frequency: 'Every 12h', requires: 'VK_ACCESS_TOKEN', icon: '🔵' },
  { label: 'Blog SEO articles', frequency: '3x/week', requires: 'GEMINI_API_KEY', icon: '📰' },
  { label: 'Weekly graphics', frequency: 'Weekly', requires: null, icon: '🎨' },
  { label: 'Streamer discovery', frequency: 'Weekly', requires: 'TWITCH_CLIENT_ID', icon: '🎙️' },
]

// ─── Message template languages ────────────────────────────────────────────
const TEMPLATE_LANGUAGES = [
  { lang: 'Turkish', flag: '🇹🇷', count: 5 },
  { lang: 'Russian', flag: '🇷🇺', count: 5 },
  { lang: 'English', flag: '🇬🇧', count: 5 },
  { lang: 'Persian', flag: '🇮🇷', count: 5 },
  { lang: 'Romanian', flag: '🇷🇴', count: 5 },
  { lang: 'Serbian', flag: '🇷🇸', count: 5 },
  { lang: 'Polish', flag: '🇵🇱', count: 5 },
  { lang: 'Georgian', flag: '🇬🇪', count: 5 },
  { lang: 'Greek', flag: '🇬🇷', count: 5 },
  { lang: 'Hungarian', flag: '🇭🇺', count: 5 },
  { lang: 'Azerbaijani', flag: '🇦🇿', count: 5 },
]

// ─── Manual tasks ──────────────────────────────────────────────────────────
const MANUAL_TASKS = [
  { task: 'Auth Telegram userbot (session string)', envCheck: 'TELEGRAM_SESSION', icon: '📱' },
  { task: 'Create Discord bot + invite to server', envCheck: 'DISCORD_BOT_TOKEN', icon: '💬' },
  { task: 'Get VK access token', envCheck: 'VK_ACCESS_TOKEN', icon: '🔵' },
  { task: 'Login to HLTV for cookie', envCheck: 'HLTV_COOKIE', icon: '🎯' },
  { task: 'Login to Steam for session cookie', envCheck: 'STEAM_SESSION_COOKIE', icon: '🎮' },
  { task: 'Create Twitch app for client ID', envCheck: 'TWITCH_CLIENT_ID', icon: '📺' },
  { task: 'Facebook group posting (manual only)', envCheck: null, icon: '📘' },
  { task: 'Cyber cafe outreach (physical)', envCheck: null, icon: '🏪' },
]

// ─── Quick actions ─────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Post to @raise_GG now', href: 'https://t.me/raise_GG', icon: '📢', color: '#0088cc' },
  { label: 'View copy-paste messages', href: '/api/marketing/copy-paste', icon: '📋', color: '#00e6ff' },
  { label: 'Generate tournament graphic', href: '/api/marketing/graphics', icon: '🎨', color: '#ff6b9d' },
  { label: 'View streamer list', href: '/api/marketing/streamers', icon: '🎙️', color: '#9945ff' },
  { label: 'University email templates', href: '/api/marketing/outreach', icon: '🎓', color: '#ffc107' },
]

export async function GET(req: NextRequest) {
  // Auth check
  const key = req.nextUrl.searchParams.get('key')
  const secret = process.env.CRON_SECRET
  if (secret && key !== secret) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const keyParam = secret ? `?key=${secret}` : ''

  // Build platform status
  const configuredCount = PLATFORMS.filter(p => !!process.env[p.envVar]).length

  const platformRows = PLATFORMS.map((p, i) => {
    const configured = !!process.env[p.envVar]
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;${i > 0 ? 'border-top:1px solid #1e2045;' : ''}">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:16px">${p.icon}</span>
          <span style="font-weight:500;font-size:15px">${p.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:10px;height:10px;border-radius:50%;background:${configured ? '#00e676' : '#ff5252'};box-shadow:0 0 8px ${configured ? '#00e67680' : '#ff525280'};flex-shrink:0"></span>
          <span style="font-size:12px;font-weight:600;color:${configured ? '#00e676' : '#ff5252'};text-transform:uppercase;letter-spacing:.05em">${configured ? 'Configured' : 'Not configured'}</span>
        </div>
      </div>`
  }).join('')

  // Build automated channels
  const automatedRows = AUTOMATED_CHANNELS.map((c, i) => {
    const ready = c.requires ? !!process.env[c.requires] : true
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;${i > 0 ? 'border-top:1px solid #1e2045;' : ''}">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:16px">${c.icon}</span>
          <span style="font-weight:500;font-size:15px">${c.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:16px">
          <span style="color:#8a8fb5;font-size:13px">${c.frequency}</span>
          <span style="font-size:12px;font-weight:600;color:${ready ? '#00e676' : '#ffc107'};text-transform:uppercase;letter-spacing:.05em">${ready ? 'Active' : 'Blocked'}</span>
        </div>
      </div>`
  }).join('')

  const activeCount = AUTOMATED_CHANNELS.filter(c => c.requires ? !!process.env[c.requires] : true).length

  // Build message templates
  const totalTemplates = TEMPLATE_LANGUAGES.reduce((sum, t) => sum + t.count, 0)
  const templateRows = TEMPLATE_LANGUAGES.map((t, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;${i > 0 ? 'border-top:1px solid #1e2045;' : ''}">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">${t.flag}</span>
        <span style="font-weight:500;font-size:14px">${t.lang}</span>
      </div>
      <span style="font-size:13px;font-weight:600;color:#00e6ff">${t.count} templates</span>
    </div>`).join('')

  // Build manual tasks
  const manualRows = MANUAL_TASKS.map((t, i) => {
    const done = t.envCheck ? !!process.env[t.envCheck] : false
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;${i > 0 ? 'border-top:1px solid #1e2045;' : ''}">
        <span style="font-size:18px;flex-shrink:0;width:24px;text-align:center">${done ? '&#9745;' : '&#9744;'}</span>
        <span style="font-size:16px">${t.icon}</span>
        <span style="font-size:14px;color:${done ? '#8a8fb580' : '#c8cce0'};${done ? 'text-decoration:line-through;' : ''}">${t.task}</span>
        ${done ? '<span style="font-size:11px;font-weight:700;color:#00e676;background:#00e67615;border:1px solid #00e67640;padding:2px 8px;border-radius:4px;margin-left:auto">DONE</span>' : '<span style="font-size:11px;font-weight:700;color:#ffc107;background:#ffc10715;border:1px solid #ffc10740;padding:2px 8px;border-radius:4px;margin-left:auto">TODO</span>'}
      </div>`
  }).join('')

  const manualDone = MANUAL_TASKS.filter(t => t.envCheck && !!process.env[t.envCheck]).length
  const manualTotal = MANUAL_TASKS.length

  // Build quick actions
  const actionButtons = QUICK_ACTIONS.map(a => `
    <a href="${a.href.startsWith('/') ? a.href + keyParam : a.href}" target="${a.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:14px 20px;background:${a.color}10;border:1px solid ${a.color}40;border-radius:10px;text-decoration:none;transition:all .2s;cursor:pointer">
      <span style="font-size:20px">${a.icon}</span>
      <span style="font-size:14px;font-weight:600;color:${a.color}">${a.label}</span>
      <span style="margin-left:auto;font-size:16px;color:${a.color}">&#8594;</span>
    </a>`).join('')

  // Overall readiness
  const readinessPercent = Math.round((configuredCount / PLATFORMS.length) * 100)
  const readinessColor = readinessPercent >= 75 ? '#00e676' : readinessPercent >= 40 ? '#ffc107' : '#ff5252'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>RaiseGG Marketing Command Center</title>
  <meta name="description" content="Marketing dashboard for RaiseGG"/>
  <meta http-equiv="refresh" content="60"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:#0b0c1d;color:#e0e6ef;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
    a{color:#00e6ff;text-decoration:none}
    a:hover{opacity:.85}
    .section-title{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#8a8fb5;margin:0 0 12px 0;font-family:system-ui}
    .card{background:#12132a;border:1px solid #1e2045;border-radius:10px;overflow:hidden;margin-bottom:32px}
    .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:32px}
    .stat-box{background:#12132a;border:1px solid #1e2045;border-radius:10px;padding:20px;text-align:center}
    .stat-value{font-size:28px;font-weight:800;margin-bottom:4px}
    .stat-label{font-size:12px;font-weight:500;color:#8a8fb5;text-transform:uppercase;letter-spacing:.05em}
    .actions-grid{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:32px}
    @media(min-width:600px){.actions-grid{grid-template-columns:1fr 1fr}}
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;padding:40px 20px">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:40px">
      <h1 style="font-size:28px;font-weight:800;margin-bottom:8px">Marketing Command Center</h1>
      <p style="color:#8a8fb5;font-size:14px">RaiseGG growth dashboard &mdash; auto-refreshes every 60s</p>
    </div>

    <!-- Overall readiness banner -->
    <div style="background:${readinessColor}10;border:1px solid ${readinessColor}40;border-radius:12px;padding:20px 24px;display:flex;align-items:center;gap:16px;margin-bottom:32px">
      <span style="width:20px;height:20px;border-radius:50%;background:${readinessColor};box-shadow:0 0 16px ${readinessColor}80;flex-shrink:0"></span>
      <div>
        <div style="font-size:18px;font-weight:700;color:${readinessColor}">Platform Readiness: ${readinessPercent}%</div>
        <div style="font-size:13px;color:#8a8fb5;margin-top:4px">${configuredCount}/${PLATFORMS.length} platforms configured &mdash; ${activeCount}/${AUTOMATED_CHANNELS.length} automations active</div>
      </div>
    </div>

    <!-- Stats grid -->
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-value" style="color:#00e6ff">${configuredCount}/${PLATFORMS.length}</div>
        <div class="stat-label">Platforms</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" style="color:#00e676">${activeCount}/${AUTOMATED_CHANNELS.length}</div>
        <div class="stat-label">Automations</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" style="color:#9945ff">${TEMPLATE_LANGUAGES.length}</div>
        <div class="stat-label">Languages</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" style="color:#ffc107">${totalTemplates}</div>
        <div class="stat-label">Templates</div>
      </div>
    </div>

    <!-- A. Platform Status -->
    <h2 class="section-title">Platform Status</h2>
    <div class="card">${platformRows}</div>

    <!-- B. Automated Channels -->
    <h2 class="section-title">Automated Channels &mdash; ${activeCount} active</h2>
    <div class="card">${automatedRows}</div>

    <!-- C. Message Templates -->
    <h2 class="section-title">Message Templates &mdash; ${totalTemplates} ready across ${TEMPLATE_LANGUAGES.length} languages</h2>
    <div class="card">${templateRows}</div>

    <!-- D. Manual Tasks Remaining -->
    <h2 class="section-title">Manual Tasks &mdash; ${manualDone}/${manualTotal} completed</h2>
    <div class="card">${manualRows}</div>

    <!-- E. Quick Actions -->
    <h2 class="section-title">Quick Actions</h2>
    <div class="actions-grid">${actionButtons}</div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:40px;padding:20px 0;border-top:1px solid #1e2045;color:#8a8fb5;font-size:13px">
      <p>Updated: ${new Date().toISOString()}</p>
      <p style="margin-top:4px"><a href="/api/status${keyParam}">System Status</a> &middot; <a href="/">Back to RaiseGG</a></p>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  })
}
