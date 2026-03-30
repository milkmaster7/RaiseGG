// Cron: Discord LFG auto-poster + daily highlights
// Runs 3x daily — posts to 2-3 LFG channels per run + daily highlights webhook.
// Rotates through EN/TR/RU message templates.

import { NextResponse } from 'next/server'
import {
  isConfigured,
  findAllLFGChannels,
  sendToChannel,
  postDailyHighlights,
  type LFGChannel,
} from '@/lib/discord-bot'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 120

// ─── Message templates ─────────────────────────────────────────────────────

const MESSAGES_EN = [
  '**Free CS2 Tournament Today!**\n\n$5 USDC prize pool. 8 players, single elimination.\nNo entry fee. Anti-cheat protected.\n\nRep your city — Istanbul vs Ankara, Tbilisi vs Baku.\nhttps://raisegg.com/tournaments',
  'Anyone down for competitive CS2?\n\n1v1, 2v2, or 5v5 for real money (USDC/USDT).\nBlockchain escrow — funds locked until match ends.\nFree daily tournaments with prizes too.\n\nhttps://raisegg.com',
  '**RaiseGG — Stake on your CS2 skills**\n\nOn-chain escrow. Anti-cheat. Instant payouts.\nFree tournaments every day with $5 USDC prize.\n\nBuilt for Turkey, Caucasus, Balkans, CIS.\nhttps://raisegg.com/play',
  'City vs City CS2 — who runs their region?\n\nIstanbul vs Ankara\nTbilisi vs Baku\nBelgrade vs Bucharest\n\nFree tournaments, real USDC prizes.\nhttps://raisegg.com/tournaments',
  'LFG CS2 — we run free daily tourneys on RaiseGG\n\n8-player brackets, winner takes $5 USDC.\nAlso got 1v1 and 5v5 wagers with crypto escrow.\n\nhttps://raisegg.com',
  // Dota 2
  '**Dota 2 players — stake on your MMR!**\n\n1v1 mid or 5v5 for real USDC.\nBlockchain escrow. No scams.\nFree daily tournaments too.\n\nhttps://raisegg.com',
  '**Free Dota 2 Tournament!**\n\n$5 USDC prize pool. 8 players.\nNo entry fee. Anti-cheat protected.\n\nProve your MMR is real.\nhttps://raisegg.com/tournaments',
  'LFG Dota 2 — wager on your 1v1 mid skills\n\nCrypto escrow, instant payouts.\nAlso running free daily tourneys.\n\nhttps://raisegg.com/play',
  // Deadlock
  '**Deadlock players wanted!**\n\nValve\'s new shooter — compete for real prizes on RaiseGG.\nBlockchain escrow. Free tournaments daily.\n\nhttps://raisegg.com',
  '**LFG Deadlock** — 1v1 for USDC on RaiseGG\n\nOn-chain escrow. Anti-cheat.\nFree daily tournaments with prizes.\n\nhttps://raisegg.com/play',
]

const MESSAGES_TR = [
  '**Bu gece ucretsiz CS2 turnuvasi!**\n\n$5 USDC odul havuzu. 8 kisi, tek eleme.\nGiris ucretsiz. Anti-cheat korumali.\n\nSehrinizi temsil edin!\nhttps://raisegg.com/tournaments',
  'CS2 oynayan var mi? RaiseGG de her gun ucretsiz turnuva var.\n\n1v1, 2v2, 5v5 gercek para icin oyna.\nBlockchain escrow — paran guvenli.\n\nhttps://raisegg.com',
  '**Istanbul vs Ankara — hangi sehir daha iyi?**\n\nRaiseGG de sehirler arasi CS2 turnuvalari.\nUcretsiz giris, $5 USDC odul.\n\nhttps://raisegg.com/tournaments',
  'RaiseGG — CS2 becerilerine guveniyor musun?\n\nOn-chain escrow. Anti-cheat. Aninda odeme.\nHer gun ucretsiz turnuva var.\n\nhttps://raisegg.com/play',
  // Dota 2 TR
  '**Dota 2 oyuncularini ariyoruz!**\n\n1v1 mid veya 5v5 gercek para icin.\nBlockchain escrow — paran guvenli.\nHer gun ucretsiz turnuva.\n\nhttps://raisegg.com',
  '**Ucretsiz Dota 2 turnuvasi!**\n\n$5 USDC odul. 8 oyuncu.\nGiris bedava. MMR nin gercek mi goster!\n\nhttps://raisegg.com/tournaments',
  // Deadlock TR
  '**Deadlock oynayan var mi?**\n\nValve nin yeni oyunu — RaiseGG de gercek odul icin yarismak ister misin?\n\nhttps://raisegg.com',
]

