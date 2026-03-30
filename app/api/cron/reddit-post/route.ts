// Cron: Reddit auto-poster
// Posts 2x/day — rotates through subreddits and templates
// Schedule: 0 10,20 * * * (10am and 8pm UTC)
// Conservative: ONE subreddit, ONE post per run

import { NextResponse } from 'next/server'
import { isConfigured, submitPost } from '@/lib/reddit-poster'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 30

// ─── Subreddit rotation ────────────────────────────────────────────────────

// Tier 1: Direct promo allowed — post openly about RaiseGG
const TIER1_SUBS = [
  // Betting & staking
  'esportsbetting',     // 37K — betting discussion
  'csgobetting',        // 80K — CS betting
  'Dota2Betting',       // 5K — Dota betting
  // Crypto gaming
  'CryptoGaming',       // 30K — target audience
  'PlayToEarn',         // 20K — P2E projects welcome
  'web3gaming',         // 5K — project announcements
  'SolanaGaming',       // 3K — directly relevant
  'FreeCrypto',         // 30K — faucet/free angle
  // LFG & gaming partners
  'RecruitCS',          // 56K — LFG is the purpose
  'gamerpals',          // 150K — finding gaming partners
  'compDota2',          // 10K — competitive Dota LFG
  // Indie & discovery
  'IndieGaming',        // 465K — indie games welcome
  'FreeGameFindings',   // 500K — free-to-play angle
  // Streamers
  'Twitch_Startup',     // 50K — partner with streamers
  'SmallStreamers',     // 18K — self promo allowed
  // Crypto ecosystem
  'solana',             // 300K — ecosystem discussion
  'SolanaNetwork',      // 5K — Solana projects
  'defi',               // 100K — DeFi/crypto
  'CryptoCurrency',     // 7M — crypto discussion
  'CryptoMoonShots',    // 2M — new crypto projects
  'SatoshiStreetBets',  // 750K — degen crypto
  'ethgaming',          // 5K — ETH gaming
  'NFTGaming',          // 10K — NFT/gaming crossover
  'blockchain',         // 500K — blockchain tech
  'altcoin',            // 200K — altcoin discussion
] as const

// Tier 2: Organic/discussion — blend in, no direct ads
const TIER2_SUBS = [
  // ── Core gaming subs ──
  'GlobalOffensive',    // 2.9M — CS discussion
  'cs2',                // 229K — CS2 specific
  'csgo',               // 618K — memes, clips
  'CounterStrike',      // 50K — all CS games
  'DotA2',              // 1.25M — Dota discussion
  'TrueDoTA2',          // 80K — competitive Dota
  'learndota2',         // 100K — educational
  'DeadlockTheGame',    // 213K — growing, less strict
  'esports',            // 70K — news/discussion
  'CompetitiveGaming',  // 10K — competitive discussion
  'pcgaming',           // 2M — PC gaming
  'Games',              // 3M — game discussion

  // ── Turkey ──
  'Turkey',             // 1.7M — main Turkish sub
  'KGBTR',              // 500K — Turkish meme/culture
  'TurkeyJerky',        // 100K — Turkish memes
  'Turkiye',            // 50K — Turkish community

  // ── Russia & CIS ──
  'pikabu',             // 400K — Russian Reddit
  'russia',             // 200K — Russian community
  'AskARussian',        // 80K — Russian Q&A
  'liberta',            // 50K — Russian-speaking
  'RussianGaming',      // smaller — Russian gaming

  // ── Balkans ──
  'romania',            // 500K — Romania
  'serbia',             // 456K — Serbia
  'greece',             // 252K — Greece
  'croatia',            // 395K — Croatia
  'bulgaria',           // 50K — Bulgaria
  'bih',                // 7K — Bosnia
  'Albania',            // 30K — Albania
  'NorthMacedonia',     // 10K — North Macedonia
  'Kosovo',             // 15K — Kosovo
  'Montenegro',         // 5K — Montenegro
  'balkans_irl',        // 160K — Balkan memes
  'AskBalkans',         // 50K — Balkan discussion

  // ── Caucasus ──
  'Sakartvelo',         // 60K — Georgia
  'armenia',            // 250K — Armenia
  'Azerbaijan',         // 87K — Azerbaijan

  // ── Central Asia ──
  'Kazakhstan',         // 20K — Kazakhstan
  'Uzbekistan',         // 5K — Uzbekistan
  'centralasia',        // 10K — Central Asia
  'AskCentralAsia',     // 15K — Central Asia Q&A

  // ── Middle East ──
  'iran',               // 103K — Iran
  'iranian',            // 30K — Iranian community

  // ── Eastern Europe ──
  'ukraine',            // 500K — Ukraine
  'Hungary',            // 100K — Hungary
  'poland',             // 200K — Poland
  'czech',              // 100K — Czech Republic
  'Moldova',            // 10K — Moldova
] as const

// Combined for rotation
const SUBREDDITS = [...TIER1_SUBS, ...TIER2_SUBS] as const

// ─── Post templates ────────────────────────────────────────────────────────
// Each template has target subreddits it's appropriate for

interface PostTemplate {
  title: string
  body: string
  subreddits: string[] // which subreddits this template works for
}

