/**
 * lib/telegram.ts — Telegram channel posting for RaiseGG
 *
 * Posts news, match results, and platform updates to the RaiseGG Telegram channel.
 * Uses TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID env vars.
 * Falls back to TELEGRAM_CHAT_ID (owner DM) if no channel configured.
 */

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? ''
const CHANNEL_ID = () => process.env.TELEGRAM_CHANNEL_ID ?? process.env.TELEGRAM_CHAT_ID ?? ''

// ─── Core send ──────────────────────────────────────────────────────────────

async function send(
  chatId: string,
  text: string,
  opts?: { disablePreview?: boolean; photo?: string }
): Promise<boolean> {
  const token = BOT_TOKEN()
  if (!token || !chatId) return false

  try {
    if (opts?.photo) {
      // Send photo with caption
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: opts.photo,
          caption: text,
          parse_mode: 'HTML',
        }),
        signal: AbortSignal.timeout(8000),
      })
      return res.ok
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: opts?.disablePreview ?? false,
      }),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Channel posting ────────────────────────────────────────────────────────

/** Post to the public RaiseGG channel */
export async function postToChannel(
  text: string,
  opts?: { disablePreview?: boolean; photo?: string }
): Promise<boolean> {
  return send(CHANNEL_ID(), text, opts)
}

// ─── Formatted posts ────────────────────────────────────────────────────────

/** Post a new blog article to the channel */
export async function postBlogArticle(article: {
  title: string
  slug: string
  excerpt: string
  imageUrl?: string
}): Promise<boolean> {
  const url = `https://raisegg.com/blog/${article.slug}`
  const text = [
    `<b>New on the blog: ${escapeHtml(article.title)}</b>`,
    '',
    escapeHtml(article.excerpt.slice(0, 200)) + (article.excerpt.length > 200 ? '...' : ''),
    '',
    `<a href="${url}">Read more →</a>`,
  ].join('\n')

  return postToChannel(text, { photo: article.imageUrl })
}

/** Post match result to the channel */
export async function postMatchResult(match: {
  id: string
  player1: string
  player2: string
  winner: string
  map: string
  score: string
  stake: string
  currency: string
}): Promise<boolean> {
  const url = `https://raisegg.com/matches/${match.id}`
  const text = [
    `<b>Match Complete</b>`,
    '',
    `Map: ${escapeHtml(match.map)} — ${escapeHtml(match.score)}`,
    `Winner: <b>${escapeHtml(match.winner)}</b>`,
    `Stake: ${escapeHtml(match.stake)} ${escapeHtml(match.currency)}`,
    '',
    `<a href="${url}">View details →</a>`,
  ].join('\n')

  return postToChannel(text, { disablePreview: true })
}

/** Post platform update / announcement */
export async function postAnnouncement(
  title: string,
  body: string,
  link?: string
): Promise<boolean> {
  const lines = [
    `<b>${escapeHtml(title)}</b>`,
    '',
    escapeHtml(body),
  ]
  if (link) lines.push('', `<a href="${link}">Learn more →</a>`)

  return postToChannel(lines.join('\n'), { disablePreview: !link })
}

/** Post daily tournament announcement */
export async function postTournament(tournament: {
  name: string
  map: string
  entryFee: string
  currency: string
  maxPlayers: number
  startTime: string
}): Promise<boolean> {
  const text = [
    `<b>Daily Tournament: ${escapeHtml(tournament.name)}</b>`,
    '',
    `Map: ${escapeHtml(tournament.map)}`,
    `Entry: ${escapeHtml(tournament.entryFee)} ${escapeHtml(tournament.currency)}`,
    `Slots: ${tournament.maxPlayers}`,
    `Starts: ${escapeHtml(tournament.startTime)}`,
    '',
    `<a href="https://raisegg.com/tournaments">Join now →</a>`,
  ].join('\n')

  return postToChannel(text, { disablePreview: true })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
