// Cron: Twitter/X auto-poster
// Posts 3x/day — tournament hype, city rivalries, engagement, tips, stats
// Schedule: 0 9,15,21 * * *

import { NextResponse } from 'next/server'
import { tweet, tweetWithDetails } from '@/lib/twitter'
import { recordCronRun } from '@/lib/monitor'
// Supabase removed — no longer using DB stats in fallback tweets

export const maxDuration = 30

// 30 tweet templates — rotates daily so no repeats for a month
const TWEETS = [
  // Tournament hype
  `Free CS2 tournament tonight - $5 USDC prize pool\n\n8 players. Single elimination. Anti-cheat.\nNo entry fee. Just skill.\n\nhttps://raisegg.com/tournaments\n\n#CS2`,
  `Istanbul Friday Night CS2 is becoming a thing\n\nFree entry, real prizes, city pride on the line\n\nhttps://raisegg.com/tournaments\n\n#CS2 #Istanbul`,
  `Tbilisi vs Baku - who has better CS2 players?\n\nFree tournament every week. Rep your city.\n\nhttps://raisegg.com/tournaments\n\n#CS2 #Caucasus`,
  `Belgrade Cup tonight\n\nFree CS2 tournament, $5 prize, 8 slots\nBalkan pride on the line\n\nhttps://raisegg.com/tournaments\n\n#CS2 #Balkans`,
  `Bucharest vs Cluj - the eternal Romanian CS2 rivalry\n\nSettle it on RaiseGG. Free tournaments daily.\n\nhttps://raisegg.com/tournaments\n\n#CS2 #Romania`,
  `Warsaw CS2 Invitational - free entry, real prizes\n\nPolish CS2 scene deserves more love\n\nhttps://raisegg.com/tournaments\n\n#CS2 #Poland`,

  // Platform features
  `What if you could stake real money on your own CS2 skill?\n\nNot betting on pros. YOU play. YOU win.\nBlockchain escrow. Anti-cheat. Instant payout.\n\nhttps://raisegg.com\n\n#CS2`,
  `RaiseGG uses on-chain escrow for every match\n\nYour money is locked in a smart contract until the match ends. No trust needed.\n\nhttps://raisegg.com\n\n#Solana #CS2`,
  `1v1 me for $5\n\nThat's literally what RaiseGG is. Stake matches in CS2, Dota 2, Deadlock.\n\nhttps://raisegg.com/play`,
  `Why RaiseGG > random Discord wager groups:\n\n- Blockchain escrow (can't get scammed)\n- Anti-cheat (VAC + MatchZy)\n- Instant USDC payouts\n- Free daily tournaments\n\nhttps://raisegg.com`,
  `5v5 team matches are live on RaiseGG\n\nGrab your squad, stake USDC, play CS2\nBlockchain escrow protects both sides\n\nhttps://raisegg.com/play\n\n#CS2`,

  // Engagement / questions
  `What's your CS2 ELO?\n\nRaiseGG ranks players across 10 tiers: Iron to Apex\n\nWhere would you land?\nhttps://raisegg.com/leaderboard`,
  `Biggest excuse for losing a CS2 1v1?\n\nOn RaiseGG there are no excuses - VAC + MatchZy anti-cheat on every match`,
  `Hot take: the Turkish CS2 scene is underrated\n\nIstanbul alone could fill a Major qualifier\n\nProve it on RaiseGG: https://raisegg.com/play`,
  `Which Balkan country has the best CS2 players?\n\nSerbia? Romania? Bulgaria? Greece?\n\nSettle it: https://raisegg.com/tournaments`,
  `Georgian CS2 is about to blow up\n\nTbilisi Showdown every week on RaiseGG\n\nhttps://raisegg.com/tournaments`,

  // Tips / educational
  `How to make money playing CS2 (legally):\n\n1. Sign up at raisegg.com\n2. Deposit USDC\n3. Play 1v1 or join free tournaments\n4. Win and withdraw\n\nThat's it. No betting on others. Pure skill.`,
  `PSA: You can play free CS2 tournaments every day on RaiseGG and win real USDC\n\nNo deposit needed. Just Steam account.\n\nhttps://raisegg.com/tournaments`,
  `The RaiseGG ELO system explained:\n\nIron -> Bronze -> Silver -> Gold -> Platinum -> Diamond -> Master -> Grandmaster -> Champion -> Apex\n\nK-factor 32. Win streaks matter.\n\nhttps://raisegg.com/leaderboard`,

  // Regional pride
  `CS2 players from Turkey, Georgia, Azerbaijan, Armenia - RaiseGG was built for you\n\nRegional tournaments. City rivalries. Real prizes.\n\nhttps://raisegg.com`,
  `The Caucasus CS2 scene is sleeping\n\nTbilisi, Baku, Yerevan - free tournaments with real prizes every week\n\nWake up: https://raisegg.com/tournaments`,
  `Iranian CS2 players - RaiseGG pays in USDC via Solana\n\nNo bank needed. Crypto payouts.\n\nhttps://raisegg.com`,
  `Kazakhstan CS2 rise up\n\nAlmaty CS2 Battle every week on RaiseGG\nFree entry, $5 USDC prize\n\nhttps://raisegg.com/tournaments`,

  // FOMO / social proof
  `Matches happening right now on RaiseGG\n\nCS2 1v1s for real money. Spectate or play.\n\nhttps://raisegg.com/play`,
  `Every day a new city tournament on RaiseGG:\n\nMon: Balkan Night\nTue: Caucasus Cup\nWed: Turkish Wednesday\nThu: Central Asia\nFri: Istanbul Night\nSat: Championship\n\nhttps://raisegg.com/tournaments`,
  `Your aim is worth money\n\nRaiseGG lets you stake on your own CS2 matches. Not gambling - skill.\n\nhttps://raisegg.com`,
  `RaiseGG has 3 games:\n\nCS2 - live now\nDota 2 - live now\nDeadlock - live now\n\nStake matches or play free tournaments\n\nhttps://raisegg.com/play`,

  // Dota 2 / Deadlock
  `Dota 2 players - stake on your MMR\n\n1v1 mid for real money on RaiseGG\nBlockchain escrow. Anti-cheat.\n\nhttps://raisegg.com/play\n\n#Dota2`,
  `Deadlock is on RaiseGG\n\nStake matches in Valve's newest game\nEarly adopter advantage\n\nhttps://raisegg.com/play\n\n#Deadlock`,

  // Call to action
  `Follow us for daily CS2 tournament announcements, city rivalries, and esports staking updates\n\nFree tournaments every day at https://raisegg.com/tournaments\n\n#CS2`,
  `Join the RaiseGG Telegram for instant tournament alerts\n\nt.me/raise_GG\n\nFree CS2 tournaments daily. Real prizes. No entry fee.`,
]

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const now = new Date()
    const dayOfYear = Math.floor((now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86400000)
    const hourSlot = Math.floor(now.getUTCHours() / 6) // 0-3 slots per day

    // Pick tweet based on day + time slot (cycles through all 30 over ~10 days)
    const tweetIndex = (dayOfYear * 3 + hourSlot) % TWEETS.length
    const tweetText = TWEETS[tweetIndex]

    const { id: tweetId, error: tweetError, status: tweetStatus } = await tweetWithDetails(tweetText)

    if (!tweetId) {
      // Try a different template as fallback (skip the one that failed)
      const fallbackIndex = (tweetIndex + 1) % TWEETS.length
      const fallbackText = TWEETS[fallbackIndex]
      const fallbackId = await tweet(fallbackText)

      await recordCronRun('twitter-post', fallbackId ? 'ok' : 'error', {
        message: fallbackId ? `Fallback tweet posted: ${fallbackId} (template ${fallbackIndex})` : 'Both tweets failed',
        durationMs: Date.now() - start,
      })

      return NextResponse.json({ ok: !!fallbackId, tweetId: fallbackId, firstError: tweetError, firstStatus: tweetStatus })
    }

    await recordCronRun('twitter-post', 'ok', {
      message: `Tweet posted: ${tweetId} (template ${tweetIndex})`,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, tweetId, templateIndex: tweetIndex })
  } catch (err) {
    await recordCronRun('twitter-post', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