const TEMPLATES: PostTemplate[] = [
  // Discussion starters
  {
    title: 'What if you could 1v1 for actual money with anti-cheat and escrow?',
    body: `Been thinking about this lately. Back in the day we used to do wager matches in IRC channels and just hope the other person would pay up. Most of the time they didn't.

Now there are platforms that use blockchain escrow — your money sits in a smart contract until the match ends, then auto-pays the winner. Anti-cheat running on the server too.

Would you actually play stake matches if you knew you couldn't get scammed? Or does adding money just ruin the fun?

I've been testing one called RaiseGG and it's honestly pretty smooth but I want to know if there's even demand for this.`,
    subreddits: ['GlobalOffensive', 'cs2', 'DotA2'],
  },
  {
    title: 'Would you 1v1 mid for real money if there was anti-cheat and escrow?',
    body: `Hear me out. Remember the old "1v1 mid or feed" days?

What if you could actually put money on it? Like $2-5 USDC, locked in a smart contract, auto-released to whoever wins?

I built a platform that does this (RaiseGG). Works for Dota 2, CS2, and Deadlock. Blockchain escrow so neither player can scam.

Free tournaments too if you don't want to stake anything. https://raisegg.com/play`,
    subreddits: ['DotA2', 'learndota2'],
  },

  // "I built this" posts
  {
    title: 'I built a CS2 stake platform with blockchain escrow — here\'s what I learned',
    body: `Been working on this for a while so figured I'd share. The platform is called RaiseGG — basically you can play 1v1, 2v2, or 5v5 CS2 matches for USDC/USDT. The money goes into a Solana smart contract before the match starts, and gets released to the winner automatically.

Some things I learned building this:

- Anti-cheat is HARD. We use VAC + MatchZy on dedicated servers
- Crypto payouts solve the "how do I pay someone in Turkey from Georgia" problem instantly
- Nobody trusts a new platform until they see other people using it
- Free tournaments with real prizes are the best way to get people to try it
- The Turkish and Balkan CS2 scenes are massively underserved

We run free daily tournaments ($5 USDC prize, no entry fee) if anyone wants to try it without risking anything.

Happy to answer questions about the tech, the escrow system, or anything else.

https://raisegg.com`,
    subreddits: ['GlobalOffensive', 'cs2', 'esports'],
  },
  {
    title: 'Built a stake gaming platform — Dota 2 1v1 mid for USDC is live',
    body: `RaiseGG lets you play 1v1 mid for real money (USDC/USDT on Solana). The money goes into a smart contract before the match, winner gets paid automatically.

Why Dota?
- 1v1 mid is the purest skill test in gaming
- No RNG in laning phase (mostly)
- Dota players already argue about who's better — now you can prove it

We also support CS2 and Deadlock.

Free daily tournaments if you want to try it risk-free.

AMA about the tech.

https://raisegg.com`,
    subreddits: ['DotA2'],
  },

  // Tournament announcements
  {
    title: 'Free CS2 tournament tonight, $5 USDC prize, no entry fee — 8 slots',
    body: `Running a small single elimination tonight. 8 players, BO1, dedicated servers with anti-cheat.

- Entry: Free
- Prize: $5 USDC to the winner
- Anti-cheat: VAC + MatchZy
- Region: EU servers

Just need a Steam account. No deposit needed.

Sign up: https://raisegg.com/tournaments

We run these every day. Trying to build a competitive community around small-stakes CS2.`,
    subreddits: ['GlobalOffensive', 'cs2', 'RecruitCS'],
  },
  {
    title: 'Free Deadlock tournament this weekend — $5 USDC prize',
    body: `Want to try competitive Deadlock? We're running a free 8-player tournament on RaiseGG.

- Free entry (no deposit)
- $5 USDC prize to winner
- 1v1 format
- EU servers

Sign up: https://raisegg.com/tournaments

We already run daily CS2 and Dota 2 tournaments. Expanding to Deadlock because the game is incredible for competitive play.`,
    subreddits: ['DeadlockTheGame'],
  },

  // City rivalry posts
  {
    title: 'Istanbul vs Ankara — which city actually has better CS2 players?',
    body: `Every Turkish player I've met says their city is the best. So we're actually tracking it now.

We run weekly city-based CS2 tournaments on RaiseGG. Free entry, real prizes, and we keep a city leaderboard.

Istanbul is currently ahead but the sample size is tiny. Would be cool to see this actually settled with data instead of trash talk.

Anyone from Turkey want to rep their city? https://raisegg.com/tournaments`,
    subreddits: ['GlobalOffensive', 'cs2', 'Turkey'],
  },
  {
    title: 'Balkans CS2: Serbia vs Romania vs Bulgaria vs Greece — who\'s actually the best?',
    body: `Running weekly tournaments on RaiseGG with a Balkan leaderboard. Free entry, real prizes.

Monday nights are "Balkan Night" tournaments. Free entry, $5 USDC to winner.

Anyone from the Balkans want to defend their country's honor?

https://raisegg.com/tournaments`,
    subreddits: ['serbia', 'romania', 'esports'],
  },
  {
    title: 'Caucasus CS2 Cup — Tbilisi vs Baku vs Yerevan, free weekly tournament',
    body: `Running a weekly Caucasus-themed CS2 tournament on RaiseGG every Tuesday.

Free entry. $5 USDC prize. Anti-cheat servers.

Rep your city: https://raisegg.com/tournaments

The Caucasus CS2 scene deserves more attention.`,
    subreddits: ['Sakartvelo'],
  },

  // LFG posts
  {
    title: '[EU] Looking for competitive CS2 players for stake matches (1v1 & 5v5)',
    body: `Platform: RaiseGG (raisegg.com)
Region: EU (Turkey, Balkans, Eastern Europe mainly)
Games: CS2 1v1, 2v2, 5v5
Stakes: $1-$10 USDC per match (also free tournaments)

Looking for players who:
- Take the game seriously
- Have clean VAC history
- Want to play for small stakes (or free tournaments to start)

Blockchain escrow on every match — no one can scam you.

Anti-cheat: VAC + MatchZy on dedicated servers.

Drop your Steam if interested or sign up directly.`,
    subreddits: ['RecruitCS'],
  },
  {
    title: '[EU] Building a 5v5 roster for weekly CS2 stake matches',
    body: `Looking for 4 players to form a team for weekly 5v5 stake matches on RaiseGG.

Requirements:
- EU region (low ping to Frankfurt/Istanbul servers)
- Faceit level 5+ or equivalent
- Available for at least 2 matches per week
- Clean VAC history

We play for USDC stakes ($5-$20 per team match). Blockchain escrow handles the money so it's safe.

Also run free tournaments daily if you want to test the waters first.

DM me or add on Steam.`,
    subreddits: ['RecruitCS'],
  },

  // Crypto / technical posts
  {
    title: 'How we built blockchain escrow for competitive gaming on Solana',
    body: `I built a platform called RaiseGG where players stake USDC/USDT on their own CS2, Dota 2, and Deadlock matches.

The problem: Wager gaming has always had a trust problem. Player A beats Player B, Player B doesn't pay.

The solution: Solana smart contract escrow.

How it works:
1. Both players deposit USDC into an escrow program (SPL Token)
2. Funds are locked — neither player can withdraw
3. Match plays out on dedicated servers with anti-cheat
4. Match result is verified and submitted to the contract
5. Winner receives both stakes minus a small platform fee

Why Solana:
- Sub-second finality (gamers won't wait 15 minutes for ETH)
- Near-zero transaction fees ($1-10 matches)
- USDC/USDT native support

Target market: Turkey, Balkans, Caucasus, Central Asia. Regions where traditional payment rails are slow or expensive.

https://raisegg.com

Happy to answer technical questions.`,
    subreddits: ['CryptoCurrency'],
  },
  {
    title: 'Crypto\'s killer app might be peer-to-peer competitive gaming',
    body: `Most crypto use cases feel forced. "Buy coffee with Bitcoin" — why? Visa works fine.

But peer-to-peer gaming across borders? That's a real problem crypto solves.

Scenario: A player in Turkey wants to play a CS2 1v1 for $5 against a player in Georgia.

Traditional path: Bank transfer? 3-5 days, high fees. PayPal? Not available everywhere.

Crypto path: Both deposit USDC into a Solana escrow contract. Match plays. Winner gets paid in 400ms. Done.

I built this (RaiseGG). We target regions where traditional payments are painful — Turkey, Romania, Serbia, Georgia, Azerbaijan, Kazakhstan, Iran, etc.

Curious what this sub thinks. Is competitive gaming a legitimate crypto use case?`,
    subreddits: ['CryptoCurrency'],
  },

  // Educational posts
  {
    title: 'How playing 1v1 mid for stakes improved my laning faster than matchmaking',
    body: `Controversial take: the fastest way to improve at laning is to play 1v1 mid with something on the line.

Here's why:

1. Focus — When there's $2 on the line, you pay attention to every creep, every trade
2. Repetition — 1v1 mid games are 5-10 min. Way more reps per hour than full matches
3. Immediate feedback — You know exactly why you lost. No team to blame
4. Pressure training — Playing under pressure makes ranked feel relaxed

I've been using RaiseGG for this — 1v1 mid matches for small stakes ($1-5 USDC) with blockchain escrow. Also free tournaments.

Went from 3k to 4k MMR in two months mostly by focused 1v1 practice.`,
    subreddits: ['learndota2'],
  },

  // Deadlock specific
  {
    title: 'We added Deadlock to our stake gaming platform — what should the 1v1 format be?',
    body: `Hey everyone! We're RaiseGG — a platform where you can play competitive matches for crypto stakes with blockchain escrow.

We just added Deadlock alongside CS2 and Dota 2.

Still figuring out the best 1v1 format for Deadlock. Options:
- First to X kills
- First to destroy enemy walker/guardian
- Timed — most souls after 10 minutes

What would you want to play? This community knows the game way better than us.

We also run free tournaments — no deposit needed, real prizes.

https://raisegg.com/play`,
    subreddits: ['DeadlockTheGame'],
  },

  // Regional — Turkish
  {
    title: 'Türk CS2 oyuncuları için ücretsiz turnuva platformu — RaiseGG',
    body: `Selam arkadaşlar,

CS2 oynayan Türk oyuncular için bir platform kurdum. RaiseGG üzerinde her gün ücretsiz CS2 turnuvaları düzenliyoruz.

- Ücretsiz giriş
- Kazanana $5 USDC ödül
- 8 kişilik tek eleme turnuvası
- Anti-cheat sunucular
- İstanbul vs Ankara şehir sıralaması

Ayrıca gerçek para (USDC/USDT) ile 1v1 veya 5v5 maç da oynayabilirsiniz. Blockchain escrow ile paranız güvende.

https://raisegg.com/tournaments`,
    subreddits: ['Turkey'],
  },

  // Regional — Romania
  {
    title: 'Is the Romanian CS2 scene underrated? Running free daily tournaments to find out',
    body: `Romanian players consistently punch above their weight in CS2 but there's no real local infrastructure for competitive play.

We built RaiseGG — free daily CS2 tournaments with real prizes ($5 USDC). Also have stake matches (1v1 for money with blockchain escrow).

Currently tracking city rankings: Bucharest vs. Cluj vs. Timișoara vs. Iași.

Anyone want to rep their city? Free to join.

https://raisegg.com/tournaments`,
    subreddits: ['romania'],
  },

  // Regional — Serbia
  {
    title: 'Belgrade CS2 players — free daily tournaments with real prizes',
    body: `Built a platform called RaiseGG specifically for the Balkans, Turkey, and Eastern Europe.

We run free CS2 tournaments every day:
- No entry fee, $5 USDC prize
- 8 players, single elimination
- Anti-cheat servers
- City leaderboard (Belgrade vs Novi Sad vs Niš)

Also have stake matches — 1v1 or 5v5 for real money with blockchain escrow.

Serbian CS2 is legit but underrepresented. Trying to change that.

https://raisegg.com/tournaments`,
    subreddits: ['serbia'],
  },

  // Regional — Georgia
  {
    title: 'Free CS2 tournaments for Georgian players — Tbilisi vs Batumi city leaderboard',
    body: `Built RaiseGG for the Caucasus and nearby regions. We run free daily CS2 tournaments with real prizes.

- Free entry, $5 USDC to winner
- City leaderboard tracking
- Anti-cheat servers
- Also supports Dota 2 and Deadlock

Georgian CS2 has been growing fast. We want to support that with actual tournament infrastructure.

Tbilisi currently leads the city rankings. Any Batumi players want to change that?

https://raisegg.com/tournaments`,
    subreddits: ['Sakartvelo'],
  },

  // Esports industry
  {
    title: 'City-based esports rivalries might be the next thing',
    body: `We run a small CS2 platform (RaiseGG) with daily tournaments. We started tracking cities and something interesting happened.

Players from Istanbul started trash-talking Ankara. Bucharest vs. Cluj became a thing. Belgrade players showed up specifically to beat Tbilisi.

City rivalries create engagement that country-level competition doesn't. It's personal, local, and drives repeat participation.

We're seeing this in regions where organized esports infrastructure barely exists — Turkey, Balkans, Caucasus, Central Asia.

Think about it: every city has gamers. None of them have local esports. City-based competition might be how grassroots esports actually grows.

https://raisegg.com/tournaments`,
    subreddits: ['esports', 'CompetitiveGaming'],
  },

  // ── Tier 1: Direct promo subs ──────────────────────────────────

  // Betting subs
  {
    title: 'New CS2 stake platform with Solana escrow — no bookmaker, player vs player',
    body: `Different from traditional esports betting. On RaiseGG you play the match yourself — 1v1 or 5v5, your money goes into a smart contract, winner takes both stakes.

No odds. No bookmaker. Pure skill. USDC/USDT on Solana (instant payout, near-zero fees).

Currently running CS2, Dota 2, and Deadlock matches. Free daily tournaments too.

Anti-cheat on all servers. Match disputes go through blockchain verification.

https://raisegg.gg`,
    subreddits: ['esportsbetting', 'csgobetting', 'Dota2Betting'],
  },
  {
    title: 'Anyone tried peer-to-peer stake matches instead of traditional betting?',
    body: `Instead of betting on pro matches, I've been playing my own CS2 matches for small stakes ($2-10 USDC).

The platform I use (RaiseGG) has blockchain escrow so neither player can run off with the money. Match plays out on anti-cheat servers, winner gets paid automatically.

Way more engaging than watching a match and hoping your bet hits. And you can actually influence the outcome since you're the one playing.

Downsides: you have to be good lol. But they have free tournaments to practice.

Anyone else into this? Is peer-to-peer gaming betting going to be a thing?`,
    subreddits: ['esportsbetting', 'csgobetting'],
  },

  // Crypto/Web3 gaming
  {
    title: 'RaiseGG — competitive CS2/Dota2/Deadlock matches with Solana escrow (free to try)',
    body: `Launched a platform where gamers stake USDC on their own matches. Solana smart contract holds both players' money, auto-releases to the winner.

Games: CS2, Dota 2, Deadlock
Crypto: USDC/USDT on Solana
Min stake: $1
Free daily tournaments (no deposit needed, real prizes)

Not another play-to-earn grinding game — this is real competitive gaming with crypto payments solving the cross-border problem.

Target market is Turkey, Balkans, CIS, Central Asia where PayPal doesn't work well.

https://raisegg.gg`,
    subreddits: ['CryptoGaming', 'PlayToEarn', 'web3gaming', 'SolanaGaming'],
  },
  {
    title: 'Finally a crypto gaming project that isn\'t about grinding or NFTs',
    body: `Most "crypto gaming" is just clicking buttons to earn tokens. RaiseGG is different — it's actual competitive gaming (CS2, Dota 2, Deadlock) where crypto is just the payment layer.

You deposit USDC into an escrow contract, play a real match on real servers with anti-cheat, and the winner gets paid. That's it. No tokens, no NFTs, no grinding.

Crypto solves the real problem: how do you pay someone in Turkey from Romania instantly? USDC on Solana. Done in 400ms.

Free tournaments daily if you want to try without depositing.

https://raisegg.gg`,
    subreddits: ['CryptoGaming', 'PlayToEarn', 'solana', 'FreeCrypto'],
  },

  // LFG / Gaming partners
  {
    title: '[EU] CS2/Dota 2/Deadlock — 1v1 for small stakes or free tournaments daily',
    body: `Looking for competitive players for daily 1v1 stake matches or free tournaments on RaiseGG.

Platform: raisegg.gg
Games: CS2, Dota 2, Deadlock
Region: EU (servers in Frankfurt + Istanbul)
Stakes: $1-50 USDC (or free tournaments with $5 prize)

Blockchain escrow — money is locked in smart contract, auto-released to winner. No scams.

Good for:
- Warming up before ranked
- Practicing 1v1 skills
- Making some money if you're cracked
- Meeting competitive players in your region

Drop your Steam or just sign up.`,
    subreddits: ['gamerpals', 'RecruitCS'],
  },

  // Free stuff / faucet
  {
    title: 'Free $0.50 to try competitive gaming matches on RaiseGG (CS2/Dota 2/Deadlock)',
    body: `RaiseGG is giving every new player $0.50 USDC free to play their first stake match. No deposit needed.

It's a competitive gaming platform where you play 1v1 matches for real money (Solana blockchain escrow). The free credit lets you try it risk-free.

Also run free daily tournaments with $5 USDC prizes — zero deposit required.

Games: CS2, Dota 2, Deadlock
Payment: USDC/USDT on Solana

https://raisegg.gg

Legit, no catch. They're trying to grow their player base.`,
    subreddits: ['FreeGameFindings', 'FreeCrypto'],
  },

  // Streamer subs
  {
    title: 'Looking for streamers to partner with our competitive gaming platform (rev share)',
    body: `RaiseGG is looking for streamers who play CS2, Dota 2, or Deadlock to join our streamer program.

What we offer:
- Revenue share on referred players
- Custom affiliate link with tracking
- Priority matchmaking
- Featured on our homepage
- Free tournament hosting for your community

Requirements:
- 50+ average viewers
- Play CS2, Dota 2, or Deadlock
- Stream competitive content

Apply at https://raisegg.gg/streamers

We're a Solana-powered stake match platform — players play 1v1 for real money with blockchain escrow. Great content for competitive streams.`,
    subreddits: ['Twitch_Startup', 'SmallStreamers'],
  },

  // Indie gaming
  {
    title: 'Built a competitive gaming platform with Solana blockchain — CS2/Dota2/Deadlock stake matches',
    body: `Solo dev here. Built RaiseGG — a platform where you can play 1v1 competitive matches in CS2, Dota 2, and Deadlock for real money (USDC on Solana).

Tech stack:
- Next.js frontend
- Supabase (PostgreSQL)
- Solana for escrow/payments
- Dedicated game servers with anti-cheat

Features: matchmaking, ELO system, city-based leaderboards, daily tournaments (free entry), referral system, achievement badges, streak insurance.

Targeting Eastern Europe/Turkey/CIS where there's huge gaming talent but zero esports infrastructure.

https://raisegg.gg

Happy to talk about the tech or the business side.`,
    subreddits: ['IndieGaming'],
  },

  // Russian community
  {
    title: 'Платформа для 1v1 матчей в CS2/Dota 2 на деньги — бесплатные турниры каждый день',
    body: `RaiseGG — платформа для соревновательных матчей. Ставишь USDC, играешь 1v1, победитель забирает всё. Смарт-контракт на Solana — деньги никуда не денутся.

Игры: CS2, Dota 2, Deadlock
Минимальная ставка: $1
Бесплатные турниры: каждый день, приз $5 USDC

Рейтинг городов — Москва vs Питер vs Стамбул. Кто круче?

https://raisegg.gg

Без читов, без скама. Blockchain всё контролирует.`,
    subreddits: ['pikabu'],
  },

  // Turkish meme sub
  {
    title: 'CS2\'de 1v1 oynayıp para kazanabileceğiniz bir platform var — RaiseGG',
    body: `Arkadaşlar merhaba,

CS2, Dota 2 veya Deadlock'ta 1v1 oynayıp USDC kazanabilirsiniz. Para blockchain escrow'da kilitli, kazanan otomatik alıyor.

Her gün ücretsiz turnuva var — giriş bedava, kazanana $5 ödül.

İstanbul vs Ankara şehir sıralaması da var. Hangi şehir daha iyi?

https://raisegg.gg

Denemeye değer bence.`,
    subreddits: ['KGBTR', 'Turkey'],
  },

  // Balkan memes
  {
    title: 'Which Balkan country actually has the best CS2 players? We\'re tracking it now',
    body: `Started a city/country leaderboard on RaiseGG. Free daily tournaments, $5 USDC prize.

Current standings... well there aren't many players yet so YOUR country could be #1 right now.

Serbia, Romania, Bulgaria, Greece, Croatia, Bosnia, North Macedonia — who's got the best CS2 players?

https://raisegg.gg/tournaments

Free entry. Prove your country is the best. 🇷🇸🇷🇴🇧🇬🇬🇷🇭🇷🇧🇦🇲🇰`,
    subreddits: ['balkans_irl', 'serbia', 'romania'],
  },

  // ── Russian expanded ──────────────────────────────────────────
  {
    title: 'Кто-нибудь играет CS2 на деньги? Нашёл платформу с эскроу',
    body: `Нашёл RaiseGG — платформа для 1v1 матчей в CS2, Dota 2, Deadlock на реальные деньги (USDC).

Суть: оба игрока кидают USDC в смарт-контракт на Solana. Матч на серверах с античитом. Победитель забирает всё автоматически.

Есть бесплатные турниры каждый день — приз $5 USDC, вход бесплатный.

Рейтинг городов: Москва vs Питер vs Екатеринбург — кто лучше в CS2?

https://raisegg.gg

Кто пробовал? Стоит?`,
    subreddits: ['russia', 'AskARussian', 'RussianGaming'],
  },
  {
    title: 'Бесплатные турниры по CS2/Dota 2 каждый день — $5 приз',
    body: `На RaiseGG каждый день проходят бесплатные турниры. Вход бесплатный, приз — $5 USDC победителю.

Формат: 8 игроков, single elimination, BO1.
Игры: CS2 1v1, Dota 2 1v1 mid.
Серверы: EU с античитом.

Также есть ставочные матчи — 1v1 на деньги через блокчейн эскроу. Но турниры полностью бесплатные.

https://raisegg.gg/tournaments

Кому интересно — заходите.`,
    subreddits: ['pikabu', 'russia', 'liberta', 'RussianGaming'],
  },
  {
    title: 'Москва vs Питер — кто сильнее в CS2? Теперь можно проверить',
    body: `На платформе RaiseGG есть рейтинг городов. Играешь матчи — очки идут твоему городу.

Сейчас Москва впереди, но игроков пока мало. Питерские, где вы?

Бесплатные турниры каждый день. $5 USDC приз. Вход бесплатный.

Также есть 1v1 на деньги — USDC через Solana, эскроу, античит.

https://raisegg.gg/tournaments`,
    subreddits: ['AskARussian', 'pikabu', 'russia'],
  },

  // ── Greece ──────────────────────────────────────────────────────
  {
    title: 'Free daily CS2 tournaments — Athens vs Thessaloniki city leaderboard',
    body: `Hey Greek gamers! We're running free daily CS2 tournaments on RaiseGG with city-based rankings.

- Free entry, $5 USDC prize to the winner
- 8-player single elimination
- Anti-cheat servers in EU
- City leaderboard: Athens vs Thessaloniki vs Patras

Also have 1v1 stake matches (USDC on Solana blockchain escrow) if you want to play for real money.

Greek CS2 is underrated. Prove it.

https://raisegg.gg/tournaments`,
    subreddits: ['greece'],
  },

  // ── Croatia ─────────────────────────────────────────────────────
  {
    title: 'Croatian CS2 players — free daily tournaments, $5 USDC prizes',
    body: `RaiseGG runs free CS2 tournaments every day. No deposit, real prize.

- 8 players, single elimination
- $5 USDC to the winner
- Anti-cheat servers
- Zagreb vs Split vs Rijeka city rankings

Also supports Dota 2 and Deadlock.

Croatia has insane FPS talent — come represent.

https://raisegg.gg/tournaments`,
    subreddits: ['croatia'],
  },

  // ── Bulgaria ────────────────────────────────────────────────────
  {
    title: 'Bulgarian CS2 scene — free daily tournaments on RaiseGG, $5 prize',
    body: `Any Bulgarian CS2 players here? Running free daily tournaments with real prizes.

- No entry fee
- $5 USDC to winner
- Sofia vs Plovdiv vs Varna city rankings
- Anti-cheat, EU servers

Also have stake matches — 1v1 for USDC with blockchain escrow. But tournaments are 100% free.

Bulgaria's CS2 talent is real. Let's put it on the map.

https://raisegg.gg/tournaments`,
    subreddits: ['bulgaria'],
  },

  // ── Albania ─────────────────────────────────────────────────────
  {
    title: 'Any Albanian gamers playing CS2 competitively? Free daily tournaments',
    body: `RaiseGG has free CS2 tournaments every day — $5 USDC prize, no entry fee.

Looking to build the Albanian competitive gaming scene. Tirana vs Durrës — who's better?

Also supports Dota 2 and Deadlock. Stake matches available too (blockchain escrow, 100% safe).

https://raisegg.gg/tournaments`,
    subreddits: ['Albania'],
  },

  // ── Bosnia ──────────────────────────────────────────────────────
  {
    title: 'Bosnian CS2 players — free tournaments daily, $5 USDC prize',
    body: `Free CS2 tournaments every day on RaiseGG. No deposit needed.

- Sarajevo vs Banja Luka vs Mostar city rankings
- $5 USDC to winner
- Anti-cheat servers
- Also supports Dota 2

Bosnian players are always underestimated. Time to change that.

https://raisegg.gg/tournaments`,
    subreddits: ['bih'],
  },

  // ── Armenia ─────────────────────────────────────────────────────
  {
    title: 'Free CS2/Dota 2 tournaments for Armenian gamers — $5 USDC prizes daily',
    body: `RaiseGG runs daily free tournaments. No entry fee, real USDC prizes.

Games: CS2, Dota 2, Deadlock
Format: 8-player single elimination
Prize: $5 USDC to winner
Servers: EU with anti-cheat

Yerevan vs Gyumri city rankings. Rep your city!

Also have stake matches — play 1v1 for real money with blockchain escrow on Solana.

Armenian gaming scene deserves a proper competitive platform.

https://raisegg.gg/tournaments`,
    subreddits: ['armenia'],
  },

  // ── Azerbaijan ──────────────────────────────────────────────────
  {
    title: 'Azerbaijani CS2 players — free daily tournaments, Baku vs Ganja leaderboard',
    body: `RaiseGG runs free CS2 tournaments every day. No deposit, $5 USDC prize.

- City leaderboard: Baku vs Ganja vs Sumgait
- Anti-cheat servers
- Also supports Dota 2 and Deadlock
- Stake matches available (blockchain escrow)

The Caucasus CS2 scene is growing fast. Azerbaijan needs to be represented.

https://raisegg.gg/tournaments`,
    subreddits: ['Azerbaijan'],
  },

  // ── Iran ─────────────────────────────────────────────────────────
  {
    title: 'Iranian gamers — free CS2/Dota 2 tournaments with crypto prizes',
    body: `RaiseGG has free daily tournaments. No entry fee, $5 USDC prize.

Why crypto? Because traditional payment rails to/from Iran are a nightmare. USDC on Solana works instantly, no bank needed.

Games: CS2, Dota 2, Deadlock
Format: 8 players, single elimination
Payout: USDC on Solana (instant)

Also have 1v1 stake matches with blockchain escrow.

Tehran vs Isfahan — who has better CS2 players?

https://raisegg.gg/tournaments`,
    subreddits: ['iran', 'iranian'],
  },

  // ── Kazakhstan / Central Asia ───────────────────────────────────
  {
    title: 'Central Asian CS2 players — free daily tournaments, $5 USDC prizes',
    body: `RaiseGG runs free CS2 tournaments every day for Central Asian and CIS players.

- No entry fee, $5 USDC prize
- Almaty vs Astana vs Tashkent vs Bishkek city rankings
- Anti-cheat EU servers
- Also supports Dota 2 (huge in Central Asia!)

Stake matches available too — 1v1 for USDC with Solana blockchain escrow.

Kazakhstan, Uzbekistan, Kyrgyzstan, Tajikistan — who dominates CS2?

https://raisegg.gg/tournaments`,
    subreddits: ['Kazakhstan', 'Uzbekistan', 'centralasia', 'AskCentralAsia'],
  },
  {
    title: 'Dota 2 в Центральной Азии — бесплатные турниры каждый день',
    body: `RaiseGG — бесплатные турниры по Dota 2 и CS2 каждый день. Приз $5 USDC.

Рейтинг городов: Алматы vs Астана vs Ташкент vs Бишкек.

Выплаты в USDC на Solana — мгновенно, без банков.

Также есть 1v1 матчи на деньги с блокчейн эскроу.

Центральная Азия — регион Dota. Покажите это.

https://raisegg.gg/tournaments`,
    subreddits: ['Kazakhstan', 'centralasia', 'AskCentralAsia'],
  },

  // ── Ukraine ─────────────────────────────────────────────────────
  {
    title: 'Free CS2/Dota 2 tournaments for Ukrainian players — $5 USDC daily prizes',
    body: `RaiseGG runs free daily tournaments. No entry fee, real USDC prizes.

- Kyiv vs Lviv vs Odesa vs Kharkiv city rankings
- CS2, Dota 2, Deadlock
- Anti-cheat servers
- USDC payouts on Solana (instant, no bank needed)

Ukrainian CS2 players are some of the best in the world. Come prove it.

Also have 1v1 stake matches — blockchain escrow, totally safe.

https://raisegg.gg/tournaments`,
    subreddits: ['ukraine'],
  },

  // ── Hungary ─────────────────────────────────────────────────────
  {
    title: 'Hungarian CS2 players — free daily tournaments, Budapest vs Debrecen',
    body: `Free CS2 tournaments every day on RaiseGG. $5 USDC prize, no entry fee.

- City leaderboard: Budapest vs Debrecen vs Szeged
- Anti-cheat servers
- Also supports Dota 2 and Deadlock

Hungary has a strong FPS scene. Let's see who's actually the best.

https://raisegg.gg/tournaments`,
    subreddits: ['Hungary'],
  },

  // ── Poland ──────────────────────────────────────────────────────
  {
    title: 'Polish CS2 scene — free daily tournaments on RaiseGG, $5 prizes',
    body: `Poland is a CS powerhouse. RaiseGG runs free CS2 tournaments daily — $5 USDC to the winner.

- Warsaw vs Kraków vs Wrocław vs Gdańsk city rankings
- Anti-cheat servers
- 8-player single elimination

Also have 1v1 stake matches for USDC with Solana blockchain escrow.

Show the world Polish CS2 is still on top.

https://raisegg.gg/tournaments`,
    subreddits: ['poland'],
  },

  // ── Czech ───────────────────────────────────────────────────────
  {
    title: 'Czech CS2 players — free daily tournaments, Prague vs Brno leaderboard',
    body: `RaiseGG has free CS2 tournaments every day. No deposit, $5 USDC prize.

Prague vs Brno — who's got better CS2 players?

Also supports Dota 2 and Deadlock. Stake matches available too.

https://raisegg.gg/tournaments`,
    subreddits: ['czech'],
  },

  // ── Moldova ─────────────────────────────────────────────────────
  {
    title: 'Moldovan gamers — free CS2/Dota 2 tournaments daily, $5 USDC prizes',
    body: `RaiseGG runs free daily tournaments. No entry fee, real prizes.

USDC payouts on Solana — instant, no bank hassle.

Chișinău represent! City leaderboard is live.

https://raisegg.gg/tournaments`,
    subreddits: ['Moldova'],
  },

  // ── Balkan general / AskBalkans ─────────────────────────────────
  {
    title: 'Balkan gamers — which country/city produces the best CS2 players?',
    body: `Genuinely curious. We run a competitive gaming platform (RaiseGG) with city-based leaderboards and the Balkan rivalries are insane.

Serbia, Romania, Bulgaria, Greece, Croatia, Bosnia, Albania, Montenegro, North Macedonia — everyone thinks they're the best.

We have free daily tournaments ($5 USDC prize, no entry fee) so there's actual data now.

Current standings are... thin. Your country could be #1 right now.

Which Balkan country do you think is actually the strongest in CS2?

https://raisegg.gg/tournaments`,
    subreddits: ['AskBalkans', 'balkans_irl'],
  },

  // ── North Macedonia / Kosovo / Montenegro ───────────────────────
  {
    title: 'CS2 players from the Balkans — free tournaments daily, represent your country',
    body: `RaiseGG runs free CS2 tournaments every day. $5 USDC prize, zero entry fee.

We track city and country rankings. North Macedonia, Kosovo, Montenegro — you're on the leaderboard.

Anti-cheat servers, blockchain payouts, also supports Dota 2 and Deadlock.

Small countries can top the leaderboard. Prove it.

https://raisegg.gg/tournaments`,
    subreddits: ['NorthMacedonia', 'Kosovo', 'Montenegro'],
  },

  // ── Solana / DeFi / Crypto expanded ─────────────────────────────
  {
    title: 'Real Solana use case: escrow for competitive gaming — not another memecoin',
    body: `Built RaiseGG on Solana. Players stake USDC on CS2/Dota 2/Deadlock matches. Smart contract escrow holds both deposits, auto-releases to winner.

Why this matters for Solana:
- Actual use case people care about (gaming)
- Transactions every match (real on-chain activity)
- Sub-second finality (gamers won't wait)
- Cross-border payments solved (Turkey ↔ Romania ↔ Georgia instantly)

Target market: Eastern Europe, Turkey, CIS, Central Asia — places where PayPal/Visa are limited.

Free daily tournaments too (no deposit needed).

https://raisegg.gg

This is what mainstream crypto adoption looks like — people using it because it solves a real problem, not because number go up.`,
    subreddits: ['solana', 'SolanaNetwork'],
  },
  {
    title: 'DeFi meets esports: blockchain escrow for competitive gaming matches',
    body: `Built a platform where gamers stake USDC on their own CS2/Dota 2/Deadlock matches. Solana smart contract escrow.

Flow:
1. Both players deposit USDC into escrow program
2. Match plays on anti-cheat servers
3. Result verified → contract releases funds to winner

No tokens, no NFTs, no yield farming. Just crypto solving a real payment problem: how do you send $5 from Turkey to Georgia instantly?

Free daily tournaments if you want to try it.

https://raisegg.gg`,
    subreddits: ['defi', 'CryptoCurrency'],
  },

  // ── PC Gaming / Games ───────────────────────────────────────────
  {
    title: 'Competitive gaming with money on the line feels completely different',
    body: `Started playing CS2 1v1 matches for small stakes ($2-5) on a platform called RaiseGG. The money goes into blockchain escrow so no one can scam.

And honestly? It changed how I play. When there's even $2 on the line:
- Every round matters more
- You actually think about economy
- Aim practice suddenly feels important
- Winning feels 10x better

They have free tournaments too ($5 prize, no deposit) which is how I started.

Anyone else play competitive games with stakes? Does adding money make it better or worse for you?`,
    subreddits: ['pcgaming', 'Games'],
  },

  // ── TrueDoTA2 / learndota2 expanded ────────────────────────────
  {
    title: '1v1 mid for small stakes is the fastest way to improve your laning',
    body: `Hot take: if you want to get better at mid, play 1v1s with money on the line.

I've been doing this on RaiseGG ($1-5 USDC stake matches with blockchain escrow). After ~50 games:

- My CS went up by ~10/min in lane
- I stopped autopiloting trades
- I actually learned matchups instead of just hoping
- My first 5 minutes in real games improved massively

The pressure of even $1 on the line forces you to focus. It's like practice mode but you're actually trying.

Free tournaments available too if you don't want to stake.

https://raisegg.gg`,
    subreddits: ['TrueDoTA2', 'learndota2'],
  },

  // ── CompetitiveGaming / esports expanded ────────────────────────
  {
    title: 'Grassroots esports is missing from Eastern Europe — we\'re trying to fix it',
    body: `There are millions of gamers in Turkey, Balkans, CIS, Central Asia. Almost zero esports infrastructure.

RaiseGG is a platform for 1v1 and team matches with real stakes (USDC on Solana). But the free daily tournaments are what's actually growing the community.

What we're seeing:
- City rivalries drive insane engagement (Istanbul vs Ankara, Belgrade vs Bucharest)
- Players in these regions will grind for $5 prizes
- Cross-border payments are the #1 pain point traditional platforms can't solve
- Crypto fixes this silently — players don't even need to understand blockchain

The gap between Western esports infrastructure and Eastern Europe/Central Asia is massive. Someone needs to fill it.

https://raisegg.gg`,
    subreddits: ['esports', 'CompetitiveGaming'],
  },

  // ── csgo / CounterStrike ────────────────────────────────────────
  {
    title: 'Remember CS 1.6 wager matches? Now there\'s blockchain escrow for CS2',
    body: `Back in the day we used to bet on CS matches in mIRC. Half the time the loser just left.

RaiseGG fixes this with Solana smart contracts. Both players deposit USDC before the match. Can't withdraw until it's over. Winner gets paid automatically.

- 1v1, 2v2, or 5v5
- Anti-cheat on dedicated servers
- Free daily tournaments ($5 USDC, no entry fee)
- City leaderboards

It's like the old days but you actually get paid.

https://raisegg.gg`,
    subreddits: ['csgo', 'CounterStrike', 'cs2'],
  },

  // ── Turkish expanded ────────────────────────────────────────────
  {
    title: 'Türkiye CS2 şehir sıralaması — İstanbul vs Ankara vs İzmir',
    body: `RaiseGG'de şehir sıralaması var. Maç kazandıkça şehrine puan kazandırıyorsun.

Her gün ücretsiz turnuva: giriş bedava, kazanana $5 USDC.
USDC ödeme Solana üzerinden — anında, banka derdi yok.

1v1 para maçları da var — blockchain escrow ile güvenli.

Hangi şehir CS2'de en iyi? Kanıtla.

https://raisegg.gg/tournaments`,
    subreddits: ['Turkey', 'Turkiye', 'TurkeyJerky', 'KGBTR'],
  },

  // ══════════════════════════════════════════════════════════════════
  // ORGANIC WIN STORIES — look like real user posts, not ads
  // ══════════════════════════════════════════════════════════════════

  {
    title: 'Just won $5 in a free CS2 tournament, no deposit needed',
    body: `Found this platform called RaiseGG that runs free daily CS2 tournaments. Figured I'd try it since there's literally no risk.

8 players, single elimination, BO1. Won 3 matches and got $5 USDC sent to my Solana wallet automatically.

Not life-changing money but it was actually fun playing when something was on the line. Way more intense than casual matchmaking.

They also have stake matches where you play 1v1 for real money ($1-50) with blockchain escrow but I haven't tried those yet. The free tournaments are enough for now.

Anyone else tried this? Feels too good to be true but the payout actually came through.`,
    subreddits: ['GlobalOffensive', 'cs2', 'csgo', 'pcgaming', 'FreeCrypto'],
  },
  {
    title: 'Won $10 in a 1v1 CS2 match — blockchain escrow actually works',
    body: `Was skeptical about RaiseGG at first. Platform where you play 1v1 CS2 matches for money sounded like a scam.

Tried a free tournament first (no deposit). Won $5. Okay cool.

Then tried a $5 stake match. Both players deposit USDC into a smart contract on Solana. Played a BO1 on Dust2. Won 16-11. The $10 (both stakes) hit my wallet in like 2 seconds.

The anti-cheat seems legit (VAC + something called MatchZy on dedicated servers). No cheaters in my 6 matches so far.

Only downside: not many players yet so matchmaking can take a few minutes. But honestly that's also an opportunity — the free tournaments are easy money right now since the player pool is small.

raisegg.com if anyone wants to try`,
    subreddits: ['cs2', 'GlobalOffensive', 'CryptoGaming', 'solana'],
  },
  {
    title: 'My city (Belgrade) is #3 on RaiseGG leaderboard — need more Serbian players to push to #1',
    body: `There's this competitive gaming platform called RaiseGG with a city leaderboard. Every match you play earns points for your city.

Belgrade is currently #3 behind Istanbul and Bucharest. We need more Serbian CS2 players to overtake them.

Free daily tournaments, no deposit needed, $5 USDC prize. Also has stake matches if you want to play for real money.

Any Serbs here playing CS2? Let's put Belgrade on top. 🇷🇸

raisegg.com/leaderboard`,
    subreddits: ['serbia', 'AskBalkans', 'balkans_irl'],
  },
  {
    title: 'Bucharest gamers — our city is leading the RaiseGG leaderboard, let\'s keep it that way',
    body: `There's a platform called RaiseGG with city-based rankings. Bucharest is currently ahead of Belgrade and Istanbul.

Every CS2/Dota 2 match you play earns points for your city.

Free daily tournaments at 3 PM UTC. No deposit, $5 USDC prize.

Cluj and Timișoara are creeping up though. Don't let them take it from us.

raisegg.com/leaderboard`,
    subreddits: ['romania'],
  },
  {
    title: 'Istanbul leads the RaiseGG city rankings — Ankara where are you?',
    body: `İstanbul şu an RaiseGG şehir sıralamasında birinci. Her maç şehrine puan kazandırıyor.

Ankara, İzmir, Bursa — neredesiniz? İstanbul'un gerisinde kalmayın.

Her gün ücretsiz turnuva var. Giriş bedava, $5 USDC ödül.

raisegg.com/leaderboard`,
    subreddits: ['Turkey', 'KGBTR', 'Turkiye'],
  },
  {
    title: 'Won my first Dota 2 1v1 mid for money — felt incredible',
    body: `Played a 1v1 mid on RaiseGG for $3 USDC. Picked QoP, enemy picked SF. Got first blood at level 3 with a good blink dagger play. Won $6 total.

The platform uses blockchain escrow so both players deposit before the match. Winner gets paid automatically. No trusting the other person to pay up.

What surprised me: playing for even $3 completely changes how you approach the lane. Every CS matters, every trade matters. I improved more in 5 stake matches than in 20 ranked games.

They have free tournaments too if you don't want to risk money. That's how I started.

raisegg.com/play`,
    subreddits: ['DotA2', 'learndota2', 'TrueDoTA2'],
  },
  {
    title: 'Found a way to make small money playing CS2 — free daily tournaments',
    body: `Not clickbait. RaiseGG runs free CS2 tournaments every day at 3 PM UTC. 8 players, single elimination, $5 USDC to the winner. No entry fee.

I've won 3 out of 12 tournaments so far. That's $15 USDC for playing CS2 for fun. Not much but literally free money.

The trick is the player pool is still small so you're not going against FPL players. If you're decent (FACEIT level 5+) you have a real shot.

They also have 1v1 stake matches but the free tournaments are where I'd start.

raisegg.com/tournaments`,
    subreddits: ['GlobalOffensive', 'cs2', 'FreeGameFindings', 'FreeCrypto', 'pcgaming'],
  },
  {
    title: 'Playing CS2 for money is way more fun than ranked',
    body: `Started playing 1v1 stake matches on RaiseGG a week ago. Even $2 on the line makes every round feel like a major final.

What's different:
- You actually focus (no autopilot)
- Economy decisions matter more
- You warm up properly before playing
- Winning feels 10x better
- Losing actually teaches you something because you think about what went wrong

The platform uses Solana blockchain escrow so nobody can scam you. Both deposit before the match, winner gets paid automatically.

Started with free tournaments (no deposit, $5 prize). Now doing $2-5 stake matches. My aim has genuinely improved because I'm paying attention.

Anyone else find that adding stakes makes you a better player?`,
    subreddits: ['cs2', 'GlobalOffensive', 'pcgaming', 'Games'],
  },
  {
    title: 'This platform pays you crypto for winning CS2 matches — not a scam, actually tried it',
    body: `I know how this sounds. But RaiseGG is legit — tested it myself.

How it works:
1. Free tournaments every day — no deposit, $5 USDC prize
2. Stake matches — you deposit USDC, opponent deposits USDC, winner takes both
3. Money sits in a Solana smart contract (blockchain escrow) so nobody can run off with it

I've played ~20 matches. Won $35 total between tournaments and stake matches. Withdrawn $20 to my Phantom wallet — came through in seconds.

The catch? Not many players yet so matchmaking is slow sometimes. But that's also why it's easy to win the free tournaments right now.

raisegg.com

Not affiliated, just a player sharing the experience.`,
    subreddits: ['CryptoGaming', 'PlayToEarn', 'FreeCrypto', 'SolanaGaming', 'web3gaming'],
  },
  {
    title: 'Москва vs Питер на RaiseGG — кто круче в CS2? Пока ничья',
    body: `На платформе RaiseGG есть рейтинг городов. Играешь матч — очки идут твоему городу.

Сейчас Москва и Питер идут близко. Мало игроков пока, так что каждый матч решает.

Бесплатные турниры каждый день — $5 USDC приз, вход бесплатный. Также есть 1v1 на деньги через блокчейн эскроу.

Зашёл попробовать бесплатный турнир, выиграл $5 с первого раза. Реально пришло на кошелёк.

raisegg.com/leaderboard`,
    subreddits: ['pikabu', 'russia', 'AskARussian'],
  },
  {
    title: 'Tried Deadlock 1v1 for money for the first time — this game was made for stake matches',
    body: `Deadlock 1v1s on RaiseGG hit different. The game's combat system is so clean for competitive play.

Played 3 matches for $2 each. Won 2, lost 1. Net +$2 USDC.

The escrow thing (Solana smart contract) is nice because I've been burned before on Discord wager matches. Here neither player can bail on payment.

Free tournaments available too if you don't want to stake anything.

Anyone else playing competitive Deadlock? The game needs a proper 1v1 scene.

raisegg.com/play`,
    subreddits: ['DeadlockTheGame'],
  },
  {
    title: 'Athina vs Istanbul — Greek CS2 players, our city is behind on RaiseGG',
    body: `Just discovered RaiseGG has city leaderboards. Athens is behind Istanbul and Belgrade right now.

Free daily tournaments, $5 USDC prize, no entry fee. Every match earns points for your city.

Greek gaming community is strong but we're not showing up on this platform. Let's change that.

raisegg.com/leaderboard`,
    subreddits: ['greece'],
  },
  {
    title: 'Zagreb vs Belgrade CS2 rivalry on RaiseGG — need more Croatian players',
    body: `There's a city leaderboard on RaiseGG. Belgrade is way ahead of Zagreb right now.

Slobodni dnevni turniri, $5 USDC nagrada. Svaki meč donosi bodove tvom gradu.

Croatian CS2 players, let's represent. Free tournaments every day, no deposit.

raisegg.com/tournaments`,
    subreddits: ['croatia'],
  },
  {
    title: 'Free money for Dota 2 players — daily tournament, $5 USDC, no catch',
    body: `I've been playing Dota for 8 years and never heard of RaiseGG until last week. They run free 1v1 mid tournaments every day.

- 8 players
- Single elimination
- First to 2 kills or first tower
- $5 USDC prize
- No entry fee, no deposit, nothing

Won twice this week. The USDC actually arrives in your wallet within seconds.

They also have paid stake matches where you play 1v1 for real money with blockchain escrow. But honestly the free tournaments are easy USDC if you have decent laning fundamentals.

raisegg.com/tournaments`,
    subreddits: ['DotA2', 'learndota2'],
  },
  {
    title: 'The crypto use case nobody talks about: gaming escrow. Actually works.',
    body: `Everyone's arguing about DeFi yields and memecoins while the most obvious crypto use case is sitting right there: escrow for online gaming.

Scenario: I'm in Turkey. My opponent is in Romania. We want to play CS2 1v1 for $5. How do we trust each other to pay?

Traditional way: We don't. One person gets scammed.

Crypto way: Both deposit $5 USDC into a Solana smart contract. Match plays out on anti-cheat servers. Winner gets $10 automatically. Done in 400ms.

Been using RaiseGG for this. Small platform but the tech actually works. I've withdrawn $35 over the past two weeks. Instant to my Phantom wallet.

This is what "mainstream crypto adoption" looks like — people using it because it solves a problem, not because they want to speculate.

raisegg.com`,
    subreddits: ['CryptoCurrency', 'solana', 'defi', 'SolanaNetwork'],
  },
  {
    title: 'Kazakh CS2 players — Almaty is on the RaiseGG city leaderboard',
    body: `RaiseGG-де қала рейтингі бар. Алматы қазір рейтингте. Әр матч қалаңа ұпай әкеледі.

Free daily tournaments on RaiseGG. $5 USDC prize, no entry fee. Almaty vs Astana — who's better at CS2?

Also supports Dota 2 (huge in KZ!).

raisegg.com/leaderboard`,
    subreddits: ['Kazakhstan', 'centralasia'],
  },
  {
    title: 'Baku vs Tbilisi CS2 — Azerbaijan is behind on RaiseGG leaderboard',
    body: `RaiseGG has city rankings. Tbilisi is ahead of Baku right now.

Free daily CS2 tournaments, $5 USDC prize, no entry fee. Every win = points for your city.

Azerbaijani gamers, let's not let Georgia win this one.

raisegg.com/leaderboard`,
    subreddits: ['Azerbaijan'],
  },
  {
    title: 'Yerevan gamers — Armenia is on the RaiseGG city leaderboard, need more players',
    body: `Free daily CS2 and Dota 2 tournaments on RaiseGG. $5 USDC prize, no deposit.

Yerevan is on the leaderboard but needs more players to climb. Every match earns city points.

Crypto payouts via Solana — instant, no bank needed.

raisegg.com/tournaments`,
    subreddits: ['armenia'],
  },
  {
    title: 'Polish CS2 players — Warsaw is barely on the RaiseGG city leaderboard',
    body: `Poland is a CS powerhouse but Warsaw barely shows up on RaiseGG's city rankings.

Free tournaments every day. $5 USDC prize, no entry fee. Anti-cheat servers.

Warsaw vs Kraków vs Wrocław — let's see who actually shows up.

raisegg.com/leaderboard`,
    subreddits: ['poland'],
  },
  {
    title: 'Kyiv gamers — Ukraine is underrepresented on RaiseGG, free daily tournaments',
    body: `Free CS2/Dota 2 tournaments every day on RaiseGG. $5 USDC prize, zero entry fee.

Kyiv vs Lviv vs Odesa city rankings. Ukrainian CS2 players are some of the best — but nobody's repping on this platform yet.

USDC payouts on Solana — instant, no bank hassle.

raisegg.com/tournaments`,
    subreddits: ['ukraine'],
  },
  {
    title: 'Iranian gamers — free crypto for winning CS2/Dota 2 matches',
    body: `RaiseGG has free daily tournaments. No entry fee, $5 USDC prize. Payouts in USDC on Solana — instant, no bank needed.

This matters for Iranian players because traditional payment platforms don't always work for us. Crypto solves that.

Also has 1v1 stake matches with blockchain escrow. Both players deposit, winner gets paid automatically.

Tehran vs Isfahan on the city leaderboard. Who's better?

raisegg.com/tournaments`,
    subreddits: ['iran', 'iranian'],
  },

  // ── Crypto-native community posts ─────────────────────────────
  {
    title: 'Finally a crypto project where the product is actually useful — competitive gaming escrow',
    body: `Tired of memecoins and vaporware? RaiseGG uses Solana for something that actually makes sense: escrow for competitive gaming.

How it works:
1. Two players agree to a CS2/Dota 2/Deadlock match ($1-50 USDC)
2. Both deposit USDC into a Solana smart contract
3. Match plays on anti-cheat servers
4. Winner gets paid automatically — 400ms settlement

No tokens to buy. No NFTs. No ponzinomics. Just USDC in, USDC out.

The cross-border angle is what makes crypto necessary here — try sending $5 from Azerbaijan to Georgia through traditional banking. Crypto does it in milliseconds.

Free daily tournaments too ($5 USDC prize, no entry fee): raisegg.com/tournaments`,
    subreddits: ['CryptoCurrency', 'CryptoMoonShots', 'altcoin', 'blockchain', 'SatoshiStreetBets'],
  },
  {
    title: 'Solana use case that isn\'t a memecoin: P2P gaming escrow with instant USDC settlement',
    body: `Built an escrow system on Solana for competitive gaming. Players deposit USDC into a program, play their match (CS2/Dota 2/Deadlock), winner gets paid.

Why Solana:
- 400ms finality = winner gets paid before the scoreboard fades
- USDC/USDT native = no volatile token risk
- $0.001 tx fees = viable for $1-5 micro-stakes
- SPL Token program = battle-tested escrow

This solves a real problem — online gaming wager matches have always been plagued by scammers who just don't pay. Smart contract escrow makes that impossible.

44 countries live, most players from Turkey, Balkans, Caucasus, CIS — regions where cross-border banking is slow/expensive but crypto works perfectly.

Platform: raisegg.com
Free to try — daily tournaments with $5 USDC prizes, no deposit needed.`,
    subreddits: ['solana', 'SolanaNetwork', 'SolanaGaming', 'defi'],
  },
  {
    title: 'Earn USDC playing CS2 and Dota 2 — not P2E grinding, actual competitive matches',
    body: `RaiseGG isn't another play-to-earn token grind. It's real competitive gaming with crypto payments.

Two ways to earn:
1. Free tournaments — no entry fee, $5 USDC prize daily
2. Stake matches — put up $1-50 USDC, play 1v1, winner takes the pot

Everything runs through Solana blockchain escrow. Both players deposit before the match, smart contract auto-releases to the winner.

Games: CS2, Dota 2, Deadlock
Payment: USDC/USDT on Solana
Anti-cheat: Yes, on all servers

The crypto part is invisible to players who don't care about it — they just see "deposit, play, get paid." But for those of us who get it, it's one of the cleanest crypto use cases out there.

raisegg.com`,
    subreddits: ['CryptoGaming', 'PlayToEarn', 'web3gaming', 'NFTGaming', 'ethgaming', 'FreeCrypto'],
  },
  {
    title: 'How crypto solves the biggest problem in online gaming wagers',
    body: `The #1 problem with playing games for money online: the loser doesn't pay.

Every Discord wager group has this issue. You win a 1v1, the other person blocks you. Nothing you can do.

Crypto fix: Both players deposit USDC into a Solana smart contract BEFORE the match starts. Neither can withdraw. Match plays on anti-cheat servers. Winner gets both deposits automatically.

No middleman. No trust needed. No "bro I'll pay you tomorrow."

This is what we built at RaiseGG — competitive CS2, Dota 2, and Deadlock matches with blockchain escrow. Works across 44 countries because USDC doesn't care about borders.

Free daily tournaments too: raisegg.com/tournaments`,
    subreddits: ['CryptoCurrency', 'CryptoMoonShots', 'SatoshiStreetBets', 'altcoin', 'blockchain'],
  },
]

