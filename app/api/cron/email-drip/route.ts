/**
 * Email Drip Campaign for RaiseGG
 *
 * Sends targeted emails based on player lifecycle:
 * 1. Day 1: Welcome reminder (signed up but no match yet)
 * 2. Day 3: Tips & first match nudge
 * 3. Day 7: Free tournament reminder
 * 4. Day 14: Win-back for inactive players
 * 5. Weekly: Active player rewards/stats
 *
 * Schedule: 0 10 * * * (daily at 10am UTC)
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 60

const RESEND_API = 'https://api.resend.com/emails'
const FROM = 'RaiseGG <noreply@raisegg.gg>'

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false }
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  return { ok: res.ok }
}

function wrap(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#13132b;border:1px solid #1e1e3a;border-radius:8px;overflow:hidden;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #1e1e3a;"><span style="font-size:20px;font-weight:800;color:#00e6ff;letter-spacing:1px;">RaiseGG</span></td></tr>
<tr><td style="padding:32px;color:#e0e0e0;font-size:15px;line-height:1.6;">${content}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #1e1e3a;text-align:center;"><span style="color:#666;font-size:12px;">
RaiseGG — Competitive Stake Matches<br>
<a href="https://raisegg.com" style="color:#00e6ff;text-decoration:none;">raisegg.com</a> ·
<a href="https://t.me/raise_GG" style="color:#00e6ff;text-decoration:none;">Telegram</a><br>
<a href="https://raisegg.com/settings" style="color:#666;text-decoration:none;font-size:11px;">Unsubscribe</a>
</span></td></tr>
</table></td></tr></table></body></html>`
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#00e6ff;color:#0d0d1a;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;margin:8px 0;">${text}</a>`
}

// ─── Email Templates ────────────────────────────────────────────────────

const DRIP_DAY1 = (name: string) => ({
  subject: `${name}, your first stake match is waiting`,
  html: wrap(`
    <h2 style="color:#fff;margin:0 0 16px;">Ready to play for real? </h2>
    <p>You signed up for RaiseGG — nice move. But you haven't played your first match yet.</p>
    <p>Here's how to get started in 60 seconds:</p>
    <ol>
      <li><strong style="color:#fff;">Deposit USDC</strong> — minimum $2, from any Solana wallet</li>
      <li><strong style="color:#fff;">Find a match</strong> — CS2, Dota 2, or Deadlock</li>
      <li><strong style="color:#fff;">Win and cash out</strong> — 90% of the pot, paid in seconds</li>
    </ol>
    <p>Your funds are always in a smart contract. Nobody can touch them — not even us.</p>
    ${btn('Play Your First Match', 'https://raisegg.com/play')}
  `),
})

const DRIP_DAY3 = (name: string) => ({
  subject: `CS2 tips that actually win stake matches`,
  html: wrap(`
    <h2 style="color:#fff;margin:0 0 16px;">Quick tips before you stake</h2>
    <p>Hey ${name}, here are 3 things winners on RaiseGG do differently:</p>
    <p><strong style="color:#00e6ff;">1. Warm up first</strong><br>15 minutes in aim_botz before any stake match. Cold starts cost money.</p>
    <p><strong style="color:#00e6ff;">2. Start small</strong><br>$2–$5 stakes until you know the format. Build confidence, then scale.</p>
    <p><strong style="color:#00e6ff;">3. Know your map</strong><br>Pick maps you've played 50+ hours on. Don't gamble on map knowledge AND stakes.</p>
    <p>Our free daily tournaments are a great way to practice with zero risk — $5 USDC prize pool, no entry fee.</p>
    ${btn('Join Free Tournament', 'https://raisegg.com/tournaments')}
  `),
})

const DRIP_DAY7 = (name: string) => ({
  subject: `Free tournament today — $5 USDC, no entry fee`,
  html: wrap(`
    <h2 style="color:#fff;margin:0 0 16px;">Play for free, win real money</h2>
    <p>${name}, we run free tournaments every day:</p>
    <ul>
      <li><strong style="color:#fff;">$5 USDC</strong> prize pool</li>
      <li><strong style="color:#fff;">8 players</strong> per tournament</li>
      <li><strong style="color:#fff;">Zero entry fee</strong> — completely free</li>
      <li>CS2, Dota 2, and Deadlock</li>
    </ul>
    <p>It's the best way to test your skills before putting real money on the line.</p>
    ${btn('Sign Up Now', 'https://raisegg.com/tournaments')}
  `),
})

const DRIP_DAY14 = (name: string) => ({
  subject: `${name}, we miss you on RaiseGG`,
  html: wrap(`
    <h2 style="color:#fff;margin:0 0 16px;">Still got game?</h2>
    <p>It's been a while since you played on RaiseGG. Here's what's new:</p>
    <ul>
      <li>Free daily tournaments with USDC prizes</li>
      <li>Improved matchmaking — faster queue times</li>
      <li>City leaderboards — represent your city</li>
      <li>Refer friends and earn $1 USDC per signup</li>
    </ul>
    <p>Your account is still active and your funds are safe in the smart contract. Come back and play.</p>
    ${btn('Play Now', 'https://raisegg.com/play')}
  `),
})

const WEEKLY_ACTIVE = (name: string, wins: number, earnings: number) => ({
  subject: `Your weekly RaiseGG stats: ${wins} wins`,
  html: wrap(`
    <h2 style="color:#fff;margin:0 0 16px;">Your week on RaiseGG</h2>
    <p>Here's your recap, ${name}:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:12px;background:#1a1a3a;border-radius:6px 0 0 6px;text-align:center;border:1px solid #2a2d4f;">
          <div style="font-size:24px;font-weight:800;color:#00e6ff;">${wins}</div>
          <div style="font-size:11px;color:#888;text-transform:uppercase;">Wins</div>
        </td>
        <td style="padding:12px;background:#1a1a3a;border-radius:0 6px 6px 0;text-align:center;border:1px solid #2a2d4f;border-left:0;">
          <div style="font-size:24px;font-weight:800;color:#4ade80;">$${earnings.toFixed(2)}</div>
          <div style="font-size:11px;color:#888;text-transform:uppercase;">Earned</div>
        </td>
      </tr>
    </table>
    <p>Keep it up. Share your referral link to earn $1 for every friend who joins.</p>
    ${btn('View Leaderboard', 'https://raisegg.com/leaderboard')}
  `),
})

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    await recordCronRun('email-drip', 'ok', { message: 'RESEND_API_KEY not set' })
    return NextResponse.json({ message: 'No email provider' })
  }

  const start = Date.now()
  const supabase = createServiceClient()
  const results: Record<string, number> = { day1: 0, day3: 0, day7: 0, day14: 0, weekly: 0 }

  try {
    const now = Date.now()
    const day = 24 * 3600 * 1000

    // ── Day 1: Signed up yesterday, no matches ──
    const d1Start = new Date(now - 1.5 * day).toISOString()
    const d1End = new Date(now - 0.5 * day).toISOString()
    const { data: day1Players } = await supabase
      .from('players')
      .select('id, username, email')
      .gte('created_at', d1Start)
      .lte('created_at', d1End)
      .not('email', 'is', null)
      .limit(50)

    for (const p of day1Players ?? []) {
      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`player1_id.eq.${p.id},player2_id.eq.${p.id}`)
      if ((count ?? 0) === 0 && p.email) {
        const tmpl = DRIP_DAY1(p.username || 'Player')
        await send(p.email, tmpl.subject, tmpl.html)
        results.day1++
      }
    }

    // ── Day 3: Signed up 3 days ago, still no matches ──
    const d3Start = new Date(now - 3.5 * day).toISOString()
    const d3End = new Date(now - 2.5 * day).toISOString()
    const { data: day3Players } = await supabase
      .from('players')
      .select('id, username, email')
      .gte('created_at', d3Start)
      .lte('created_at', d3End)
      .not('email', 'is', null)
      .limit(50)

    for (const p of day3Players ?? []) {
      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`player1_id.eq.${p.id},player2_id.eq.${p.id}`)
      if ((count ?? 0) === 0 && p.email) {
        const tmpl = DRIP_DAY3(p.username || 'Player')
        await send(p.email, tmpl.subject, tmpl.html)
        results.day3++
      }
    }

    // ── Day 7: Free tournament nudge ──
    const d7Start = new Date(now - 7.5 * day).toISOString()
    const d7End = new Date(now - 6.5 * day).toISOString()
    const { data: day7Players } = await supabase
      .from('players')
      .select('id, username, email')
      .gte('created_at', d7Start)
      .lte('created_at', d7End)
      .not('email', 'is', null)
      .limit(50)

    for (const p of day7Players ?? []) {
      if (p.email) {
        const tmpl = DRIP_DAY7(p.username || 'Player')
        await send(p.email, tmpl.subject, tmpl.html)
        results.day7++
      }
    }

    // ── Day 14: Win-back for inactive ──
    const d14Start = new Date(now - 15 * day).toISOString()
    const d14End = new Date(now - 13 * day).toISOString()
    const { data: day14Players } = await supabase
      .from('players')
      .select('id, username, email, last_seen')
      .gte('created_at', d14Start)
      .lte('created_at', d14End)
      .not('email', 'is', null)
      .limit(50)

    for (const p of day14Players ?? []) {
      // Only send if they haven't been active in a week
      const lastSeen = p.last_seen ? new Date(p.last_seen).getTime() : 0
      if (now - lastSeen > 7 * day && p.email) {
        const tmpl = DRIP_DAY14(p.username || 'Player')
        await send(p.email, tmpl.subject, tmpl.html)
        results.day14++
      }
    }

    // ── Weekly: Active player stats (Monday only) ──
    if (new Date().getDay() === 1) {
      const weekAgo = new Date(now - 7 * day).toISOString()
      const { data: activeMatches } = await supabase
        .from('matches')
        .select('player1_id, player2_id, winner_id, stake')
        .eq('status', 'completed')
        .gte('completed_at', weekAgo)
        .limit(200)

      // Aggregate stats per player
      const stats: Record<string, { wins: number; earnings: number }> = {}
      for (const m of activeMatches ?? []) {
        if (m.winner_id) {
          if (!stats[m.winner_id]) stats[m.winner_id] = { wins: 0, earnings: 0 }
          stats[m.winner_id].wins++
          stats[m.winner_id].earnings += Number(m.stake ?? 0) * 1.8 // 90% of 2x stake
        }
      }

      // Send to top active players
      const playerIds = Object.keys(stats).slice(0, 20)
      if (playerIds.length > 0) {
        const { data: players } = await supabase
          .from('players')
          .select('id, username, email')
          .in('id', playerIds)
          .not('email', 'is', null)

        for (const p of players ?? []) {
          const s = stats[p.id]
          if (s && p.email) {
            const tmpl = WEEKLY_ACTIVE(p.username || 'Player', s.wins, s.earnings)
            await send(p.email, tmpl.subject, tmpl.html)
            results.weekly++
          }
        }
      }
    }

    const total = Object.values(results).reduce((a, b) => a + b, 0)
    await recordCronRun('email-drip', 'ok', {
      message: `Sent ${total} emails: day1=${results.day1} day3=${results.day3} day7=${results.day7} day14=${results.day14} weekly=${results.weekly}`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, ...results, total })
  } catch (err: any) {
    await recordCronRun('email-drip', 'error', {
      message: err.message,
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
