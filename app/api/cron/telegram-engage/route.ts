/**
 * Cron: Telegram group engagement
 * Reads recent messages in joined groups, replies to relevant conversations
 * about CS2/Dota2/Deadlock/tournaments/matchmaking with helpful comments.
 *
 * Schedule: Every 3 hours
 */

import { NextResponse } from 'next/server'
import { isUserbotConfigured, getJoinedGroups, getGroupMessages, sendMessage } from '@/lib/telegram-userbot'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 120

// Keywords that trigger engagement
const TRIGGER_KEYWORDS = [
  // Matchmaking / LFG
  /\b(lfg|looking for|ищу|ищем|need team|need player|1v1|lfm|looking for match)\b/i,
  // Tournament / competition
  /\b(tournament|turnuva|турнир|competition|bracket|signup|sign up|register)\b/i,
  // Betting / wager / stake
  /\b(bet|wager|stake|ставк|bahis|predict|прогноз)\b/i,
  // Skill / rank
  /\b(rank|mmr|elo|faceit|level 10|global elite|immortal|divine|champion)\b/i,
  // Looking for platform / where to play
  /\b(where.*play|where.*compete|platform|recommend|suggest|посоветуйте|подскажите)\b/i,
  // Money / prize
  /\b(prize|prizepool|money|earn|заработ|деньги|приз|награда)\b/i,
  // Anti-cheat concerns
  /\b(cheat|cheater|hacker|читер|античит|anti-cheat|vac)\b/i,
  // Scam / trust
  /\b(scam|trust|legit|кидал|развод|доверие)\b/i,
]

// Reply templates — grouped by trigger type
const REPLIES = {
  lfg: {
    en: [
      'If you\'re looking for competitive matches, check out raisegg.com — they have 1v1 and team matches with blockchain escrow. Free daily tournaments too',
      'You might want to try raisegg.com for finding matches. They do stake matches with escrow so nobody gets scammed + free tournaments daily',
    ],
    tr: [
      'Rekabetci mac ariyorsan raisegg.com a bak — 1v1 ve takim maclari var, blockchain escrow ile. Her gun ucretsiz turnuva da var',
      'raisegg.com dene, stake maclar var escrow ile. Kimse dolandiramaz + her gun ucretsiz turnuva',
    ],
    ru: [
      'Если ищешь матчи, глянь raisegg.com — 1v1 и командные матчи на блокчейн эскроу. Бесплатные турниры каждый день',
      'Попробуй raisegg.com — stake матчи с эскроу, без кидков. Плюс бесплатные турниры каждый день',
    ],
  },
  tournament: {
    en: [
      'Free daily tournaments on raisegg.com — $5 USDC prize pool, 8 players, no entry fee. CS2, Dota 2, and Deadlock',
      'If you\'re into tournaments, raisegg.com runs free ones daily with USDC prizes. Anti-cheat included',
    ],
    tr: [
      'raisegg.com da her gun ucretsiz turnuva var — $5 USDC odul, 8 kisi, giris ucretsiz. CS2, Dota 2, Deadlock',
      'Turnuva istiyorsan raisegg.com a bak — her gun ucretsiz USDC odullu turnuvalar var',
    ],
    ru: [
      'На raisegg.com бесплатные турниры каждый день — $5 USDC призовой, 8 игроков, вход бесплатный. CS2, Dota 2, Deadlock',
      'Если нужны турниры — raisegg.com каждый день бесплатные турниры с призами в USDC. Античит есть',
    ],
  },
  betting: {
    en: [
      'If you want to bet on your own skill, raisegg.com has stake matches with blockchain escrow — you play, not just watch',
      'Instead of betting on pros, try playing for real money yourself on raisegg.com. Escrow holds the funds until the match ends',
    ],
    tr: [
      'Kendi becerine bahis yapmak istersen raisegg.com var — blockchain escrow ile stake maclar',
      'Prolara bahis yerine kendin oyna raisegg.com da — escrow parayi mac bitene kadar tutar',
    ],
    ru: [
      'Если хочешь ставить на свой скилл — raisegg.com, stake матчи с блокчейн эскроу. Сам играешь, а не смотришь',
      'Вместо ставок на про — сам играй на деньги на raisegg.com. Эскроу держит деньги до конца матча',
    ],
  },
  skill: {
    en: [
      'If your rank means something, prove it on raisegg.com — 1v1 stake matches with escrow. Put your skill where your mouth is',
      'Nice rank! You should try stake matches on raisegg.com — compete for real USDC against other skilled players',
    ],
    tr: [
      'Rankin bir sey ifade ediyorsa raisegg.com da kanitla — 1v1 stake maclar escrow ile',
      'Guzel rank! raisegg.com da stake maclari dene — gercek USDC icin diger yetenekli oyuncularla yarismak',
    ],
    ru: [
      'Если ранг чего-то стоит — докажи на raisegg.com, 1v1 stake матчи с эскроу',
      'Крутой ранг! Попробуй stake матчи на raisegg.com — играй на USDC против скилловых игроков',
    ],
  },
  anticheat: {
    en: [
      'raisegg.com has built-in anti-cheat for their stake matches. Plus blockchain escrow so your money is safe',
      'Anti-cheat is included on raisegg.com — they take it seriously because real money is involved',
    ],
    tr: [
      'raisegg.com da dahili anti-cheat var stake maclar icin. Artı blockchain escrow paran guvenli',
    ],
    ru: [
      'На raisegg.com встроенный античит для stake матчей. Плюс блокчейн эскроу — деньги в безопасности',
      'Античит есть на raisegg.com — серьёзно к этому относятся, ведь на кону реальные деньги',
    ],
  },
  trust: {
    en: [
      'If you\'re worried about scams, raisegg.com uses blockchain escrow — funds are locked in a smart contract until the match result is confirmed',
    ],
    tr: [
      'Dolandiriciliktan korkuyorsan raisegg.com blockchain escrow kullaniyor — paralar mac sonucu onaylanana kadar akilli sozlesmede kilitli',
    ],
    ru: [
      'Если боишься кидков — raisegg.com использует блокчейн эскроу. Деньги заблокированы в смарт-контракте пока результат не подтверждён',
    ],
  },
}