const MESSAGES_RU = [
  '**Бесплатный турнир CS2 сегодня!**\n\n$5 USDC призовой фонд. 8 игроков, сингл элим.\nВход бесплатный. Античит.\n\nhttps://raisegg.com/tournaments',
  'Ищем игроков CS2 из СНГ!\n\n1v1, 2v2, 5v5 на реальные деньги (USDC/USDT).\nБлокчейн эскроу — деньги заблокированы до конца матча.\nБесплатные турниры каждый день.\n\nhttps://raisegg.com',
  '**RaiseGG — ставь на свой скилл**\n\nЭскроу на блокчейне. Античит. Моментальные выплаты.\nБесплатные турниры с призами $5 USDC.\n\nhttps://raisegg.com/play',
  'Город на город CS2 — кто лучший?\n\nМосква vs Питер\nТбилиси vs Баку\nАлматы vs Астана\n\nБесплатные турниры, реальные призы.\nhttps://raisegg.com/tournaments',
  // Dota 2 RU
  '**Дотеры, ставьте на свой ММР!**\n\n1v1 мид или 5v5 за реальные USDC.\nБлокчейн эскроу — скам невозможен.\nБесплатные турниры каждый день.\n\nhttps://raisegg.com',
  '**Бесплатный турнир Dota 2!**\n\n$5 USDC призовой фонд. 8 игроков.\nДокажи что твой ММР не накрученный.\n\nhttps://raisegg.com/tournaments',
  'LFG Dota 2 — ставь на свой 1v1 мид\n\nКрипто эскроу, моментальные выплаты.\nБесплатные турниры каждый день.\n\nhttps://raisegg.com/play',
  // Deadlock RU
  '**Играешь в Deadlock?**\n\nНовый шутер от Valve — соревнуйся на RaiseGG.\nБлокчейн эскроу. Бесплатные турниры.\n\nhttps://raisegg.com',
  '**LFG Deadlock** — 1v1 за USDC\n\nЭскроу на блокчейне. Античит.\nБесплатные турниры с призами.\n\nhttps://raisegg.com/play',
]

const ALL_MESSAGES = { en: MESSAGES_EN, tr: MESSAGES_TR, ru: MESSAGES_RU }

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Pick language based on channel or guild name */
function detectLanguage(channelName: string, guildName: string): 'en' | 'tr' | 'ru' {
  const combined = `${channelName} ${guildName}`.toLowerCase()
  if (/türk|turkey|istanbul|ankara|izmir|türkiye|tr\b/.test(combined)) return 'tr'
  if (/русск|снг|cis|казах|украин|россия|ru\b|миксы|тимм/.test(combined)) return 'ru'
  return 'en'
}

/** Get a rotating message index based on the current time */
function getRotationIndex(totalMessages: number): number {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86_400_000
  )
  const slot = Math.floor(now.getUTCHours() / 8) // 0, 1, or 2
  return (dayOfYear * 3 + slot) % totalMessages
}

/** Pick 2-3 channels from the list, rotating through them over time */
function pickChannels(channels: LFGChannel[], maxPick: number): LFGChannel[] {
  if (channels.length === 0) return []
  const count = Math.min(maxPick, channels.length)
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86_400_000
  )
  const slot = Math.floor(now.getUTCHours() / 8)
  const startIdx = (dayOfYear * 3 + slot) * count

  const picked: LFGChannel[] = []
  for (let i = 0; i < count; i++) {
    picked.push(channels[(startIdx + i) % channels.length])
  }
  return picked
}

// ─── Route ─────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('discord-post', 'error', { message: 'Discord bot not configured' })
    return NextResponse.json({ error: 'DISCORD_BOT_TOKEN not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    // Find all LFG channels across all servers
    const allLFG = await findAllLFGChannels()

    if (allLFG.length === 0) {
      // REST API — no client to destroy
      await recordCronRun('discord-post', 'ok', { message: 'No LFG channels found', durationMs: Date.now() - start })
      return NextResponse.json({ message: 'No LFG channels found' })
    }

    // Pick 2-3 channels for this run
    const selected = pickChannels(allLFG, 3)
    const results: Array<{ channel: string; guild: string; lang: string; ok: boolean; error?: string }> = []

    for (const ch of selected) {
      const lang = detectLanguage(ch.channelName, ch.guildName)
      const msgs = ALL_MESSAGES[lang]
      const idx = getRotationIndex(msgs.length)
      const text = msgs[idx]

      // 3s delay between posts to respect rate limits
      if (results.length > 0) {
        await new Promise((r) => setTimeout(r, 3000))
      }

      const result = await sendToChannel(ch.channelId, text)
      results.push({
        channel: ch.channelName,
        guild: ch.guildName,
        lang,
        ok: result.ok,
        error: result.error,
      })
    }

    // REST API — no client to destroy

    // ─── Daily highlights via webhook ──────────────────────────────────
    let highlightsOk = false
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        const sb = createServiceClient()

        // Fetch recent matches (last 24h)
        const since = new Date(Date.now() - 86_400_000).toISOString()
        const { data: recentMatches } = await sb
          .from('matches')
          .select('player1_name, player2_name, winner_name, game')
          .eq('status', 'completed')
          .gte('completed_at', since)
          .order('completed_at', { ascending: false })
          .limit(5)

        // Fetch active bounties count
        const { count: activeBounties } = await sb
          .from('bounties')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')

        // Fetch upcoming tournaments count
        const { count: activeTournaments } = await sb
          .from('tournaments')
          .select('id', { count: 'exact', head: true })
          .in('status', ['upcoming', 'registration'])

        const topMatches = (recentMatches ?? []).map((m: any) => ({
          player1: m.player1_name ?? 'Player 1',
          player2: m.player2_name ?? 'Player 2',
          winner: m.winner_name ?? 'TBD',
          game: m.game ?? 'cs2',
        }))

        // Only post if there is some content
        if (topMatches.length > 0 || (activeBounties ?? 0) > 0 || (activeTournaments ?? 0) > 0) {
          const hlResult = await postDailyHighlights({
            topMatches,
            activeBounties: activeBounties ?? 0,
            activeTournaments: activeTournaments ?? 0,
            leaderboardChanges: [],
          })
          highlightsOk = hlResult.ok
        }
      } catch {
        // Non-critical — don't fail the whole cron
      }
    }

    const successCount = results.filter((r) => r.ok).length
    await recordCronRun('discord-post', 'ok', {
      message: `Posted to ${successCount}/${results.length} LFG channels, highlights: ${highlightsOk ? 'sent' : 'skipped'}`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, results, highlightsOk })
  } catch (err) {
    // REST API — no client to destroy
    await recordCronRun('discord-post', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
