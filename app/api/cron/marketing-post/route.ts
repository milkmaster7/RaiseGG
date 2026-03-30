/**
 * Cron: Marketing auto-poster
 * Runs daily — posts tournament announcements and promotional content
 * to joined Telegram groups in rotation (1-2 groups per run to avoid spam).
 *
 * Schedule: Every 6 hours (4x/day)
 */

import { NextResponse } from 'next/server'
import { isUserbotConfigured, sendMessage, getJoinedGroups } from '@/lib/telegram-userbot'
import { recordCronRun } from '@/lib/monitor'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 120

// Messages rotate — each run picks the next one
const MESSAGES = {
  en: [
    '<b>Free CS2 Tournament Tonight!</b>\n\n$5 USDC prize pool. 8 players, single elimination.\nNo entry fee. Anti-cheat protected.\n\nRep your city!\nhttps://raisegg.com/tournaments',
    'Looking for competitive CS2 players!\n\n1v1, 2v2, or 5v5 for real money (USDC/USDT).\nBlockchain escrow — your money is safe.\nFree daily tournaments with prizes.\n\nhttps://raisegg.com',
    '<b>RaiseGG — Stake on your CS2 skills</b>\n\nOn-chain escrow. Anti-cheat. Instant payouts.\nFree tournaments every day — $5 USDC prize.\n\nBuilt for Turkey, Caucasus, Balkans, CIS.\nhttps://raisegg.com/play',
    'City vs City CS2 — who is the best?\n\nIstanbul vs Ankara\nTbilisi vs Baku\nBelgrade vs Bucharest\n\nFree tournaments, real prizes.\nhttps://raisegg.com/tournaments',
    '<b>Dota 2 stake matches are LIVE</b>\n\n1v1 mid or full 5v5 — put your MMR where your mouth is.\nUSDC/USDT escrow. Anti-cheat. Instant payout.\n\nhttps://raisegg.com/play',
    'Any Dota 2 players want to compete for real money?\n\nRaiseGG — blockchain escrow, anti-cheat, free daily tournaments.\nCS2 + Dota 2 + Deadlock.\n\nhttps://raisegg.com',
    '<b>Deadlock is on RaiseGG!</b>\n\nValve\'s new game. Stake matches. Win prizes.\nBlockchain escrow — no scams, instant payouts.\n\nJoin the first Deadlock stake platform.\nhttps://raisegg.com/play',
    'CS2, Dota 2, or Deadlock — pick your game.\n\nStake real money. Win real prizes.\nFree tournaments every day. City rivalries.\n\nhttps://raisegg.com/tournaments',
  ],
  tr: [
    '<b>Bu gece ucretsiz CS2 turnuvasi!</b>\n\n$5 USDC odul havuzu. 8 kisi, tek eleme.\nGiris ucretsiz. Anti-cheat korumali.\n\nSehrinizi temsil edin!\nhttps://raisegg.com/tournaments',
    'CS2 de kendine guveniyorsan bunu dene:\n\n1v1, 2v2, 5v5 gercek para icin.\nBlockchain escrow — paraniz guvenli.\nHer gun ucretsiz turnuva.\n\nhttps://raisegg.com',
    '<b>Istanbul vs Ankara — hangi sehir daha iyi CS2 oynar?</b>\n\nRaiseGG de sehirler arasi turnuvalar.\nUcretsiz giris, $5 USDC odul.\n\nhttps://raisegg.com/tournaments',
    'RaiseGG — CS2 becerilerine para yatir!\n\nOn-chain escrow. Anti-cheat. Aninda odeme.\nHer gun ucretsiz turnuva.\n\nhttps://raisegg.com/play',
    '<b>Dota 2 stake maclari basliyor!</b>\n\n1v1 mid veya 5v5 — MMR ini kanitla.\nUSDC escrow. Gercek para. Aninda odeme.\n\nhttps://raisegg.com/play',
    'CS2, Dota 2, Deadlock — oyununu sec.\n\nGercek para icin oyna. Ucretsiz turnuvalar.\nSehirler arasi rekabet.\n\nhttps://raisegg.com/tournaments',
  ],
  ru: [
    '<b>Бесплатный турнир CS2 сегодня!</b>\n\n$5 USDC призовой фонд. 8 игроков.\nВход бесплатный. Античит.\n\nhttps://raisegg.com/tournaments',
    'Ищем игроков CS2 из СНГ!\n\n1v1, 2v2, 5v5 на реальные деньги (USDC/USDT).\nБлокчейн эскроу. Бесплатные турниры.\n\nhttps://raisegg.com',
    '<b>RaiseGG — ставь на свой скилл в CS2</b>\n\nЭскроу на блокчейне. Античит. Мгновенные выплаты.\nБесплатные турниры каждый день.\n\nhttps://raisegg.com/play',
    '<b>Dota 2 — ставки на мастерство!</b>\n\n1v1 мид или 5v5. USDC эскроу.\nАнтичит. Мгновенные выплаты.\n\nhttps://raisegg.com/play',
    'CS2, Dota 2, Deadlock — выбирай игру.\n\nРеальные деньги. Бесплатные турниры.\nГорода соревнуются друг с другом.\n\nhttps://raisegg.com/tournaments',
  ],
}

/** Get today's message index based on hour rotation */
function getMessageIndex(hour: number, totalMessages: number): number {
  return Math.floor(hour / 6) % totalMessages
}

/** Determine language for a group based on its title */
function detectLanguage(title: string): 'tr' | 'ru' | 'en' {
  const titleLower = title.toLowerCase()
  if (/türk|turkey|istanbul|ankara|izmir|türkiye/i.test(titleLower)) return 'tr'
  if (/русск|снг|cis|казах|украин|россия|миксы|тимм/i.test(titleLower)) return 'ru'
  return 'en'
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isUserbotConfigured()) {
    await recordCronRun('marketing-post', 'error', { message: 'Userbot not configured' })
    return NextResponse.json({ error: 'Userbot not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    // Get all joined groups
    const allGroups = await getJoinedGroups()
    const groups = allGroups.filter(g => g.type === 'group') // Only post to groups, not channels

    if (groups.length === 0) {
      await recordCronRun('marketing-post', 'ok', { message: 'No groups joined yet' })
      return NextResponse.json({ message: 'No groups to post to' })
    }

    const now = new Date()
    const hour = now.getUTCHours()
    const dayOfYear = Math.floor((now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86400000)

    // Pick 2 groups per run (rotate through all groups over days)
    const startIdx = (dayOfYear * 4 + Math.floor(hour / 6)) * 2
    const selectedGroups = []
    for (let i = 0; i < 2 && i < groups.length; i++) {
      selectedGroups.push(groups[(startIdx + i) % groups.length])
    }

    const results = []

    for (const group of selectedGroups) {
      const lang = detectLanguage(group.title)
      const msgs = MESSAGES[lang]
      const msgIdx = getMessageIndex(hour, msgs.length)
      const text = msgs[msgIdx]

      // Wait 30s between posts to avoid flood
      if (results.length > 0) {
        await new Promise(r => setTimeout(r, 30000))
      }

      const target = group.username || group.id
      const result = await sendMessage(target, text)
      results.push({
        group: group.title,
        username: group.username,
        lang,
        ok: result.ok,
        error: result.error,
      })
    }

    await recordCronRun('marketing-post', 'ok', {
      message: `Posted to ${results.filter(r => r.ok).length}/${results.length} groups: ${results.map(r => r.group).join(', ')}`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    await recordCronRun('marketing-post', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
