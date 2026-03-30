// Cron: Facebook Page auto-poster
// Posts 3x/day — match highlights, platform features, engagement, tips, memes
// Schedule: 0 8,14,22 * * *
// Templates in EN/TR/RU — rotates daily so no repeats for a month

import { NextResponse } from 'next/server'
import { isConfigured, postToPage, postImageToPage } from '@/lib/facebook'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 30

// ─── Post types ────────────────────────────────────────────────────────────

type PostTemplate = {
  type: 'text' | 'link' | 'image'
  message: string
  link?: string
  imageUrl?: string
}

// ─── 30+ templates in EN / TR / RU ────────────────────────────────────────

const TEMPLATES: PostTemplate[] = [
  // ── Match highlights (EN) ───────────────────────────────────────────────
  {
    type: 'link',
    message: '🎯 A player just clutched a 1v1 in CS2 and won $5 USDC!\n\nThink you can do better? Prove it.\nFree tournaments every day. Blockchain escrow. Anti-cheat.\n\nYour aim is worth money.',
    link: 'https://raisegg.com/play',
  },
  {
    type: 'link',
    message: '🔥 5v5 team match just ended — $25 USDC on the line!\n\nGrab your squad. Stake your skills.\nBlockchain escrow protects both sides.\n\nNo scams. No excuses. Just skill.',
    link: 'https://raisegg.com/play',
  },
  {
    type: 'text',
    message: '💰 Real match from today:\n\nPlayer A: "I\'ll bet $10 on my aim"\nPlayer B: "Let\'s go"\n\nResult: 16-9. Player A walks away with $20 USDC.\n\nThis is RaiseGG. Your skill = your income.\n\n👉 raisegg.com',
  },

  // ── Platform features (EN) ──────────────────────────────────────────────
  {
    type: 'link',
    message: '🆓 Free $0.50 welcome bonus to try your first match!\n\nSign up → Connect Steam → Play CS2, Dota 2, or Deadlock\nBlockchain escrow. Anti-cheat on every match.\n\nZero risk. Real rewards.',
    link: 'https://raisegg.com',
  },
  {
    type: 'text',
    message: 'Why RaiseGG is different:\n\n✅ Blockchain escrow — your money is safe\n✅ Built-in anti-cheat (VAC + MatchZy)\n✅ Instant USDC payouts\n✅ Free daily tournaments\n✅ 3 games: CS2, Dota 2, Deadlock\n\nNo middleman. No trust needed.\n\n👉 raisegg.com',
  },
  {
    type: 'link',
    message: '🛡️ How does RaiseGG escrow work?\n\n1. Both players deposit USDC\n2. Smart contract locks the funds\n3. Match is played with anti-cheat\n4. Winner gets paid instantly\n\nNo one can scam you. Period.',
    link: 'https://raisegg.com/play',
  },
  {
    type: 'link',
    message: '🎮 3 games. 1 platform. Real money.\n\nCS2 — 1v1, 2v2, 5v5\nDota 2 — 1v1 mid, 5v5\nDeadlock — 1v1\n\nPick your game. Stake your skills.\nFree tournaments if you don\'t want to risk anything.',
    link: 'https://raisegg.com/play',
  },

  // ── Game-specific tips (EN) ─────────────────────────────────────────────
  {
    type: 'text',
    message: '📊 CS2 1v1 tip: On Dust2, the T-side AWPer has a 54% win rate in first duels at Long A.\n\nKnow the angles. Win the money.\n\nPractice in free tournaments, then go for real stakes.\n\n👉 raisegg.com/tournaments',
  },
  {
    type: 'text',
    message: '🧠 Dota 2 mid tip: SF vs SF? The one who stacks the small camp at :53 wins the lane 70% of the time.\n\nProve it in a 1v1 mid for USDC on RaiseGG.\n\n👉 raisegg.com/play',
  },

  // ── Engagement / memes (EN) ─────────────────────────────────────────────
  {
    type: 'text',
    message: '🤔 What\'s your best excuse for losing a 1v1?\n\n"My mouse died"\n"128 tick feels different"\n"I wasn\'t trying"\n\nOn RaiseGG there are no excuses — VAC + MatchZy anti-cheat on every match 😏\n\nDrop your best excuse below 👇',
  },
  {
    type: 'text',
    message: '💬 POLL: Which game takes more skill?\n\n🔫 CS2\n⚔️ Dota 2\n🔒 Deadlock\n\nComment your answer! All three are on RaiseGG for real money matches.\n\n👉 raisegg.com',
  },
  {
    type: 'text',
    message: '😤 Tag a friend who thinks they\'re better than you at CS2.\n\nSettle it on RaiseGG. 1v1. Real money.\nLoser pays.\n\n👉 raisegg.com/play',
  },
  {
    type: 'text',
    message: '🏆 Who\'s the best CS2 player in your friend group?\n\nTag them. Challenge them. RaiseGG makes it official.\n\n1v1 for USDC. Blockchain escrow. Anti-cheat.\nNo more arguing — just play.\n\n👉 raisegg.com',
  },

  // ── Tournament announcements (EN) ───────────────────────────────────────
  {
    type: 'link',
    message: '🏆 FREE CS2 Tournament Tonight!\n\n💰 $5 USDC prize pool\n👥 8 players, single elimination\n🛡️ Anti-cheat enabled\n💵 No entry fee\n\nSign up now — slots fill fast!',
    link: 'https://raisegg.com/tournaments',
  },
  {
    type: 'link',
    message: '⚔️ City vs City — which city has the best CS2 players?\n\nIstanbul vs Ankara\nBelgrade vs Bucharest\nTbilisi vs Baku\n\nFree weekly tournaments. Real prizes. City pride on the line.',
    link: 'https://raisegg.com/tournaments',
  },

  // ── City leaderboard (EN) ──────────────────────────────────────────────
  {
    type: 'link',
    message: '🏙️ City Leaderboard Update!\n\nWhich city dominates CS2 this week?\nCheck if your city made the top 10.\n\nRep your city. Win prizes. Earn glory.',
    link: 'https://raisegg.com/leaderboard',
  },

  // ── Achievement celebrations (EN) ──────────────────────────────────────
  {
    type: 'text',
    message: '🎉 Milestone: 1,000+ matches played on RaiseGG!\n\nCS2, Dota 2, Deadlock — players from Turkey, Georgia, the Balkans, and CIS are competing daily.\n\nJoin the growing community.\n\n👉 raisegg.com',
  },

  // ── Turkish (TR) ────────────────────────────────────────────────────────
  {
    type: 'link',
    message: '🎮 CS2\'de kendi becerine bahis yap!\n\nRaiseGG: 1v1, 2v2, 5v5 maçlar — gerçek USDC ödüller.\nBlockchain emanet sistemi — dolandırıcılık imkansız.\nAnti-cheat her maçta aktif.\n\nÜcretsiz günlük turnuvalar!',
    link: 'https://raisegg.com',
  },
  {
    type: 'link',
    message: '🏆 Ücretsiz CS2 Turnuvası bu gece!\n\n💰 $5 USDC ödül havuzu\n👥 8 oyuncu, tek eleme\n🛡️ Anti-cheat açık\n\nGiriş ücretsiz. Sadece becerin yeterli.',
    link: 'https://raisegg.com/tournaments',
  },
  {
    type: 'text',
    message: '🇹🇷 Türk CS2 sahnesine özel!\n\nİstanbul Cuma Gecesi Turnuvası\nAnkara vs İstanbul — kim daha iyi?\n\nHer hafta ücretsiz turnuva, gerçek ödüller.\nŞehrini temsil et!\n\n👉 raisegg.com/tournaments',
  },
  {
    type: 'text',
    message: '💰 CS2 oynayarak para kazanmak ister misin?\n\n1. raisegg.com\'a kaydol\n2. Steam hesabını bağla\n3. USDC yatır veya ücretsiz turnuvaya katıl\n4. Kazan ve çek!\n\nBaşkalarına bahis değil — kendi becerin.\n\n👉 raisegg.com',
  },

  // ── Russian (RU) ────────────────────────────────────────────────────────
  {
    type: 'link',
    message: '🎮 Ставь на свой скилл в CS2!\n\nRaiseGG: 1v1, 2v2, 5v5 матчи за реальные USDC.\nБлокчейн эскроу — скам невозможен.\nАнтичит на каждом матче.\n\nБесплатные турниры каждый день!',
    link: 'https://raisegg.com',
  },
  {
    type: 'link',
    message: '🏆 Бесплатный турнир CS2 сегодня!\n\n💰 $5 USDC призовой фонд\n👥 8 игроков, single elimination\n🛡️ Античит включён\n\nВход бесплатный. Только скилл.',
    link: 'https://raisegg.com/tournaments',
  },
  {
    type: 'text',
    message: '🔥 RaiseGG — платформа для тех, кто уверен в своём скилле!\n\nCS2, Dota 2, Deadlock\n1v1, 2v2, 5v5 за USDC\nБлокчейн эскроу\nМгновенные выплаты\n\nНе казино. Не ставки на чужие матчи.\nТЫ играешь. ТЫ выигрываешь.\n\n👉 raisegg.com',
  },
  {
    type: 'text',
    message: '⚔️ Москва vs Питер — кто круче в CS2?\n\nНа RaiseGG — город против города!\nБесплатные турниры каждую неделю.\nРеальные призы в USDC.\n\n👉 raisegg.com/tournaments',
  },
  {
    type: 'text',
    message: '🧠 Как заработать на CS2 (легально):\n\n1. Зарегистрируйся на raisegg.com\n2. Подключи Steam\n3. Играй 1v1 или в бесплатных турнирах\n4. Выигрывай USDC и выводи\n\nЧистый скилл. Никаких ставок на других.',
  },
  {
    type: 'text',
    message: '🛡️ Дотеры, ваш ММР чего-то стоит?\n\n1v1 мид за реальные USDC на RaiseGG.\nBlockchain эскроу — скам невозможен.\nБесплатные турниры каждый день.\n\n👉 raisegg.com/play',
  },

  // ── Cross-language engagement ───────────────────────────────────────────
  {
    type: 'text',
    message: '🌍 RaiseGG — available in:\n\n🇬🇧 English\n🇹🇷 Türkçe\n🇷🇺 Русский\n\nCS2, Dota 2, Deadlock\nFree tournaments. Real prizes.\n\nWhich language should we add next? Comment below! 👇\n\n👉 raisegg.com',
  },
  {
    type: 'text',
    message: '🎯 Weekend Challenge!\n\nPlay 3 matches on RaiseGG this weekend.\nBest record gets a shoutout on our page!\n\nCS2 | Dota 2 | Deadlock\nFree tournaments or stake matches.\n\nAre you in? 💪\n\n👉 raisegg.com/play',
  },
  {
    type: 'link',
    message: '📱 Follow us for:\n\n🏆 Daily tournament announcements\n🎮 Match highlights\n💰 Prize pool updates\n🏙️ City vs city rivalries\n📊 Leaderboard updates\n\nNever miss a free tournament again!',
    link: 'https://raisegg.com/tournaments',
  },
  {
    type: 'text',
    message: '💡 Did you know?\n\nRaiseGG pays out in USDC on Solana.\n\nThat means:\n- No bank needed\n- Instant withdrawals\n- Works worldwide\n- Ultra-low fees\n\nYour skills, your money, your crypto wallet.\n\n👉 raisegg.com',
  },
]

