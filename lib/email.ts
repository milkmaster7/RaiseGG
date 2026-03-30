// Email system using Resend (https://resend.com)
// Free tier: 100 emails/day, no credit card required
// Env var: RESEND_API_KEY

const RESEND_API = 'https://api.resend.com/emails'
const FROM = 'RaiseGG <noreply@raisegg.gg>'

// ─── Core send via Resend ──────────────────────────────────────────────────────

async function resendSend(to: string | string[], subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not configured — email skipped:', subject)
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    console.error('[email] Resend error:', res.status, err)
    return { ok: false, error: err }
  }

  return { ok: true, data: await res.json() }
}

// ─── Templates ──────────────────────────────────────────────────────────────

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#13132b;border:1px solid #1e1e3a;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="padding:24px 32px;border-bottom:1px solid #1e1e3a;">
        <span style="font-size:20px;font-weight:800;color:#00e6ff;letter-spacing:1px;">⚡ RaiseGG</span>
      </td></tr>
      <!-- Content -->
      <tr><td style="padding:32px;color:#e0e0e0;font-size:15px;line-height:1.6;">
        ${content}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 32px;border-top:1px solid #1e1e3a;text-align:center;">
        <span style="color:#666;font-size:12px;">
          RaiseGG — Competitive Stake Matches<br>
          <a href="https://raisegg.gg" style="color:#00e6ff;text-decoration:none;">raisegg.gg</a> ·
          <a href="https://t.me/raise_GG" style="color:#00e6ff;text-decoration:none;">Telegram</a>
        </span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#00e6ff;color:#0d0d1a;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;margin:8px 0;">${text}</a>`
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function sendEmail(to: string | string[], subject: string, html: string) {
  return resendSend(to, subject, html)
}

export async function sendWelcome(to: string, username: string) {
  return resendSend(to, `Welcome to RaiseGG, ${username}!`, baseTemplate(`
    <h2 style="color:white;margin:0 0 16px;">Welcome, ${username} 🎮</h2>
    <p>Your RaiseGG account is live. You're ready to compete in CS2, Dota 2 and Deadlock stake matches.</p>
    <p><strong>Next steps:</strong></p>
    <ul style="padding-left:20px;">
      <li>Connect your Phantom wallet</li>
      <li>Deposit USDC or USDT</li>
      <li>Create or join a match</li>
    </ul>
    ${btn('Find a Match', 'https://raisegg.gg/play')}
    <p style="color:#888;font-size:13px;margin-top:20px;">Starting ELO: 1000 (Silver). Win matches to climb.</p>
  `))
}

export async function sendWelcomeEmail(username: string, email: string) {
  return sendWelcome(email, username)
}

export async function sendMatchJoined(to: string, username: string, opponentName: string, stake: number, game: string) {
  return resendSend(to, `Match locked — ${opponentName} joined your ${game.toUpperCase()} lobby`, baseTemplate(`
    <h2 style="color:white;margin:0 0 16px;">Match Locked 🔒</h2>
    <p><strong>${opponentName}</strong> joined your ${game.toUpperCase()} stake match.</p>
    <table style="width:100%;margin:16px 0;font-size:14px;">
      <tr><td style="color:#888;padding:4px 0;">Game</td><td style="color:white;text-align:right;">${game.toUpperCase()}</td></tr>
      <tr><td style="color:#888;padding:4px 0;">Stake</td><td style="color:#00e6ff;text-align:right;font-weight:700;">$${stake.toFixed(2)}</td></tr>
      <tr><td style="color:#888;padding:4px 0;">Opponent</td><td style="color:white;text-align:right;">${opponentName}</td></tr>
    </table>
    ${btn('View Match', 'https://raisegg.gg/dashboard/matches')}
    <p style="color:#888;font-size:13px;margin-top:16px;">Both stakes are locked in the smart contract. Good luck!</p>
  `))
}

export async function sendMatchResult(to: string, username: string, won: boolean, payout: number, game: string, opponentName: string) {
  const emoji = won ? '🏆' : '💀'
  const title = won ? 'You Won!' : 'Match Over'
  const color = won ? '#22c55e' : '#ef4444'

  return resendSend(
    to,
    won ? `You won $${payout.toFixed(2)} — ${game.toUpperCase()} vs ${opponentName}` : `Match lost — ${game.toUpperCase()} vs ${opponentName}`,
    baseTemplate(`
      <h2 style="color:${color};margin:0 0 16px;">${title} ${emoji}</h2>
      <p>Your ${game.toUpperCase()} match against <strong>${opponentName}</strong> has been resolved.</p>
      <table style="width:100%;margin:16px 0;font-size:14px;">
        <tr><td style="color:#888;padding:4px 0;">Result</td><td style="color:${color};text-align:right;font-weight:700;">${won ? 'Victory' : 'Defeat'}</td></tr>
        ${won ? `<tr><td style="color:#888;padding:4px 0;">Payout</td><td style="color:#22c55e;text-align:right;font-weight:700;">+$${payout.toFixed(2)}</td></tr>` : ''}
      </table>
      ${btn(won ? 'Play Again' : 'Rematch', 'https://raisegg.gg/play')}
      ${won ? `<p style="margin-top:16px;"><a href="https://raisegg.gg/api/pnl-card?username=${encodeURIComponent(username)}&opponent=${encodeURIComponent(opponentName)}&game=${encodeURIComponent(game)}&result=win&payout=${payout.toFixed(2)}&stake=${(payout / 1.8).toFixed(2)}" style="color:#00e6ff;text-decoration:none;font-size:13px;">📊 View & Share your PnL Card</a></p>` : ''}
    `)
  )
}

