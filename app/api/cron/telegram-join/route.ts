// Cron: Auto-join Telegram groups for all 3 games
// Runs weekly — searches for CS2, Dota 2, Deadlock groups and joins new ones
// Schedule: Every Monday at 03:00 UTC

import { NextResponse } from 'next/server'
import { isUserbotConfigured, searchGroups, joinGroup, getJoinedGroups } from '@/lib/telegram-userbot'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 120

const SEARCH_KEYWORDS = [
  // CS2
  'CS2 Turkey', 'CS2 competitive', 'Counter-Strike 2', 'CS2 matchmaking',
  'CS2 Türkiye', 'CS2 CIS', 'CS2 Balkan', 'CSGO tournament',
  'CS2 betting', 'CS2 trading', 'CS2 Turkey community',
  // Dota 2
  'Dota 2 Turkey', 'Dota 2 competitive', 'Dota 2 tournament', 'Dota 2 CIS',
  'Dota 2 Türkiye', 'Dota 2 ranked', 'Dota 2 team', 'Dota 2 Balkan',
  'Dota 2 English', 'Dota 2 Russia', 'Dota 2 Romania', 'learn Dota 2',
  'Dota 2 mid', 'Dota 2 carry', 'Dota 2 party finder',
  // Deadlock
  'Deadlock game', 'Deadlock Valve', 'Deadlock competitive', 'Deadlock esports',
  'Deadlock community', 'Deadlock Russia', 'Deadlock LFG',
  // Regional
  'esports Turkey', 'esports Romania', 'esports Serbia', 'esports Georgia',
  'gaming Kazakhstan', 'gaming Azerbaijan', 'gaming Ukraine', 'gaming Poland',
  'esports community', 'Turkish esports', 'CIS gaming',
  // More regional
  'esports Iran', 'gaming Iran', 'CS2 Iran', 'Dota 2 Iran',
  'CS2 Armenia', 'CS2 Georgia', 'CS2 Kazakhstan',
  'esports Bulgaria', 'esports Croatia', 'esports Bosnia',
  // Crypto gaming
  'crypto gaming', 'play to earn', 'web3 gaming', 'Solana gaming',
  'blockchain esports', 'crypto esports',
  // Skin trading (our audience)
  'CS2 skins', 'CSGO skins trade', 'Dota 2 trade',
]

