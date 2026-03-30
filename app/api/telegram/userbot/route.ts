/**
 * API route for Telegram userbot operations.
 * Allows Claude to search groups, join them, post messages, etc.
 * Protected by CRON_SECRET.
 */

import { NextResponse } from 'next/server'
import {
  isUserbotConfigured,
  searchGroups,
  joinGroup,
  leaveGroup,
  sendMessage,
  getJoinedGroups,
  getGroupMessages,
  postToMultipleGroups,
  searchAndJoinGroups,
} from '@/lib/telegram-userbot'

export const maxDuration = 120

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isUserbotConfigured()) {
    return NextResponse.json({
      error: 'Telegram userbot not configured. Run: npx tsx scripts/telegram-auth.ts',
      setup: {
        step1: 'Go to https://my.telegram.org → API Development Tools → create app',
        step2: 'Set TELEGRAM_API_ID and TELEGRAM_API_HASH env vars',
        step3: 'Run: npx tsx scripts/telegram-auth.ts',
        step4: 'Add TELEGRAM_SESSION to Vercel env vars',
      },
    }, { status: 400 })
  }

  const body = await req.json()
  const { action } = body

  try {
    switch (action) {
      case 'search': {
        const groups = await searchGroups(body.query, body.limit || 20)
        return NextResponse.json({ ok: true, groups })
      }

      case 'join': {
        const result = await joinGroup(body.username)
        return NextResponse.json(result)
      }

      case 'leave': {
        const result = await leaveGroup(body.username)
        return NextResponse.json(result)
      }

      case 'send': {
        const result = await sendMessage(body.target, body.text, {
          replyTo: body.replyTo,
          silent: body.silent,
        })
        return NextResponse.json(result)
      }

      case 'list': {
        const groups = await getJoinedGroups()
        return NextResponse.json({ ok: true, groups })
      }

      case 'messages': {
        const messages = await getGroupMessages(body.target, body.limit || 20)
        return NextResponse.json({ ok: true, messages })
      }

      case 'blast': {
        // Post to multiple groups with delay
        const results = await postToMultipleGroups(
          body.groups,
          body.text,
          body.delayMs || 30000
        )
        return NextResponse.json({ ok: true, results })
      }

      case 'search_and_join': {
        // Search for groups and auto-join them
        const results = await searchAndJoinGroups(
          body.keywords,
          body.maxPerKeyword || 5,
          body.delayMs || 5000
        )
        return NextResponse.json({ ok: true, results })
      }

      default:
        return NextResponse.json({
          error: 'Unknown action',
          available: ['search', 'join', 'leave', 'send', 'list', 'messages', 'blast', 'search_and_join'],
        }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
