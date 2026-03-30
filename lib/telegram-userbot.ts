/**
 * lib/telegram-userbot.ts — Telegram userbot for RaiseGG marketing
 *
 * Uses GramJS (MTProto) to act as a real user account.
 * Can join groups, post messages, search for groups, etc.
 *
 * Requires: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION env vars.
 * Run scripts/telegram-auth.ts once to generate the session.
 */

import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'

let _client: TelegramClient | null = null

/** Get or create the Telegram user client */
async function getClient(): Promise<TelegramClient | null> {
  if (_client?.connected) return _client

  const apiId = parseInt(process.env.TELEGRAM_API_ID || '0')
  const apiHash = process.env.TELEGRAM_API_HASH || ''
  const session = process.env.TELEGRAM_SESSION || ''

  if (!apiId || !apiHash || !session) return null

  _client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 3,
  })

  await _client.connect()
  return _client
}

/** Check if userbot is configured */
export function isUserbotConfigured(): boolean {
  return !!(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH && process.env.TELEGRAM_SESSION)
}

// ─── Group Operations ──────────────────────────────────────────────────────

/** Search for public groups/channels by keyword */
export async function searchGroups(query: string, limit = 20): Promise<Array<{
  id: string
  title: string
  username: string | null
  memberCount: number
  type: 'group' | 'channel'
}>> {
  const client = await getClient()
  if (!client) return []

  try {
    const result = await client.invoke(new Api.contacts.Search({ q: query, limit }))
    const groups: Array<{ id: string; title: string; username: string | null; memberCount: number; type: 'group' | 'channel' }> = []

    for (const chat of result.chats) {
      if (chat instanceof Api.Channel) {
        groups.push({
          id: chat.id.toString(),
          title: chat.title,
          username: chat.username || null,
          memberCount: chat.participantsCount || 0,
          type: chat.megagroup ? 'group' : 'channel',
        })
      }
    }

    return groups
  } catch (err) {
    console.error('searchGroups error:', err)
    return []
  }
}

/** Join a public group/channel by username */
export async function joinGroup(username: string): Promise<{ ok: boolean; error?: string }> {
  const client = await getClient()
  if (!client) return { ok: false, error: 'Userbot not configured' }

  try {
    await client.invoke(new Api.channels.JoinChannel({
      channel: username.replace('@', ''),
    }))
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) }
  }
}

/** Leave a group/channel by username */
export async function leaveGroup(username: string): Promise<{ ok: boolean; error?: string }> {
  const client = await getClient()
  if (!client) return { ok: false, error: 'Userbot not configured' }

  try {
    const entity = await client.getEntity(username.replace('@', ''))
    await client.invoke(new Api.channels.LeaveChannel({ channel: entity as any }))
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) }
  }
}

/** Send a message to a group/channel/user */
export async function sendMessage(
  target: string,
  text: string,
  opts?: { replyTo?: number; silent?: boolean }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const client = await getClient()
  if (!client) return { ok: false, error: 'Userbot not configured' }

  try {
    // If target looks like a numeric ID, convert to number for GramJS
    const peer = /^\d+$/.test(target) ? BigInt(target) : target
    const result = await client.sendMessage(peer, {
      message: text,
      parseMode: 'html',
      silent: opts?.silent,
      replyTo: opts?.replyTo,
    })
    return { ok: true, messageId: result.id }
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) }
  }
}

/** Get list of groups/channels the user has joined */
export async function getJoinedGroups(): Promise<Array<{
  id: string
  title: string
  username: string | null
  type: 'group' | 'channel'
}>> {
  const client = await getClient()
  if (!client) return []

  try {
    const dialogs = await client.getDialogs({ limit: 200 })
    const groups: Array<{ id: string; title: string; username: string | null; type: 'group' | 'channel' }> = []

    for (const dialog of dialogs) {
      if (dialog.isGroup || dialog.isChannel) {
        groups.push({
          id: dialog.id?.toString() || '',
          title: dialog.title || '',
          username: (dialog.entity as any)?.username || null,
          type: dialog.isGroup ? 'group' : 'channel',
        })
      }
    }

    return groups
  } catch (err) {
    console.error('getJoinedGroups error:', err)
    return []
  }
}

/** Get recent messages from a group */
export async function getGroupMessages(
  target: string,
  limit = 20
): Promise<Array<{ id: number; text: string; date: number; sender: string }>> {
  const client = await getClient()
  if (!client) return []

  try {
    const messages = await client.getMessages(target, { limit })
    return messages.map(m => ({
      id: m.id,
      text: m.text || '',
      date: m.date || 0,
      sender: (m.sender as any)?.firstName || (m.sender as any)?.title || 'Unknown',
    }))
  } catch (err) {
    console.error('getGroupMessages error:', err)
    return []
  }
}

// ─── Marketing Automation ──────────────────────────────────────────────────

/** Post a message to multiple groups with delay between each */
export async function postToMultipleGroups(
  groups: string[],
  text: string,
  delayMs = 30000
): Promise<Array<{ group: string; ok: boolean; error?: string }>> {
  const results: Array<{ group: string; ok: boolean; error?: string }> = []

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    const result = await sendMessage(group, text)
    results.push({ group, ...result })

    // Wait between posts to avoid flood limits
    if (i < groups.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}

/** Search and join groups matching keywords */
export async function searchAndJoinGroups(
  keywords: string[],
  maxPerKeyword = 5,
  delayMs = 5000
): Promise<Array<{ keyword: string; groups: Array<{ title: string; username: string | null; joined: boolean; error?: string }> }>> {
  const results: Array<{ keyword: string; groups: Array<{ title: string; username: string | null; joined: boolean; error?: string }> }> = []

  for (const keyword of keywords) {
    const found = await searchGroups(keyword, maxPerKeyword)
    const groupResults: Array<{ title: string; username: string | null; joined: boolean; error?: string }> = []

    for (const group of found) {
      if (group.username) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        const joinResult = await joinGroup(group.username)
        groupResults.push({
          title: group.title,
          username: group.username,
          joined: joinResult.ok,
          error: joinResult.error,
        })
      } else {
        groupResults.push({
          title: group.title,
          username: null,
          joined: false,
          error: 'No public username — cannot join via link',
        })
      }
    }

    results.push({ keyword, groups: groupResults })
  }

  return results
}

/** Disconnect the client */
export async function disconnect(): Promise<void> {
  if (_client) {
    await _client.disconnect()
    _client = null
  }
}
