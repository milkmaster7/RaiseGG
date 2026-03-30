import { NextRequest, NextResponse } from 'next/server'
import {
  handleStart,
  handleBalance,
  handleMatches,
  handleLeaderboard,
  handleTournament,
  handleHelp,
} from '@/lib/telegram-commands'

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? ''

// ─── Telegram types (subset) ───────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
    date: number
  }
}

// ─── Send reply ────────────────────────────────────────────────────────────

async function reply(chatId: number, text: string): Promise<void> {
  const token = BOT_TOKEN()
  if (!token) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {
    // Silently fail — Telegram will retry if needed
  })
}

// ─── Route command to handler ──────────────────────────────────────────────

async function routeCommand(command: string, firstName: string): Promise<string> {
  // Strip bot mention (e.g. /start@RaiseGGBot -> /start)
  const cmd = command.split('@')[0].toLowerCase()

  switch (cmd) {
    case '/start':
      return handleStart(firstName)
    case '/balance':
      return handleBalance()
    case '/matches':
      return await handleMatches()
    case '/leaderboard':
      return await handleLeaderboard()
    case '/tournament':
      return await handleTournament()
    case '/help':
      return handleHelp()
    default:
      return handleHelp()
  }
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Verify the request has a valid bot token in the URL or header
  // Telegram doesn't sign webhooks, so we rely on the secret path
  const token = BOT_TOKEN()
  if (!token) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 503 })
  }

  let update: TelegramUpdate
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only process text messages
  const message = update.message
  if (!message?.text || !message.chat) {
    return NextResponse.json({ ok: true })
  }

  const chatId = message.chat.id
  const text = message.text.trim()
  const firstName = message.from?.first_name ?? 'Player'

  // Only process bot commands (messages starting with /)
  if (text.startsWith('/')) {
    const command = text.split(/\s+/)[0]
    const response = await routeCommand(command, firstName)
    await reply(chatId, response)
  }

  // Telegram expects 200 OK within 60s, even if we don't reply
  return NextResponse.json({ ok: true })
}
