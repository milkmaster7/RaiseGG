/**
 * POST /api/marketing/platforms — Unified marketing platform API
 *
 * Routes actions to VK, HLTV, or Steam platform modules.
 * Protected by CRON_SECRET.
 *
 * Body: { platform: 'vk' | 'hltv' | 'steam', action: string, ...params }
 */

import { NextRequest, NextResponse } from 'next/server'
import * as vk from '@/lib/vk-poster'
import * as hltv from '@/lib/hltv-poster'
import * as steam from '@/lib/steam-community'

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { platform, action, ...params } = body as {
    platform: string
    action: string
    [key: string]: unknown
  }

  if (!platform || !action) {
    return NextResponse.json({ error: 'Missing platform or action' }, { status: 400 })
  }

  try {
    switch (platform) {
      // ─── VK ────────────────────────────────────────────────────────
      case 'vk': {
        if (!vk.isConfigured()) {
          return NextResponse.json({ error: 'VK not configured (missing VK_ACCESS_TOKEN)' }, { status: 400 })
        }

        if (action === 'postToWall') {
          const result = await vk.postToWall(
            params.groupId as string,
            params.message as string
          )
          return NextResponse.json(result)
        }

        if (action === 'postToMultipleGroups') {
          const result = await vk.postToMultipleGroups(params.message as string)
          return NextResponse.json(result)
        }

        if (action === 'searchCommunities') {
          const result = await vk.searchCommunities(
            params.query as string,
            (params.count as number) ?? 20
          )
          return NextResponse.json(result)
        }

        return NextResponse.json({ error: `Unknown VK action: ${action}` }, { status: 400 })
      }

      // ─── HLTV ──────────────────────────────────────────────────────
      case 'hltv': {
        if (action === 'postThread') {
          const result = await hltv.postThread(
            params.forumId as number,
            params.title as string,
            params.body as string
          )
          return NextResponse.json(result)
        }

        if (action === 'postReply') {
          const result = await hltv.postReply(
            params.threadId as string,
            params.body as string
          )
          return NextResponse.json(result)
        }

        if (action === 'generateContent') {
          const content = hltv.generateHLTVContent(
            (params.type as 'tournament' | 'platform') ?? 'tournament'
          )
          return NextResponse.json({ ok: true, content })
        }

        return NextResponse.json({ error: `Unknown HLTV action: ${action}` }, { status: 400 })
      }

      // ─── Steam ─────────────────────────────────────────────────────
      case 'steam': {
        if (action === 'postToGroup') {
          const result = await steam.postToGroup(
            params.groupUrl as string,
            params.title as string,
            params.body as string
          )
          return NextResponse.json(result)
        }

        if (action === 'getGroupMembers') {
          const result = await steam.getGroupMembers(params.groupUrl as string)
          return NextResponse.json(result)
        }

        return NextResponse.json({ error: `Unknown Steam action: ${action}` }, { status: 400 })
      }

      default:
        return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