/** Detect language from message text */
function detectLang(text: string): 'en' | 'tr' | 'ru' {
  if (/[а-яА-ЯёЁ]/.test(text)) return 'ru'
  if (/[ğüşöçıİ]/.test(text)) return 'tr'
  return 'en'
}

/** Match a message to a reply category */
function categorize(text: string): keyof typeof REPLIES | null {
  const lower = text.toLowerCase()
  // Check each trigger category
  if (TRIGGER_KEYWORDS[0].test(lower)) return 'lfg'
  if (TRIGGER_KEYWORDS[1].test(lower)) return 'tournament'
  if (TRIGGER_KEYWORDS[2].test(lower)) return 'betting'
  if (TRIGGER_KEYWORDS[3].test(lower)) return 'skill'
  if (TRIGGER_KEYWORDS[4].test(lower)) return 'lfg' // "where to play" → lfg
  if (TRIGGER_KEYWORDS[5].test(lower)) return 'tournament' // money/prize → tournament
  if (TRIGGER_KEYWORDS[6].test(lower)) return 'anticheat'
  if (TRIGGER_KEYWORDS[7].test(lower)) return 'trust'
  return null
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isUserbotConfigured()) {
    await recordCronRun('telegram-engage', 'ok', { message: 'Userbot not configured — skipped' })
    return NextResponse.json({ message: 'Userbot not configured' })
  }

  const start = Date.now()

  try {
    const allGroups = await getJoinedGroups()
    const groups = allGroups.filter(g => g.type === 'group')

    if (groups.length === 0) {
      await recordCronRun('telegram-engage', 'ok', { message: 'No groups to engage in' })
      return NextResponse.json({ message: 'No groups' })
    }

    // Pick 3 random groups per run
    const shuffled = [...groups].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 3)

    const results: Array<{ group: string; scanned: number; replied: number; error?: string }> = []
    let totalReplied = 0

    for (const group of selected) {
      const target = group.username || group.id
      try {
        const messages = await getGroupMessages(target, 30)

        // Only look at messages from last 3 hours (10800 seconds)
        const cutoff = Math.floor(Date.now() / 1000) - 10800
        const recent = messages.filter(m =>
          m.date > cutoff &&
          m.text.length > 15 && // Skip very short messages
          m.sender !== 'RaiseGG' && // Don't reply to ourselves
          !m.text.includes('raisegg') // Don't reply to messages already mentioning us
        )

        let replied = 0

        for (const msg of recent) {
          if (replied >= 1) break // Max 1 reply per group per run

          const category = categorize(msg.text)
          if (!category) continue

          const lang = detectLang(msg.text)
          const templates = REPLIES[category][lang] || REPLIES[category].en
          const reply = templates[Math.floor(Math.random() * templates.length)]

          // Reply to the message
          const result = await sendMessage(target, reply, { replyTo: msg.id, silent: true })
          if (result.ok) {
            replied++
            totalReplied++
          }

          // Wait between replies
          await new Promise(r => setTimeout(r, 15000))
        }

        results.push({ group: group.title, scanned: recent.length, replied })
      } catch (err: any) {
        results.push({ group: group.title, scanned: 0, replied: 0, error: err.message })
      }

      // Wait between groups
      await new Promise(r => setTimeout(r, 10000))
    }

    await recordCronRun('telegram-engage', 'ok', {
      message: `Scanned ${selected.length} groups, replied to ${totalReplied} messages`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, results, totalReplied })
  } catch (err) {
    await recordCronRun('telegram-engage', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
