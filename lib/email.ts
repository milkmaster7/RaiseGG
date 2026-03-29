import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? 'hello@raisegg.com',
    pass: process.env.SMTP_PASS ?? '',
  },
})

const FROM = 'RaiseGG <hello@raisegg.com>'

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
          RaiseGG.gg — Competitive Stake Matches<br>
          <a href="https://raisegg.com" style="color:#00e6ff;text-decoration:none;">raisegg.com</a> ·
          <a href="https://t.me/raisegg" style="color:#00e6ff;text-decoration:none;">Telegram</a>
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

export async function sendWelcome(to: string, username: string) {
  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Welcome to RaiseGG, ${username}!`,
    html: baseTemplate(`
      <h2 style="color:white;margin:0 0 16px;">Welcome, ${username} 🎮</h2>
      <p>Your RaiseGG account is live. You're ready to compete in CS2, Dota 2 and Deadlock stake matches.</p>
      <p><strong>Next steps:</strong></p>
      <ul style="padding-left:20px;">
        <li>Connect your Phantom wallet</li>
        <li>Deposit USDC or USDT</li>
        <li>Create or join a match</li>
      </ul>
      ${btn('Find a Match', 'https://raisegg.com/play')}
      <p style="color:#888;font-size:13px;margin-top:20px;">Starting ELO: 1000 (Silver). Win matches to climb.</p>
    `),
  })
}

export async function sendMatchJoined(to: string, username: string, opponentName: string, stake: number, game: string) {
  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Match locked — ${opponentName} joined your ${game.toUpperCase()} lobby`,
    html: baseTemplate(`
      <h2 style="color:white;margin:0 0 16px;">Match Locked 🔒</h2>
      <p><strong>${opponentName}</strong> joined your ${game.toUpperCase()} stake match.</p>
      <table style="width:100%;margin:16px 0;font-size:14px;">
        <tr><td style="color:#888;padding:4px 0;">Game</td><td style="color:white;text-align:right;">${game.toUpperCase()}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Stake</td><td style="color:#00e6ff;text-align:right;font-weight:700;">$${stake.toFixed(2)}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Opponent</td><td style="color:white;text-align:right;">${opponentName}</td></tr>
      </table>
      ${btn('View Match', 'https://raisegg.com/dashboard/matches')}
      <p style="color:#888;font-size:13px;margin-top:16px;">Both stakes are locked in the smart contract. Good luck!</p>
    `),
  })
}

export async function sendMatchResult(to: string, username: string, won: boolean, payout: number, game: string, opponentName: string) {
  const emoji = won ? '🏆' : '💀'
  const title = won ? 'You Won!' : 'Match Over'
  const color = won ? '#22c55e' : '#ef4444'

  return transporter.sendMail({
    from: FROM,
    to,
    subject: won ? `You won $${payout.toFixed(2)} — ${game.toUpperCase()} vs ${opponentName}` : `Match lost — ${game.toUpperCase()} vs ${opponentName}`,
    html: baseTemplate(`
      <h2 style="color:${color};margin:0 0 16px;">${title} ${emoji}</h2>
      <p>Your ${game.toUpperCase()} match against <strong>${opponentName}</strong> has been resolved.</p>
      <table style="width:100%;margin:16px 0;font-size:14px;">
        <tr><td style="color:#888;padding:4px 0;">Result</td><td style="color:${color};text-align:right;font-weight:700;">${won ? 'Victory' : 'Defeat'}</td></tr>
        ${won ? `<tr><td style="color:#888;padding:4px 0;">Payout</td><td style="color:#22c55e;text-align:right;font-weight:700;">+$${payout.toFixed(2)}</td></tr>` : ''}
      </table>
      ${btn(won ? 'Play Again' : 'Rematch', 'https://raisegg.com/play')}
    `),
  })
}

export async function sendMatchCancelled(to: string, username: string, stake: number, reason: string) {
  return transporter.sendMail({
    from: FROM,
    to,
    subject: `Match cancelled — $${stake.toFixed(2)} refunded`,
    html: baseTemplate(`
      <h2 style="color:white;margin:0 0 16px;">Match Cancelled</h2>
      <p>Your stake of <strong style="color:#00e6ff;">$${stake.toFixed(2)}</strong> has been refunded to your balance.</p>
      <p style="color:#888;">Reason: ${reason}</p>
      ${btn('Create New Match', 'https://raisegg.com/play')}
    `),
  })
}
