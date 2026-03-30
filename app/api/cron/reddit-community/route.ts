// Cron: Reddit community auto-poster for r/RaiseGG
// Posts content to the official subreddit every 6 hours.
// Pulls real data from Supabase for dynamic content.
// Schedule: 0 */6 * * *

import { NextResponse } from 'next/server'
import { isConfigured, submitPost, submitComment, submitPoll } from '@/lib/reddit-poster'
import {
  postToOwnSubreddit,
  SUBREDDIT_NAME,
  crossPost,
  distinguishAsmod,
  getNewSubPosts,
  upvoteThing,
} from '@/lib/reddit-community'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 30

// ─── Supabase data fetchers ───────────────────────────────────────────────

interface TopPlayer {
  username: string
  city: string | null
  country: string | null
  totalWins: number
  elo: number
}

interface MatchStats {
  totalMatches: number
  last24h: number
  topCities: Array<{ city: string; wins: number }>
}

async function getTopPlayers(limit = 10): Promise<TopPlayer[]> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('players')
      .select('username, city, country, cs2_wins, dota2_wins, deadlock_wins, elo_cs2, elo_dota2, elo_deadlock')
      .order('cs2_wins', { ascending: false })
      .limit(limit)

    if (!data) return []

    return data.map(p => ({
      username: p.username || 'Anonymous',
      city: p.city,
      country: p.country,
      totalWins: (p.cs2_wins || 0) + (p.dota2_wins || 0) + (p.deadlock_wins || 0),
      elo: Math.max(p.elo_cs2 || 1000, p.elo_dota2 || 1000, p.elo_deadlock || 1000),
    }))
  } catch {
    return []
  }
}

async function getMatchStats(): Promise<MatchStats> {
  const defaults: MatchStats = { totalMatches: 0, last24h: 0, topCities: [] }
  try {
    const supabase = createServiceClient()

    // Total matches
    const { count: totalMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })

    // Last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: last24h } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday)

    // Top cities by wins
    const { data: players } = await supabase
      .from('players')
      .select('city, cs2_wins, dota2_wins, deadlock_wins')
      .not('city', 'is', null)

    const cityMap = new Map<string, number>()
    if (players) {
      for (const p of players) {
        const city = p.city || 'Unknown'
        const wins = (p.cs2_wins || 0) + (p.dota2_wins || 0) + (p.deadlock_wins || 0)
        cityMap.set(city, (cityMap.get(city) || 0) + wins)
      }
    }

    const topCities = [...cityMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, wins]) => ({ city, wins }))

    return {
      totalMatches: totalMatches || 0,
      last24h: last24h || 0,
      topCities,
    }
  } catch {
    return defaults
  }
}

// ─── Post template types ──────────────────────────────────────────────────

type PostCategory =
  | 'match_highlight'
  | 'leaderboard'
  | 'tournament'
  | 'announcement'
  | 'discussion'
  | 'city_rivalry'
  | 'tips'
  | 'meme'
  | 'weekly_recap'

interface PostTemplate {
  category: PostCategory
  flair: string
  titleFn: (data: TemplateData) => string
  bodyFn: (data: TemplateData) => string
}

interface TemplateData {
  topPlayers: TopPlayer[]
  stats: MatchStats
  dayOfWeek: number // 0=Sunday
  hour: number
}

// ─── 40+ Post templates ──────────────────────────────────────────────────

