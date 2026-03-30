/**
 * POST /api/discord/bot — Discord bot API
 * Protected by CRON_SECRET.
 *
 * Actions: servers, send, messages, find_lfg, blast_lfg
 */

import { NextResponse } from 'next/server'
import {
  isConfigured,
  searchServers,
  sendToChannel,
  getChannelMessages,
  findLFGChannels,
  findAllLFGChannels,
  postToAllLFG,
} from '@/lib/discord-bot'

export const maxDuration = 120

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    return NextResponse.json({ error: 'DISCORD_BOT_TOKEN not configured' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { action, channelId, guildId, text, limit } = body as {
      action: string
      channelId?: string
      guildId?: string
      text?: string
      limit?: number
    }

    let result: unknown

    switch (action) {
      case 'servers':
        result = await searchServers()
        break

      case 'send':
        if (!channelId || !text) {
          return NextResponse.json({ error: 'channelId and text required' }, { status: 400 })
        }
        result = await sendToChannel(channelId, text)
        break

      case 'messages':
        if (!channelId) {
          return NextResponse.json({ error: 'channelId required' }, { status: 400 })
        }
        result = await getChannelMessages(channelId, limit ?? 20)
        break

      case 'find_lfg':
        if (guildId) {
          result = await findLFGChannels(guildId)
        } else {
          result = await findAllLFGChannels()
        }
        break

      case 'blast_lfg':
        if (!text) {
          return NextResponse.json({ error: 'text required' }, { status: 400 })
        }
        result = await postToAllLFG(text)
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: servers, send, messages, find_lfg, blast_lfg` },
          { status: 400 }
        )
    }

    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