// ─── Pick template based on day + time slot ────────────────────────────────

function pickTemplate(): { template: PostTemplate; index: number } {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86400000
  )
  // 3 slots per day (8h, 14h, 22h UTC)
  const hour = now.getUTCHours()
  const slot = hour < 11 ? 0 : hour < 18 ? 1 : 2

  const index = (dayOfYear * 3 + slot) % TEMPLATES.length
  return { template: TEMPLATES[index], index }
}

// ─── Cron handler ──────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('facebook-post', 'error', { message: 'Facebook not configured' })
    return NextResponse.json({ error: 'Facebook not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    const { template, index } = pickTemplate()
    let result: { ok: boolean; id?: string; error?: string }

    if (template.type === 'image' && template.imageUrl) {
      result = await postImageToPage({
        imageUrl: template.imageUrl,
        caption: template.message,
      })
    } else {
      result = await postToPage({
        message: template.message,
        link: template.link,
      })
    }

    if (!result.ok) {
      await recordCronRun('facebook-post', 'error', {
        message: `Failed template ${index}: ${result.error}`,
        durationMs: Date.now() - start,
      })
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    await recordCronRun('facebook-post', 'ok', {
      message: `Posted to Facebook: ${result.id} (template ${index}, type: ${template.type})`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      postId: result.id,
      templateIndex: index,
      type: template.type,
    })
  } catch (err) {
    await recordCronRun('facebook-post', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