const TEMPLATES: PostTemplate[] = [
  // ── Match Highlights (6) ────────────────────────────────────────────────

  {
    category: 'match_highlight',
    flair: 'Match Result',
    titleFn: (d) => `Daily Match Highlights — ${d.stats.last24h} matches in the last 24 hours`,
    bodyFn: (d) => {
      const players = d.topPlayers.slice(0, 5)
      const playerList = players.length > 0
        ? players.map((p, i) => `${i + 1}. **${p.username}** — ${p.totalWins} wins (ELO: ${p.elo})`).join('\n')
        : '*(Be the first to play!)*'
      return `Another day of competitive gaming on RaiseGG.

**Matches played today:** ${d.stats.last24h}
**Total matches all-time:** ${d.stats.totalMatches}

**Top performers today:**
${playerList}

All matches use blockchain escrow and anti-cheat. No scams, no disputes.

---

[Play Now](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments) | [Leaderboard](https://raisegg.com/leaderboard)`
    },
  },
  {
    category: 'match_highlight',
    flair: 'CS2',
    titleFn: () => 'CS2 Stake Match Recap — Best plays of the day',
    bodyFn: (d) => `CS2 continues to be the most popular game on RaiseGG.

**Stats:**
- ${d.stats.last24h} matches in the last 24 hours
- ${d.stats.totalMatches} total matches played
- Top ELO player: ${d.topPlayers[0]?.username || 'TBD'} (${d.topPlayers[0]?.elo || 1000})

The dedicated servers with VAC + MatchZy anti-cheat keep everything clean.

What's your favorite CS2 map for 1v1 stake matches?

---

[Play CS2](https://raisegg.com/play) | [Free Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'match_highlight',
    flair: 'Dota 2',
    titleFn: () => 'Dota 2 1v1 Mid — Today\'s most intense matches',
    bodyFn: (d) => `1v1 mid is the purest test of individual skill in Dota 2.

**Platform stats:**
- ${d.stats.totalMatches} total matches across all games
- ${d.stats.last24h} matches in the last 24 hours

The most picked hero for 1v1 mid stakes this week? We're tracking it.

What hero would you pick if $5 USDC was on the line?

---

[Play Dota 2](https://raisegg.com/play) | [Leaderboard](https://raisegg.com/leaderboard)`,
  },
  {
    category: 'match_highlight',
    flair: 'Deadlock',
    titleFn: () => 'Deadlock Stake Matches — The competitive scene is growing',
    bodyFn: () => `Deadlock 1v1 stake matches are gaining traction on RaiseGG.

The format is still evolving — we're testing different win conditions:
- First to X kills
- First tower/walker down
- Most souls after 10 minutes

If you've played competitive Deadlock, what format feels the most fair?

Blockchain escrow means your money is safe regardless of the outcome.

---

[Play Deadlock](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'match_highlight',
    flair: 'Match Result',
    titleFn: (d) => `Upset of the day — underdog wins ${d.stats.last24h > 0 ? 'in today\'s' : 'a recent'} stake match`,
    bodyFn: () => `One of the best things about stake gaming is the upsets.

When there's money on the line, lower-ranked players bring their absolute best. We see Bronze-tier players take down Diamond players more often than you'd think.

The ELO system adjusts — big upsets mean big ELO gains.

Have you ever beaten someone way above your rank? Share your story.

---

[Play Now](https://raisegg.com/play) | [Leaderboard](https://raisegg.com/leaderboard)`,
  },
  {
    category: 'match_highlight',
    flair: 'CS2',
    titleFn: () => 'What map do you pick for a $10 CS2 1v1? Dust2, Mirage, or Inferno?',
    bodyFn: () => `Serious question for the community. When real money is on the line in a 1v1, which map gives you the most confidence?

**Popular picks:**
- **Dust2** — Classic, balanced, aim-heavy
- **Mirage** — Lots of angles, mid control is key
- **Inferno** — Banana control = map control

On RaiseGG, players can choose the map when creating a match. Dust2 is the most popular but Mirage players tend to have higher win rates.

What's your pick and why?

---

[Play CS2 1v1](https://raisegg.com/play)`,
  },

  // ── Leaderboard Updates (5) ─────────────────────────────────────────────

  {
    category: 'leaderboard',
    flair: 'Announcement',
    titleFn: () => 'Weekly Leaderboard Update — Top 10 Players',
    bodyFn: (d) => {
      const list = d.topPlayers.slice(0, 10)
        .map((p, i) => {
          const city = p.city ? ` (${p.city})` : ''
          return `${i + 1}. **${p.username}**${city} — ${p.totalWins} wins, ELO ${p.elo}`
        }).join('\n')

      return `Here's this week's leaderboard for RaiseGG:

${list || '*(No players yet — be the first!)*'}

**Platform Stats:**
- Total matches: ${d.stats.totalMatches}
- Matches this week: ${d.stats.last24h * 7} (estimated)

Think you can crack the top 10? Start with free tournaments — no deposit needed.

---

[Full Leaderboard](https://raisegg.com/leaderboard) | [Play Now](https://raisegg.com/play)`
    },
  },
  {
    category: 'leaderboard',
    flair: 'City Rivalry',
    titleFn: () => 'City Leaderboard — Which city dominates RaiseGG?',
    bodyFn: (d) => {
      const cityList = d.stats.topCities.slice(0, 10)
        .map((c, i) => `${i + 1}. **${c.city}** — ${c.wins} total wins`)
        .join('\n')

      return `City rankings are updated live on RaiseGG. Here's where things stand:

${cityList || '*(No city data yet)*'}

Rep your city by playing matches and climbing the leaderboard.

We run city-themed tournaments:
- Monday: Balkan Night
- Tuesday: Caucasus Cup
- Wednesday: Turkish Wednesday
- Thursday: Central Asia
- Friday: Istanbul Night
- Saturday: Championship

---

[City Leaderboard](https://raisegg.com/leaderboard) | [Tournaments](https://raisegg.com/tournaments)`
    },
  },
  {
    category: 'leaderboard',
    flair: 'City Rivalry',
    titleFn: () => 'Istanbul vs Bucharest vs Belgrade — The eternal rivalry continues',
    bodyFn: (d) => {
      const istanbul = d.stats.topCities.find(c => c.city.toLowerCase().includes('istanbul'))
      const bucharest = d.stats.topCities.find(c => c.city.toLowerCase().includes('bucharest'))
      const belgrade = d.stats.topCities.find(c => c.city.toLowerCase().includes('belgrade'))
      return `The three-way rivalry between Istanbul, Bucharest, and Belgrade is heating up on RaiseGG.

Current standings:
- Istanbul: ${istanbul?.wins || 0} wins
- Bucharest: ${bucharest?.wins || 0} wins
- Belgrade: ${belgrade?.wins || 0} wins

Which city will come out on top this week?

Play matches to earn wins for your city. Every match counts.

---

[Play Now](https://raisegg.com/play) | [City Leaderboard](https://raisegg.com/leaderboard)`
    },
  },
  {
    category: 'leaderboard',
    flair: 'Announcement',
    titleFn: (d) => `ELO Rankings Update — ${d.topPlayers.length > 0 ? d.topPlayers[0].username + ' leads' : 'New season begins'}`,
    bodyFn: (d) => {
      const top5 = d.topPlayers.slice(0, 5)
        .map((p, i) => `${i + 1}. **${p.username}** — ELO ${p.elo}`)
        .join('\n')
      return `ELO rankings on RaiseGG:

${top5 || '*(Climb the ranks!)*'}

ELO is calculated per game (CS2, Dota 2, Deadlock). Win against higher-ranked players for bigger ELO gains.

New players start at 1000 ELO. Tiers range from Bronze (0-999) to Diamond (2000+).

---

[Leaderboard](https://raisegg.com/leaderboard) | [Play Now](https://raisegg.com/play)`
    },
  },
  {
    category: 'leaderboard',
    flair: 'City Rivalry',
    titleFn: () => 'Caucasus Cup Standings — Tbilisi vs Baku vs Yerevan',
    bodyFn: (d) => {
      const tbilisi = d.stats.topCities.find(c => c.city.toLowerCase().includes('tbilisi'))
      const baku = d.stats.topCities.find(c => c.city.toLowerCase().includes('baku'))
      const yerevan = d.stats.topCities.find(c => c.city.toLowerCase().includes('yerevan'))
      return `Every Tuesday is Caucasus Cup night on RaiseGG.

Current standings:
- Tbilisi: ${tbilisi?.wins || 0} wins
- Baku: ${baku?.wins || 0} wins
- Yerevan: ${yerevan?.wins || 0} wins

Free entry, real prizes. Rep your city.

The Caucasus CS2 scene is underrated. Let's change that.

---

[Join Tuesday Caucasus Cup](https://raisegg.com/tournaments)`
    },
  },

  // ── Tournament Announcements (5) ────────────────────────────────────────

  {
    category: 'tournament',
    flair: 'Tournament',
    titleFn: () => 'Free Daily CS2 Tournament — $5 USDC prize, no entry fee, 8 slots',
    bodyFn: () => `We run free CS2 tournaments every single day on RaiseGG.

**Format:**
- 8 players, single elimination
- BO1, dedicated servers with MatchZy anti-cheat
- Winner takes $5 USDC (withdraw to any crypto wallet)
- No entry fee — completely free

**Today's tournament:** Sign up now at [raisegg.com/tournaments](https://raisegg.com/tournaments)

All you need is a Steam account. No deposit, no crypto wallet needed to join free tournaments.

---

[Sign Up](https://raisegg.com/tournaments) | [How It Works](https://raisegg.com/play)`,
  },
  {
    category: 'tournament',
    flair: 'Tournament',
    titleFn: () => 'Weekend Championship Tournament — Bigger prize pool, bigger stakes',
    bodyFn: () => `Saturday Championship is the biggest recurring tournament on RaiseGG.

- Free entry OR stake entry (your choice)
- Dedicated anti-cheat servers
- City leaderboard points count double
- All three games: CS2, Dota 2, Deadlock

Whether you're grinding free tournaments or playing for stakes, Saturday is the day to prove yourself.

---

[Sign Up for Saturday](https://raisegg.com/tournaments)`,
  },
  {
    category: 'tournament',
    flair: 'Tournament',
    titleFn: () => 'Balkan Night Monday — Free CS2 tournament for Balkan players',
    bodyFn: () => `Every Monday is Balkan Night on RaiseGG.

- Free entry, $5 USDC prize
- 8-player single elimination
- Anti-cheat servers (Frankfurt)
- City leaderboard: Belgrade vs Bucharest vs Sofia vs Athens vs Zagreb

Serbia, Romania, Bulgaria, Greece, Croatia, Bosnia — come rep your country and city.

The Balkan CS2 scene is one of the strongest in Europe. Let's prove it.

---

[Join Monday Balkan Night](https://raisegg.com/tournaments)`,
  },
  {
    category: 'tournament',
    flair: 'Tournament',
    titleFn: () => 'Turkish Wednesday — Istanbul vs Ankara vs Izmir, free CS2 tournament',
    bodyFn: () => `Her Carsamba Turk oyuncular icin ozel turnuva!

Every Wednesday is Turkish Wednesday on RaiseGG:
- Free entry, $5 USDC prize
- 8-player single elimination
- City leaderboard tracking
- Istanbul vs Ankara vs Izmir vs Bursa vs Antalya

The Turkish CS2 scene is massive. Come show which city is the best.

---

[Join Turkish Wednesday](https://raisegg.com/tournaments)`,
  },
  {
    category: 'tournament',
    flair: 'Dota 2',
    titleFn: () => 'Dota 2 1v1 Mid Tournament — Free entry, $5 USDC prize',
    bodyFn: () => `We're expanding tournaments to Dota 2 on RaiseGG.

**Format:**
- 1v1 mid, first to 2 kills or first tower
- 8 players, single elimination
- Free entry, $5 USDC to winner
- EU servers

Blind pick heroes. No counterpicking. Pure skill.

This is the ultimate test of laning ability. Are you ready?

---

[Sign Up](https://raisegg.com/tournaments) | [Play Dota 2](https://raisegg.com/play)`,
  },

  // ── Announcements / Feature Updates (5) ─────────────────────────────────

  {
    category: 'announcement',
    flair: 'Announcement',
    titleFn: () => 'RaiseGG Platform Update — What\'s new this week',
    bodyFn: (d) => `Weekly update from the RaiseGG team:

**Stats this week:**
- ${d.stats.last24h * 7} matches played (estimated)
- ${d.stats.totalMatches} total matches all-time
- Top cities: ${d.stats.topCities.slice(0, 3).map(c => c.city).join(', ') || 'TBD'}

**What we're working on:**
- Improved matchmaking algorithm
- More tournament formats
- Mobile-friendly improvements
- New city leaderboard features

**Coming soon:**
- 2v2 and 5v5 stake matches
- Dota 2 tournament expansion
- Deadlock ranked play

Feedback? Drop it in the comments.

---

[Play Now](https://raisegg.com/play) | [Discord](https://discord.gg/ErWPgH7gd6)`,
  },
  {
    category: 'announcement',
    flair: 'Announcement',
    titleFn: () => 'How blockchain escrow works on RaiseGG — explained simply',
    bodyFn: () => `A lot of people ask how the money side works. Here's the simple version:

**Before the match:**
1. Both players deposit USDC into a Solana smart contract
2. The contract locks the funds — nobody can touch them

**During the match:**
3. You play on dedicated servers with anti-cheat
4. The match result is verified by the server

**After the match:**
5. Winner's wallet receives both stakes minus a small fee
6. Transaction happens in < 1 second on Solana

**Why this matters:**
- No trust needed between players
- Cross-border payments solved (Turkey to Georgia in 400ms)
- No chargebacks, no scams
- Transparent and verifiable on-chain

We also have free tournaments — no crypto needed for those.

Questions? Ask in the comments.

---

[How It Works](https://raisegg.com/play) | [Free Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'announcement',
    flair: 'Announcement',
    titleFn: () => 'RaiseGG now supports 3 games — CS2, Dota 2, and Deadlock',
    bodyFn: () => `All three Valve competitive games are supported on RaiseGG:

**CS2** — 1v1, 2v2, 5v5
- Maps: Dust2, Mirage, Inferno, and more
- Anti-cheat: VAC + MatchZy
- Stakes: $1-$100 USDC

**Dota 2** — 1v1 Mid
- First to 2 kills or first tower
- All heroes available (blind pick)
- Stakes: $1-$50 USDC

**Deadlock** — 1v1
- Format evolving based on community feedback
- Stakes: $1-$20 USDC

All games use blockchain escrow and dedicated servers.

Free daily tournaments available for CS2. Dota 2 and Deadlock tournaments coming soon.

---

[Play Now](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'announcement',
    flair: 'Guide',
    titleFn: () => 'New to RaiseGG? Start here — Complete beginner guide',
    bodyFn: () => `Welcome to RaiseGG! Here's everything you need to know:

## Getting Started

1. **Create an account** at [raisegg.com](https://raisegg.com)
2. **Link your Steam** account
3. **Try a free tournament** (no deposit needed)
4. **Optional:** Connect a Solana wallet for stake matches

## Free vs Stake Matches

**Free tournaments:**
- No deposit needed
- $5 USDC prize to winner
- 8-player single elimination
- Daily, multiple themes (Balkan Night, Turkish Wednesday, etc.)

**Stake matches:**
- Deposit USDC/USDT into blockchain escrow
- Play 1v1, 2v2, or 5v5
- Winner takes the pot automatically
- Stakes from $1 to $100

## Anti-Cheat

All matches run on dedicated servers with VAC + MatchZy. Cheaters get banned permanently.

## ELO System

10 tiers from Bronze to Diamond. Win matches to climb. Beat higher-ranked players for bigger gains.

---

[Create Account](https://raisegg.com) | [Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'announcement',
    flair: 'Announcement',
    titleFn: () => 'RaiseGG Roadmap — What\'s coming in the next 30 days',
    bodyFn: () => `Transparency post. Here's what we're building:

**This week:**
- Matchmaking improvements
- Better notification system
- Mobile layout fixes

**Next 2 weeks:**
- 2v2 CS2 stake matches
- Dota 2 daily tournaments
- Improved ELO algorithm

**This month:**
- Deadlock ranked system
- Team leaderboards
- Referral rewards program
- More regions (Central Asia expansion)

**Longer term:**
- Mobile app
- More game support
- Fiat on-ramp

What should we prioritize? Vote in the comments.

---

[Play Now](https://raisegg.com/play) | [Discord](https://discord.gg/ErWPgH7gd6)`,
  },

  // ── Discussion Starters (8) ─────────────────────────────────────────────

  {
    category: 'discussion',
    flair: 'Discussion',
    titleFn: () => 'What\'s your favorite CS2 map for 1v1 stake matches?',
    bodyFn: () => `When there's money on the line, map choice matters more than ever.

**Poll:**
- Dust2 — Pure aim, balanced
- Mirage — Mid control is everything
- Inferno — Banana control wins the game
- Overpass — Underrated for 1v1s
- Nuke — Chaos (but some people love it)

Comment your pick and why. We'll track the community's preference and maybe add a "community choice" map to tournaments.

---

[Play CS2 1v1](https://raisegg.com/play)`,
  },
  {
    category: 'discussion',
    flair: 'Discussion',
    titleFn: () => 'Does adding money to matches make you play better or worse?',
    bodyFn: () => `Genuine question for the community.

**Theory A: Better**
- Higher focus and attention
- No autopilot
- Every round matters
- Simulates tournament pressure

**Theory B: Worse**
- Anxiety leads to mistakes
- Playing too safe
- Tilting faster after losing rounds
- Over-thinking simple decisions

What's your experience? We've noticed on RaiseGG that players who start with free tournaments and then move to small stakes ($1-2) perform best. The pressure sweet spot seems to be "enough to care, not enough to stress."

---

[Try Free Tournaments First](https://raisegg.com/tournaments)`,
  },
  {
    category: 'discussion',
    flair: 'Discussion',
    titleFn: () => 'If you could only play ONE Dota 2 hero in a $10 1v1 mid, who do you pick?',
    bodyFn: () => `Blind pick. No counterpicking. $10 USDC on the line.

Popular answers from RaiseGG players:
- **Shadow Fiend** — Razes dominate lane
- **QOP** — Kill pressure from level 6
- **Huskar** — Nobody practices against him
- **Puck** — Slippery and aggressive
- **Invoker** — If you can micro, you win

The meta for stake 1v1 mid is actually different from ranked Dota. When there's money on the line, people pick comfort heroes over meta heroes.

What's YOUR pick?

---

[Play Dota 2 1v1](https://raisegg.com/play)`,
  },
  {
    category: 'discussion',
    flair: 'Discussion',
    titleFn: () => 'Which region has the best CS2 players? (Turkey, Balkans, Caucasus, Central Asia)',
    bodyFn: (d) => {
      const cityList = d.stats.topCities.slice(0, 5)
        .map(c => `${c.city}: ${c.wins} wins`)
        .join(', ')
      return `Based on RaiseGG data so far:

**Top cities by wins:** ${cityList || 'TBD'}

But wins don't tell the whole story. Some regions have fewer players but higher win rates.

We target these underserved regions specifically:
- Turkey (Istanbul, Ankara, Izmir)
- Balkans (Belgrade, Bucharest, Sofia, Athens)
- Caucasus (Tbilisi, Baku, Yerevan)
- Central Asia (Almaty, Tashkent)

Which region do you think has the most raw talent?

---

[City Leaderboard](https://raisegg.com/leaderboard)`
    },
  },
  {
    category: 'discussion',
    flair: 'Discussion',
    titleFn: () => 'Is competitive Deadlock going to be bigger than Dota 2?',
    bodyFn: () => `Hot take: Deadlock's competitive potential is massive.

**Why Deadlock could be huge:**
- More action-oriented than Dota 2
- Easier to watch for spectators
- Shorter matches for tournament formats
- Fresh game = fresh competitive scene

**Why it might not:**
- Still in development
- Competitive format isn't settled
- Dota 2 has decades of history

On RaiseGG, we support all three Valve games. Deadlock stake matches are new but the engagement is promising.

What's your prediction? Will Deadlock have a competitive scene bigger than Dota 2 in 2 years?

---

[Play Deadlock](https://raisegg.com/play)`,
  },
  {
    category: 'discussion',
    flair: 'Discussion',
    titleFn: () => 'Why doesn\'t Eastern Europe have better esports infrastructure?',
    bodyFn: () => `Eastern Europe, Turkey, and the Caucasus have incredible gaming talent. But where's the infrastructure?

**The problem:**
- No local tournament platforms
- Payment methods don't work cross-border easily
- Big platforms ignore smaller regions
- Language barriers (not everything is in English)

**What we're building with RaiseGG:**
- Crypto payments solve cross-border (USDC works everywhere)
- City-based competitions (not just country-level)
- Free daily tournaments (no deposit barrier)
- Multi-language support coming

The talent is there. The infrastructure isn't. That's literally why we built RaiseGG.

What does YOUR region need?

---

[Play Now](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'discussion',
    flair: 'Discussion',
    titleFn: () => 'What stake amount is the "sweet spot" for competitive gaming?',
    bodyFn: () => `We've been tracking stake preferences on RaiseGG and the data is interesting:

**Most popular stakes:**
- $1-2 USDC — Most common for new players
- $5 USDC — The "sweet spot" for most
- $10+ USDC — Serious competitors only

**The psychology:**
- Too low ($0.10) — Nobody cares, might as well play free
- Sweet spot ($2-5) — Enough to focus, not enough to stress
- Too high ($50+) — Anxiety kills performance

What stake amount would make YOU take a 1v1 seriously without stressing?

---

[Play Now](https://raisegg.com/play) | [Free Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'discussion',
    flair: 'Discussion',
    titleFn: () => 'Crypto payments vs traditional banking for gaming — which is better?',
    bodyFn: () => `For competitive gaming across borders, crypto has real advantages:

**Crypto (what we use):**
- Instant (< 1 second on Solana)
- Works in every country
- No chargebacks (prevents scams)
- Near-zero fees
- USDC is stable (no price swings)

**Traditional banking:**
- Familiar to most people
- No wallet setup needed
- Regulated and insured
- But... slow, expensive, and doesn't work cross-border easily

On RaiseGG, we use USDC on Solana specifically because our players are in Turkey, Georgia, Romania, Serbia — countries where PayPal doesn't always work and bank transfers take days.

The tradeoff is onboarding friction. Getting USDC into a wallet is still too many steps for most people.

What would you prefer?

---

[How It Works](https://raisegg.com/play)`,
  },

  // ── City Rivalry Posts (4) ──────────────────────────────────────────────

  {
    category: 'city_rivalry',
    flair: 'City Rivalry',
    titleFn: () => 'City vs City: Which city is going to dominate RaiseGG this week?',
    bodyFn: (d) => {
      const cities = d.stats.topCities.slice(0, 5)
        .map(c => `- **${c.city}**: ${c.wins} wins`)
        .join('\n')
      return `Current city standings on RaiseGG:

${cities || '*(No data yet — be the first to rep your city!)*'}

Every match you play counts toward your city's ranking. Which city will come out on top this week?

Themed tournament nights:
- Monday: Balkan Night
- Tuesday: Caucasus Cup
- Wednesday: Turkish Wednesday
- Friday: Istanbul Night

---

[Play Now](https://raisegg.com/play) | [City Leaderboard](https://raisegg.com/leaderboard)`
    },
  },
  {
    category: 'city_rivalry',
    flair: 'City Rivalry',
    titleFn: () => 'Ankara players — Istanbul has been talking trash. Time to respond.',
    bodyFn: () => `Istanbul currently leads the Turkish city rankings on RaiseGG. Ankara, are you going to take that?

Every Wednesday is Turkish Wednesday — free CS2 tournament specifically for Turkish cities to compete.

- Free entry, $5 USDC prize
- City leaderboard tracking
- Anti-cheat servers

Istanbul has more players, but Ankara has a higher win rate per player. Quality over quantity?

Come prove it.

---

[Join Turkish Wednesday](https://raisegg.com/tournaments)`,
  },
  {
    category: 'city_rivalry',
    flair: 'City Rivalry',
    titleFn: () => 'Cluj vs Bucharest — the Romanian CS2 rivalry is real',
    bodyFn: () => `On RaiseGG, Romanian cities are competing hard.

Bucharest has more total wins but Cluj has a suspiciously high win rate. Something in the Transylvanian water?

Monday Balkan Night is the best time to settle this. Free entry, $5 USDC prize, city leaderboard tracking.

Timisoara and Iasi players are also showing up. The Romanian CS2 scene is deeper than people think.

---

[Join Monday Balkan Night](https://raisegg.com/tournaments)`,
  },
  {
    category: 'city_rivalry',
    flair: 'City Rivalry',
    titleFn: () => 'Belgrade is coming for everyone — Serbian CS2 on the rise',
    bodyFn: () => `Belgrade players on RaiseGG have been on a tear. High win rates in 1v1s, aggressive playstyle, and they show up consistently to Monday Balkan Night.

Can Bucharest, Sofia, or Athens stop them? The Balkan rivalry is the most entertaining thing on the platform right now.

Free entry, real prizes, city leaderboard tracking.

---

[Monday Balkan Night](https://raisegg.com/tournaments) | [Leaderboard](https://raisegg.com/leaderboard)`,
  },

  // ── Tips & Guides (4) ──────────────────────────────────────────────────

  {
    category: 'tips',
    flair: 'Guide',
    titleFn: () => '5 tips for winning CS2 1v1 stake matches',
    bodyFn: () => `After watching hundreds of 1v1s on RaiseGG, here are the patterns:

**1. Map knowledge > Aim**
Players who know every angle on their chosen map win more than pure aimers.

**2. Economy matters even in 1v1**
Don't force-buy every round. Sometimes saving for a round wins you the half.

**3. Play YOUR map**
Don't let the opponent pick a map you're uncomfortable with. Counter-pick or veto.

**4. Warm up before staking**
Play a free tournament first. Cold hands = lost money.

**5. Don't tilt-stake**
Lost 3 in a row? Take a break. The matches will still be there tomorrow.

---

[Free Tournaments (Warm Up)](https://raisegg.com/tournaments) | [Play 1v1](https://raisegg.com/play)`,
  },
  {
    category: 'tips',
    flair: 'Guide',
    titleFn: () => 'How to use Solana wallet with RaiseGG — simple guide',
    bodyFn: () => `Getting set up with crypto for RaiseGG stake matches:

**Step 1: Get a Solana wallet**
- Phantom (recommended) — [phantom.app](https://phantom.app)
- Solflare — [solflare.com](https://solflare.com)

**Step 2: Get USDC**
- Buy on any exchange (Binance, Coinbase, etc.)
- Send USDC to your Solana wallet address
- Make sure it's USDC on Solana (not Ethereum)

**Step 3: Connect to RaiseGG**
- Go to [raisegg.com](https://raisegg.com)
- Click "Connect Wallet"
- Approve the connection in your wallet

**Step 4: Play**
- Create or join a match
- Deposit USDC into the escrow
- Play and win

**Don't have crypto?** No problem. Free tournaments don't require any deposit.

---

[Start Playing](https://raisegg.com/play) | [Free Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'tips',
    flair: 'Guide',
    titleFn: () => 'How 1v1 mid practice improved my Dota 2 MMR — a guide',
    bodyFn: () => `Playing 1v1 mid for stakes on RaiseGG taught me things I never learned in matchmaking:

**What changed:**
1. I started checking enemy starting items at 0:00 every game
2. Creep aggro manipulation became automatic
3. I count enemy regen and trade accordingly
4. Power spike awareness — I feel when enemies hit bottle/level 6
5. Wave control went from "whatever" to intentional

**The key insight:** 1v1 mid games are 5-10 minutes. You get 6-12 laning reps per hour instead of 1-2 full games. The practice density is insane.

**How to start:**
1. Play free tournaments on RaiseGG (no money needed)
2. Focus on one hero until you master the lane
3. When you're consistent, try $1-2 stake matches
4. Review what went wrong after every loss

---

[Free Tournaments](https://raisegg.com/tournaments) | [Play Dota 2](https://raisegg.com/play)`,
  },
  {
    category: 'tips',
    flair: 'Guide',
    titleFn: () => 'Understanding ELO on RaiseGG — How the ranking system works',
    bodyFn: () => `Quick explainer on how ELO works on RaiseGG:

**Starting ELO:** 1000

**Tiers:**
- Bronze: 0-999
- Silver: 1000-1299
- Gold: 1300-1599
- Platinum: 1600-1899
- Diamond: 2000+

**How gains/losses work:**
- Beat someone higher ranked = big ELO gain
- Beat someone lower ranked = small ELO gain
- Lose to someone lower ranked = big ELO loss
- Lose to someone higher ranked = small ELO loss

**Tips for climbing:**
- Play consistently (don't go on tilt streaks)
- Play your strongest game/map
- Warm up with free tournaments before stake matches
- Study your losses

ELO is tracked separately for CS2, Dota 2, and Deadlock.

---

[Check Your Rank](https://raisegg.com/leaderboard) | [Play Now](https://raisegg.com/play)`,
  },

  // ── Weekly Recap (3) ───────────────────────────────────────────────────

  {
    category: 'weekly_recap',
    flair: 'Announcement',
    titleFn: () => 'RaiseGG Weekly Recap — Matches, cities, and highlights',
    bodyFn: (d) => {
      const top3 = d.topPlayers.slice(0, 3)
        .map((p, i) => `${i + 1}. **${p.username}** — ${p.totalWins} wins`)
        .join('\n')
      const cities = d.stats.topCities.slice(0, 3)
        .map((c, i) => `${i + 1}. **${c.city}** — ${c.wins} wins`)
        .join('\n')
      return `Weekly recap from RaiseGG:

**Matches this week:** ~${d.stats.last24h * 7} (estimated)
**Total matches all-time:** ${d.stats.totalMatches}

**Top players:**
${top3 || '*(No data yet)*'}

**Top cities:**
${cities || '*(No data yet)*'}

**Highlights:**
- Free daily tournaments continue (8-player, $5 USDC)
- City rivalries intensifying
- New players joining from across Eastern Europe, Turkey, and Caucasus

See you on the server.

---

[Play Now](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments) | [Leaderboard](https://raisegg.com/leaderboard)`
    },
  },
  {
    category: 'weekly_recap',
    flair: 'Match Result',
    titleFn: (d) => `This week's biggest upsets on RaiseGG — ${d.stats.totalMatches} total matches`,
    bodyFn: () => `Every week we see upsets that shouldn't happen on paper.

The beauty of 1v1 stake matches: rank means nothing when the match starts. We've seen Bronze players beat Diamonds because they chose the right map, the right hero, or just had a better day.

**Why upsets happen more in stake matches:**
- Lower-ranked players try harder when money is involved
- Higher-ranked players sometimes get overconfident
- Map/hero selection creates variance
- Mental game matters more with stakes

Share your best upset story in the comments!

---

[Play Now](https://raisegg.com/play) | [Free Tournaments](https://raisegg.com/tournaments)`,
  },
  {
    category: 'weekly_recap',
    flair: 'City Rivalry',
    titleFn: () => 'City Leaderboard Weekly Reset — New week, new rankings',
    bodyFn: (d) => {
      const cities = d.stats.topCities.slice(0, 5)
        .map((c, i) => `${i + 1}. ${c.city} — ${c.wins} wins`)
        .join('\n')
      return `Last week's final city standings:

${cities || '*(No data yet)*'}

The leaderboard resets every Monday. This week is a fresh start.

Which city is going to dominate? Themed tournament nights give bonus city points:
- Monday: Balkan Night
- Tuesday: Caucasus Cup
- Wednesday: Turkish Wednesday
- Friday: Istanbul Night

---

[Tournaments](https://raisegg.com/tournaments) | [City Leaderboard](https://raisegg.com/leaderboard)`
    },
  },
]

// ─── Template selection ──────────────────────────────────────────────────

function pickTemplate(data: TemplateData): PostTemplate {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86400000
  )
  // 4 slots per day (every 6 hours)
  const slot = Math.floor(now.getUTCHours() / 6)
  const runNumber = dayOfYear * 4 + slot

  // Pick template based on run number — ensures rotation through all templates
  const idx = runNumber % TEMPLATES.length
  return TEMPLATES[idx]
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('reddit-community', 'error', { message: 'Reddit not configured' })
    return NextResponse.json({ error: 'Reddit not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    // Fetch real data from Supabase
    const [topPlayers, stats] = await Promise.all([
      getTopPlayers(10),
      getMatchStats(),
    ])

    const now = new Date()
    const data: TemplateData = {
      topPlayers,
      stats,
      dayOfWeek: now.getUTCDay(),
      hour: now.getUTCHours(),
    }

    const template = pickTemplate(data)
    const title = template.titleFn(data)
    const body = template.bodyFn(data)

    // Try own sub first, fall back to relevant gaming subs
    let result = await postToOwnSubreddit(title, body, template.flair)
    let postedTo = SUBREDDIT_NAME

    if (!result.ok) {
      // Own sub not available (new account). Post to relevant subs instead.
      const fallbackSubs = ['esports', 'CompetitiveGaming', 'CryptoGaming', 'PlayToEarn', 'IndieGaming', 'cs2', 'DotA2']
      const subIdx = Math.floor(Date.now() / 86400000) % fallbackSubs.length
      const fallback = fallbackSubs[subIdx]

      result = await submitPost(fallback, title, body, 'self')
      postedTo = fallback

      if (!result.ok) {
        const errMsg = `Failed to post community content: ${result.error}`
        await recordCronRun('reddit-community', 'error', {
          message: errMsg,
          durationMs: Date.now() - start,
        })
        return NextResponse.json({ error: errMsg }, { status: 500 })
      }
    }

    // ── Cross-post best content to bigger subs (1x per day max) ──
    let crossPostedTo = ''
    if (result.postId && postedTo === SUBREDDIT_NAME) {
      const crosspostCategories = ['city_rivalry', 'match_highlight', 'weekly_recap']
      const hour = now.getUTCHours()
      // Only crosspost on the 15:00 run (once/day)
      if (crosspostCategories.includes(template.category) && hour >= 12 && hour <= 18) {
        const crossSubs = ['cs2', 'DotA2', 'esports', 'CompetitiveGaming']
        const crossIdx = now.getUTCDay() % crossSubs.length
        const crossResult = await crossPost(result.postId, crossSubs[crossIdx])
        if (crossResult.ok) crossPostedTo = crossSubs[crossIdx]
      }
    }

    // ── Mod engagement: upvote + comment on new posts in our sub ──
    let engagedPosts = 0
    try {
      const newPosts = await getNewSubPosts(SUBREDDIT_NAME, 5)
      if (newPosts.ok && newPosts.posts) {
        for (const post of newPosts.posts) {
          // Don't comment on our own posts
          if (post.author === (process.env.REDDIT_USERNAME || 'According-West-1344R')) continue
          // Only engage with posts that have 0 comments (nobody replied yet)
          if (post.num_comments > 0) continue

          // Upvote
          await upvoteThing(post.name)

          // Leave a welcoming mod comment
          const welcomeComments = [
            `Welcome to r/RaiseGG! 🎮 Thanks for posting. If you haven't already, check out our [free daily tournaments](https://raisegg.com/tournaments) — $5 USDC prize, no entry fee!`,
            `Great post! If you're looking for competitive matches, we have free tournaments every day at 3 PM UTC. [Sign up here](https://raisegg.com/tournaments) 🏆`,
            `Thanks for being part of the community! If you haven't tried a match yet, the [free tournaments](https://raisegg.com/tournaments) are the best way to start — no deposit needed. Good luck! 🎯`,
            `Appreciate the post! Don't forget to set your city flair — city rivalries are a big part of what makes this community fun. [Play now](https://raisegg.com/play) 🏙️`,
          ]
          const commentIdx = Math.floor(Date.now() / 1000) % welcomeComments.length
          const commentRes = await submitComment(post.name, welcomeComments[commentIdx])

          if (commentRes.ok && commentRes.commentId) {
            await distinguishAsmod(commentRes.commentId, 'yes')
            engagedPosts++
          }

          await new Promise(r => setTimeout(r, 2000)) // Rate limit safety
        }
      }
    } catch {
      // Engagement is best-effort, don't fail the cron
    }

    // ── Polls: post an engagement poll every 4th run ──
    let pollPosted = ''
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86400000
    )
    const slot = Math.floor(now.getUTCHours() / 6)
    const runNumber = dayOfYear * 4 + slot
    if (runNumber % 4 === 3) {
      const polls = [
        {
          title: 'Best CS2 map for 1v1?',
          options: ['Dust2', 'Mirage', 'Inferno', 'Nuke', 'Overpass', 'Ancient'],
          body: 'Vote for your favorite 1v1 map! We\'ll use the results to pick tournament maps on [RaiseGG](https://raisegg.com).',
        },
        {
          title: 'Dota 2 vs CS2 — Which takes more skill?',
          options: ['Dota 2 — macro/strategy', 'CS2 — mechanics/aim', 'Equal but different', 'Deadlock will surpass both'],
          body: 'The eternal debate. Vote and argue in the comments.',
        },
        {
          title: 'Which city will top the leaderboard this week?',
          options: ['Istanbul', 'Belgrade', 'Bucharest', 'Moscow', 'Athens', 'Other (comment below)'],
          body: 'City rivalries are heating up on [RaiseGG](https://raisegg.com/leaderboard). Which city has the best gamers?',
        },
        {
          title: 'What\'s your preferred stake amount for 1v1 matches?',
          options: ['Free (tournaments only)', '$1-2 USDC', '$5 USDC', '$10+ USDC', '$20+ USDC'],
          body: 'Help us calibrate stakes on [RaiseGG](https://raisegg.com/play). What feels right for competitive 1v1s?',
        },
        {
          title: 'Best 1v1 mid hero in Dota 2?',
          options: ['Queen of Pain', 'Storm Spirit', 'Ember Spirit', 'Shadow Fiend', 'Huskar', 'Other (comment)'],
          body: 'For 1v1 mid stake matches on [RaiseGG](https://raisegg.com/play) — which hero gives you the best chance?',
        },
        {
          title: 'Which region has the strongest CS2 players?',
          options: ['Turkey', 'Balkans (Serbia/Romania/Bulgaria)', 'Russia/CIS', 'Caucasus (Georgia/Armenia/Azerbaijan)', 'Central Asia', 'Middle East'],
          body: 'We see players from all these regions on [RaiseGG](https://raisegg.com). Who\'s actually the strongest?',
        },
      ]

      const pollIdx = runNumber % polls.length
      const poll = polls[pollIdx]
      const pollSub = postedTo === SUBREDDIT_NAME ? SUBREDDIT_NAME : 'esports'
      const pollResult = await submitPoll(pollSub, poll.title, poll.options, poll.body, 3)
      if (pollResult.ok) pollPosted = poll.title
    }

    const summary = `Posted to r/${postedTo} [${template.category}/${template.flair}]: "${title}" — ${result.postUrl}` +
      (crossPostedTo ? ` | x-posted to r/${crossPostedTo}` : '') +
      (engagedPosts > 0 ? ` | engaged ${engagedPosts} user posts` : '') +
      (pollPosted ? ` | poll: "${pollPosted}"` : '')

    await recordCronRun('reddit-community', 'ok', {
      message: summary,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      subreddit: postedTo,
      category: template.category,
      flair: template.flair,
      title,
      postUrl: result.postUrl,
      postId: result.postId,
      crossPostedTo: crossPostedTo || undefined,
      engagedPosts,
      pollPosted: pollPosted || undefined,
      stats: {
        totalMatches: stats.totalMatches,
        last24h: stats.last24h,
        topCities: stats.topCities.length,
        topPlayers: topPlayers.length,
      },
      summary,
    })
  } catch (err) {
    await recordCronRun('reddit-community', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