// Known groups/channels to join directly (bypasses search)
const DIRECT_JOIN_GROUPS = [
  // ── CS2 (mega channels first) ──
  'newcsgo',              // 577K — largest CS2 channel
  'counter_strike2',      // 100K — best CS2 media in TG
  'CS2_newsletter',       // 10K — CS2 news
  'CS2changes',           // 5K — CS2 patch notes
  'CS2NEWSUPDATE',        // 5K — fastest CS2 news
  'tg_globaloffensive',   // 2K — community group
  'cs2trading',
  'cs2_turk',             // CS2 Turkey community
  'csgo_betting',           // CS:GO betting community
  'cybersport_nn',        // 10K — CS2 insiders
  'awpcsgo',              // 5K — CS community

  // ── Dota 2 ──
  'Dota2',                // 100K — news, guides, giveaways
  'dota_2',               // 50K — major Dota channel
  'dota2ruhub',           // 30K — pro Dota coverage
  'dota2_russia',         // 20K — Russian Dota
  'DOTA_DM',              // 10K — Dota discussions
  'dota_sports',          // 10K — Dota esports
  'GosuGamersDota2',      // 10K — GosuGamers
  'dota2_art',            // 5K — Dota meme community
  'dota_2_chat',          // active discussion group
  'dota2_eng',
  'dota2ru',
  'dota2_turkey',
  'dota2romania',
  'learndota2',

  // ── Deadlock ──
  'deadlockrf',           // 25K — biggest Deadlock channel
  'deadlockrfchat',       // 5K — Deadlock community chat
  'play_dead_lock',       // 10K — Deadlock news
  'dlocknew',             // 5K — Deadlock news
  'Deadlock37',           // 3K — Deadlock news
  'deadlocknewsrus',      // 2K — Russian Deadlock
  'deadloockgame',
  'deadlock_community',
  'deadlock_ru',

  // ── Esports news / general ──
  'vpesports',            // 20K — VPEsports news
  'csru_official',        // 50K — Cybersport.ru
  'topgameplayz',         // 10K — gaming news
  'betboom_esports',      // 10K — esports org
  'nemigagg',             // 5K — CIS esports org
  'natus_vincere_official', // 50K — Na'Vi official

  // ── Betting / predictions ──
  'godlike_tips',         // 15K — CS2 & Dota predictions
  'cybersports_analytics', // 8K — analytical bets
  'cs2_bets_tipsgg',      // 5K — CS2 predictions
  'dragonbetpro',         // 5K — CS/Dota predictions
  'protips19',            // 10K — free betting tips

  // ── Memes (organic reach) ──
  'moyocherednoy',        // 10K — esports memes
  'r_gamingmemes',        // 5K — gaming memes

  // ── Skin trading ──
  'marketcsgoskins',      // 20K — CS skin trading

  // ── Regional ──
  'esports_community',
  'esportstr',
  'csgo_ru',              // CS/esports Russian news
  'AuroraTeam',           // Russian CS2 team
  'Aurora_Dota2',         // Russian Dota team

  // ── More betting/predictions ──
  'esportsbetting_channel',
  'csgo_predictions',
  'dota2predictions',

  // ── Turkish gaming ──
  'turkishesports',
  'turkgaming',
  'valorant_tr',

  // ── Balkan/Caucasus ──
  'gaming_georgia',
  'esports_azerbaijan',
  'gaming_romania',
  'esports_serbia',
  'gaming_croatia',
  'esports_bulgaria',

  // ── Central Asia ──
  'gaming_kazakhstan',
  'esports_uzbekistan',
]

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isUserbotConfigured()) {
    await recordCronRun('telegram-join', 'error', { message: 'Userbot not configured' })
    return NextResponse.json({ error: 'Userbot not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    // Get already-joined groups to avoid re-joining
    const joined = await getJoinedGroups()
    const joinedUsernames = new Set(joined.map(g => g.username?.toLowerCase()).filter(Boolean))

    let rateLimited = false

    // ─── Phase 1: Direct-join known groups ────────────────────────────
    const directResults: Array<{ username: string; ok: boolean; error?: string }> = []
    const pendingDirect = DIRECT_JOIN_GROUPS.filter(u => !joinedUsernames.has(u.toLowerCase()))

    for (const username of pendingDirect.slice(0, 5)) {
      if (rateLimited) break
      if (directResults.length > 0) {
        await new Promise(r => setTimeout(r, 10000))
      }

      const result = await joinGroup(username)
      if (result.ok) {
        directResults.push({ username, ok: true })
        joinedUsernames.add(username.toLowerCase())
      } else if (result.error?.includes('FLOOD')) {
        directResults.push({ username, ok: false, error: 'Rate limited' })
        rateLimited = true
      } else {
        directResults.push({ username, ok: false, error: result.error })
      }
    }

    // ─── Phase 2: Search-based joins (if not rate-limited) ────────────
    // Pick 4 random keywords per run (to stay under rate limits)
    const shuffled = [...SEARCH_KEYWORDS].sort(() => Math.random() - 0.5)
    const keywords = rateLimited ? [] : shuffled.slice(0, 4)

    const results: Array<{ keyword: string; found: number; joined: string[]; skipped: string[]; errors: string[] }> = []

    for (const keyword of keywords) {
      if (rateLimited) break
      const found = await searchGroups(keyword, 10)
      const joinable = found.filter(g =>
        g.username &&
        g.type === 'group' &&
        g.memberCount >= 50 &&
        !joinedUsernames.has(g.username.toLowerCase())
      )

      const joined: string[] = []
      const skipped: string[] = []
      const errors: string[] = []

      // Join up to 3 new groups per keyword
      for (const group of joinable.slice(0, 3)) {
        // Rate limit: wait 10s between joins
        if (joined.length > 0) {
          await new Promise(r => setTimeout(r, 10000))
        }

        const result = await joinGroup(group.username!)
        if (result.ok) {
          joined.push(`${group.title} (@${group.username})`)
          joinedUsernames.add(group.username!.toLowerCase())
        } else if (result.error?.includes('FLOOD')) {
          errors.push(`Rate limited — stopping joins`)
          rateLimited = true
          break
        } else {
          errors.push(`${group.title}: ${result.error}`)
        }
      }

      results.push({
        keyword,
        found: found.length,
        joined,
        skipped: joinable.slice(3).map(g => g.title),
        errors,
      })

      // Wait between keyword searches
      await new Promise(r => setTimeout(r, 5000))
    }

    const totalJoined = results.reduce((sum, r) => sum + r.joined.length, 0)
    const directJoined = directResults.filter(r => r.ok).length

    await recordCronRun('telegram-join', 'ok', {
      message: `Direct: ${directJoined}/${pendingDirect.length}, Search: ${keywords.length} keywords, joined ${totalJoined} new groups${rateLimited ? ' (rate limited)' : ''}`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, directResults, results, totalJoined: totalJoined + directJoined })
  } catch (err) {
    await recordCronRun('telegram-join', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
