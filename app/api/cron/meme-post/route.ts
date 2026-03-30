/**
 * Cron: Meme auto-poster
 * Posts gaming memes to joined Telegram groups via userbot.
 * Runs every 12 hours, alternating with marketing posts for natural feel.
 *
 * Schedule: Every 12 hours (2x/day)
 */

import { NextResponse } from 'next/server'
import { isUserbotConfigured, sendMessage, getJoinedGroups } from '@/lib/telegram-userbot'
import { recordCronRun } from '@/lib/monitor'
import { getMemeForPosting } from '@/lib/meme-templates'

export const maxDuration = 60

/** Detect the likely language for a group based on its title */
function detectGroupLang(title: string): 'en' | 'tr' | 'ru' {
  const lower = title.toLowerCase()

  // Turkish indicators
  if (/turkish|turkiye|istanbul|ankara|izmir|türk|cs2.*tr|tr.*cs2/.test(lower)) return 'tr'
  // Russian/CIS indicators
  if (/русский|россия|снг|cis|ukraine|казахстан|кз|ru\b/.test(lower)) return 'ru'
  // Cyrillic chars suggest Russian
  if (/[а-яА-Я]/.test(title)) return 'ru'
  // Turkish chars
  if (/[ğüşöçıİ]/.test(title)) return 'tr'

  return 'en'
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  if (!isUserbotConfigured()) {
    await recordCronRun('meme-post', 'ok', {
      message: 'Userbot not configured — skipped',
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ message: 'Userbot not configured' })
  }

  try {
    // Get all joined groups
    const groups = await getJoinedGroups()
    const eligibleGroups = groups.filter(g => g.type === 'group')

    if (eligibleGroups.length === 0) {
      await recordCronRun('meme-post', 'ok', {
        message: 'No groups joined',
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ message: 'No groups joined' })
    }

    // Pick a random group
    const group = eligibleGroups[Math.floor(Math.random() * eligibleGroups.length)]
    const groupLang = detectGroupLang(group.title)

    // Get a meme — override language to match group
    let meme = getMemeForPosting()
    // Retry up to 5 times to match group language
    for (let i = 0; i < 5; i++) {
      if (meme.lang === groupLang) break
      meme = getMemeForPosting()
    }
    // If still mismatched, just use whatever we got — memes transcend language

    // Prefer username (GramJS resolves it reliably), fall back to numeric ID
    const target = group.username ? group.username : group.id
    const result = await sendMessage(target, meme.text, { silent: true })

    const msg = result.ok
      ? `Posted meme to "${group.title}" (${meme.lang}): ${meme.text.slice(0, 60)}...`
      : `Failed to post to "${group.title}": ${result.error}`

    await recordCronRun('meme-post', result.ok ? 'ok' : 'error', {
      message: msg,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      success: result.ok,
      group: group.title,
      meme: meme.text.slice(0, 100),
      lang: meme.lang,
      messageId: result.messageId,
    })
  } catch (err) {
    await recordCronRun('meme-post', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