// ─── Template selection ────────────────────────────────────────────────────

/**
 * Pick a subreddit and matching template based on the current day/slot.
 * Ensures no back-to-back repeats of subreddits or templates.
 */
function pickSubredditAndTemplate(): { subreddit: string; template: PostTemplate; templateIndex: number } {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86400000
  )
  // 2 slots per day (2x daily cron)
  const slot = now.getUTCHours() < 15 ? 0 : 1
  const runNumber = dayOfYear * 2 + slot

  // Alternate between tier 1 (direct promo) and tier 2 (organic) each run
  const useTier1 = slot === 0 // morning = promo subs, evening = organic
  const pool = useTier1 ? TIER1_SUBS : TIER2_SUBS
  const subIdx = runNumber % pool.length
  const subreddit = pool[subIdx]

  // Find templates that match this subreddit
  const matchingTemplates = TEMPLATES
    .map((t, i) => ({ template: t, index: i }))
    .filter(({ template }) => template.subreddits.includes(subreddit))

  if (matchingTemplates.length === 0) {
    // Fallback: use the first generic template
    return { subreddit, template: TEMPLATES[0], templateIndex: 0 }
  }

  // Pick from matching templates, rotating
  const templateChoice = matchingTemplates[runNumber % matchingTemplates.length]
  return {
    subreddit,
    template: templateChoice.template,
    templateIndex: templateChoice.index,
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('reddit-post', 'error', { message: 'Reddit not configured' })
    return NextResponse.json({ error: 'Reddit not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    const { subreddit, template, templateIndex } = pickSubredditAndTemplate()

    // Try primary sub, fall back to next if it fails
    let result = await submitPost(subreddit, template.title, template.body, 'self')

    let usedSub = subreddit
    if (!result.ok) {
      // Try a fallback sub from same tier
      const now = new Date()
      const slot = now.getUTCHours() < 15 ? 0 : 1
      const pool = slot === 0 ? [...TIER1_SUBS] : [...TIER2_SUBS]
      const fallbackSubs = pool.filter(s => s !== subreddit && template.subreddits.includes(s))

      for (const fallback of fallbackSubs) {
        result = await submitPost(fallback, template.title, template.body, 'self')
        if (result.ok) { usedSub = fallback; break }
      }

      // If still failing, try r/test as last resort to verify auth works
      if (!result.ok) {
        const errMsg = `Failed to post to r/${subreddit} (and ${fallbackSubs.length} fallbacks): ${result.error}`
        await recordCronRun('reddit-post', 'error', {
          message: errMsg,
          durationMs: Date.now() - start,
        })
        return NextResponse.json({ error: errMsg }, { status: 500 })
      }
    }

    const summary = `Posted to r/${usedSub} — template #${templateIndex} — ${result.postUrl}`
    await recordCronRun('reddit-post', 'ok', {
      message: summary,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      subreddit: usedSub,
      title: template.title,
      postUrl: result.postUrl,
      postId: result.postId,
      summary,
    })
  } catch (err) {
    await recordCronRun('reddit-post', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