export async function sendMatchResultEmail(email: string, matchData: {
  username: string
  won: boolean
  payout: number
  game: string
  opponentName: string
}) {
  return sendMatchResult(email, matchData.username, matchData.won, matchData.payout, matchData.game, matchData.opponentName)
}

export async function sendStreakEmail(email: string, streakCount: number) {
  const milestoneRewards: Record<number, string> = {
    3: '0.50 USDC bonus',
    5: '1.00 USDC bonus + streak badge',
    10: '5.00 USDC bonus + gold streak badge',
    25: '25.00 USDC bonus + legendary streak badge',
  }
  const reward = milestoneRewards[streakCount] || 'bragging rights'

  return resendSend(email, `🔥 ${streakCount}-Win Streak! You're on fire!`, baseTemplate(`
    <h2 style="color:#f59e0b;margin:0 0 16px;">🔥 ${streakCount}-Win Streak!</h2>
    <p>You've won <strong style="color:#00e6ff;">${streakCount} matches in a row</strong>. That's insane.</p>
    <div style="background:#1a1a3a;border:1px solid #2a2a5a;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">🔥</div>
      <div style="font-size:32px;font-weight:800;color:#f59e0b;">${streakCount}</div>
      <div style="color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Consecutive Wins</div>
      ${reward !== 'bragging rights' ? `<div style="color:#22c55e;font-size:14px;margin-top:8px;font-weight:600;">Reward: ${reward}</div>` : ''}
    </div>
    <p>Keep the streak alive — or risk it all on a higher-stakes match.</p>
    ${btn('Continue Streak', 'https://raisegg.gg/play')}
    <p style="color:#888;font-size:13px;margin-top:16px;">Your streak is visible on your profile and the leaderboard.</p>
  `))
}

export async function sendWithdrawal(to: string, username: string, amount: number, currency: string, txSignature: string) {
  return resendSend(to, `Withdrawal confirmed — $${amount.toFixed(2)} ${currency.toUpperCase()} sent`, baseTemplate(`
    <h2 style="color:white;margin:0 0 16px;">Withdrawal Confirmed</h2>
    <p>Your withdrawal has been processed and sent to your wallet.</p>
    <table style="width:100%;margin:16px 0;font-size:14px;">
      <tr><td style="color:#888;padding:4px 0;">Amount</td><td style="color:#00e6ff;text-align:right;font-weight:700;">$${amount.toFixed(2)}</td></tr>
      <tr><td style="color:#888;padding:4px 0;">Currency</td><td style="color:white;text-align:right;">${currency.toUpperCase()}</td></tr>
      <tr><td style="color:#888;padding:4px 0;">Transaction</td><td style="color:white;text-align:right;font-size:12px;">${txSignature.slice(0, 16)}...</td></tr>
    </table>
    ${btn('View Balance', 'https://raisegg.gg/dashboard/wallet')}
    <p style="color:#888;font-size:13px;margin-top:16px;">If you did not initiate this withdrawal, please contact support immediately.</p>
  `))
}

export async function sendNewsletterWelcome(to: string) {
  return resendSend(to, 'Welcome to the RaiseGG Newsletter!', baseTemplate(`
    <h2 style="color:white;margin:0 0 16px;">You're Subscribed! 🎉</h2>
    <p>Thanks for joining the RaiseGG newsletter. You'll get weekly updates on:</p>
    <ul style="padding-left:20px;">
      <li>New features & game support</li>
      <li>Tournament announcements</li>
      <li>Platform stats & leaderboards</li>
      <li>Exclusive promotions</li>
    </ul>
    ${btn('Visit RaiseGG', 'https://raisegg.gg')}
    <p style="color:#888;font-size:12px;margin-top:20px;">You can unsubscribe anytime by clicking the link at the bottom of any email.</p>
  `))
}

export async function sendBulkNewsletter(emails: string[], subject: string, htmlBody: string) {
  const wrapped = baseTemplate(htmlBody)
  const results: { email: string; ok: boolean; error?: string }[] = []

  for (const email of emails) {
    try {
      const result = await resendSend(email, subject, wrapped)
      results.push({ email, ok: result.ok, error: result.ok ? undefined : (result as { error?: string }).error })
    } catch (_) {
      results.push({ email, ok: false, error: 'Send failed' })
    }
  }

  return results
}

export async function sendMatchCancelled(to: string, username: string, stake: number, reason: string) {
  return resendSend(to, `Match cancelled — $${stake.toFixed(2)} refunded`, baseTemplate(`
    <h2 style="color:white;margin:0 0 16px;">Match Cancelled</h2>
    <p>Your stake of <strong style="color:#00e6ff;">$${stake.toFixed(2)}</strong> has been refunded to your balance.</p>
    <p style="color:#888;">Reason: ${reason}</p>
    ${btn('Create New Match', 'https://raisegg.gg/play')}
  `))
}

export async function sendStreamerApplicationConfirmation(to: string, twitchUsername: string) {
  return resendSend(to, 'Streamer Application Received — RaiseGG', baseTemplate(`
    <h2 style="color:white;margin:0 0 16px;">Application Received! 📺</h2>
    <p>Thanks for applying to the <strong style="color:#00e6ff;">RaiseGG Streamer Partnership Program</strong>, <strong>${twitchUsername}</strong>.</p>
    <p>We review every application manually. You'll hear back from us within <strong>48 hours</strong>.</p>
    <div style="background:#1a1a3a;border:1px solid #2a2a5a;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">What happens next:</p>
      <ol style="padding-left:20px;margin:0;">
        <li>We verify your channel and viewer count</li>
        <li>If approved, you get your affiliate link + custom overlay</li>
        <li>Start streaming and earning per referral</li>
      </ol>
    </div>
    ${btn('Back to RaiseGG', 'https://raisegg.gg')}
  `))
}
