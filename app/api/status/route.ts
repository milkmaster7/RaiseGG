import { NextResponse } from 'next/server'
import { runAllChecks } from '@/lib/monitor'

export const dynamic = 'force-dynamic'

const OWNER_TASKS = [
  // ═══════════════════════════════════════════════════════════════════════
  // MARKETING PLAN — Free Growth Strategy for Caucasus/Turkey/Balkans/CIS
  // Target: CS2, Dota 2, Deadlock players in TR, GE, AZ, AM, RO, BG, RS, GR, KZ, UA, PL, IR, HU, BA
  // ═══════════════════════════════════════════════════════════════════════

  // ── PHASE 1: First 100 Players (Week 1-4) ─────────────────────────────

  // ▸ TELEGRAM INFILTRATION (Priority #1 — Telegram > Discord in ALL target regions)
  { priority: 'MKTG', color: '#ff6b9d', task: '🇹🇷 TURKEY: Join 20 Turkish CS2 Telegram groups — search "CS2 Türkiye", "CS:GO Türkiye", "Counter-Strike Türk", @csaborsa, Turkish FPL channels' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇹🇷 TURKEY: Post in Turkish — "Bu gece Istanbul CS2 Turnuvası — $5 ödül havuzu! Ücretsiz giriş" (free entry, $5 prize pool)' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇬🇪 GEORGIA: Join Georgian gaming Telegram — "გეიმინგი", "CS2 Georgia", GeoGamers, Tbilisi university student groups (CS2 huge among students)' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇦🇿 AZERBAIJAN: Join Baku gaming channels — "CS2 Azərbaycan", Azerbaijani esports communities on Telegram' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇦🇲 ARMENIA: Join Yerevan gaming channels — "CS2 Հայաստան", Armenian esports Telegram groups' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇰🇿🇺🇦 CIS: Join 10 CIS/Kazakh Telegram groups — "CS2 миксы", "CS2 найти тиммейтов", "КС2 СНГ", "CS2 Україна", "Киберспорт KZ"' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇮🇷 IRAN: Join Iranian gaming Telegram — "CS2 ایران", Persian gaming channels (85M population, massive gamers, ZERO platforms, crypto bypasses banks)' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇷🇸🇧🇦 BALKANS: Join "CS2 Srbija", "CS2 Balkan", Bosnian CS2 channels' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇷🇴 ROMANIA: Join "CS2 România", "Gaming România" Telegram channels' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇧🇬🇬🇷 Join "CS2 България", "CS2 Greece" Telegram groups' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇵🇱🇭🇺 Join "CS2 Polska", "Magyar CS2" Telegram groups' },
  { priority: 'MKTG', color: '#ff6b9d', task: '📋 TACTIC: Dont spam! Participate in groups 1 week first, then casually mention "free daily tournaments with real prizes — anyone tried RaiseGG?"' },

  // ▸ FACEBOOK GROUPS (Balkan + Turkish gamers still use Facebook heavily)
  { priority: 'MKTG', color: '#ff6b9d', task: '🇹🇷 FB: Post in "CS2 Türkiye" (50k-200k members), "CS2 Takım Bul", "Türk Oyuncular" — post tournament results with player names' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇷🇴 FB: Post in "CS2 Romania", "Gameri din România" — "Congratulations to [player] who won $5 tonight!"' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇷🇸🇧🇦 FB: Post in "CS2 Srbija", "Balkan Gaming Community" Facebook groups' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🇧🇬🇬🇷🇵🇱🇭🇺 FB: Post in "CS2 България", "Greek Gamers", "CS2 Polska", "Polscy Gracze CS2" Facebook groups' },
  { priority: 'MKTG', color: '#ff6b9d', task: '📋 FB TACTIC: Post tournament results with player names + city visible. Creates FOMO. Tag the city so locals engage.' },

  // ▸ HLTV FORUMS
  { priority: 'MKTG', color: '#ff6b9d', task: '🎮 HLTV: Create 3-5 forum threads — "New platform for 1v1 CS2 stakes — beta testers from Turkey/Balkans wanted"' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🎮 HLTV: Be transparent (HLTV users are cynical). Post in regional threads about competitive scene in target regions' },

  // ▸ MICRO-INFLUENCER OUTREACH
  { priority: 'MKTG', color: '#ff6b9d', task: '🎙️ Find 10 Turkish CS2 streamers on Twitch/Kick (50-200 viewers) — DM: "free daily tournaments, we feature you as partner, your name on tournament"' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🎙️ Find 5 Balkan/Romanian CS2 YouTubers (1k-50k subs) — search "CS2 gameplay türkçe", "CS2 gameplay română"' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🎙️ Find 2-3 Georgian CS2 streamers — small scene but tight-knit, one streamer pulls entire community' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🎙️ OFFER: Verified Streamer badge, named tournament ("PlayerName Invitational"), permanent referral link, zero cost to them' },

  // ▸ CITY RIVALRY TOURNAMENTS (Unique differentiator — no other platform does this)
  { priority: 'MKTG', color: '#ff6b9d', task: '🏙️ Launch city rivalry brackets — Istanbul vs Ankara, Tbilisi vs Batumi, Belgrade vs Zagreb, Bucharest vs Cluj, Warsaw vs Kraków' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🏙️ Create city leaderboards page — "Istanbul leads all-time with 47 wins. Can Tbilisi catch up?" — drives ongoing narrative' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🏙️ Weekly schedule: Mon=Balkan, Tue=Caucasus, Wed=Turkish, Thu=Central Asia, Fri=Istanbul Night, Sat=Pan-Regional, Sun=Iran/CIS' },
  { priority: 'MKTG', color: '#ff6b9d', task: '🏙️ Post city leaderboard graphics with city crests after each tournament — triggers local pride sharing' },

  // ▸ OWN TELEGRAM CHANNEL (@raise_GG) CONTENT
  { priority: 'MKTG', color: '#ff6b9d', task: '📢 @raise_GG daily content: tournament announcements in local language, match highlights, player-of-the-day shoutouts' },
  { priority: 'MKTG', color: '#ff6b9d', task: '📢 @raise_GG: Turkish CS2 memes (meme culture is MASSIVE in Turkish CS2), regional trash talk, city rivalry banter' },
  { priority: 'MKTG', color: '#ff6b9d', task: '📢 @raise_GG: Weekly highlights — "This week: 47 matches, Istanbul leads, biggest win $15 by [player]" — creates FOMO' },

  // ── PHASE 2: 100 → 1,000 Players (Week 4-12) ─────────────────────────

  // ▸ UNIVERSITY ESPORTS CLUBS
  { priority: 'MKTG2', color: '#c77dff', task: '🎓 TURKEY: Email esports clubs at Istanbul Technical, Boğaziçi, ODTÜ, Ankara Uni — offer free inter-university tournament on RaiseGG' },
  { priority: 'MKTG2', color: '#c77dff', task: '🎓 ROMANIA: Bucharest uni esports societies — same offer, zero cost to them or us' },
  { priority: 'MKTG2', color: '#c77dff', task: '🎓 POLAND: Polish universities have Europes most active esports clubs — Warsaw, Kraków, Wrocław' },
  { priority: 'MKTG2', color: '#c77dff', task: '🎓 TACTIC: Offer "University Championship" naming — "[Uni Name] CS2 Championship powered by RaiseGG"' },

  // ▸ VK.COM (CIS/Kazakhstan/Ukraine)
  { priority: 'MKTG2', color: '#c77dff', task: '🇷🇺 VK: Post in CS2 communities (100k+ members) — tournament announcements in Russian' },
  { priority: 'MKTG2', color: '#c77dff', task: '🇷🇺 VK: Search "CS2" communities, join groups, participate first then promote' },

  // ▸ DISCORD SERVERS
  { priority: 'MKTG2', color: '#c77dff', task: '🎮 Discord: Join Turkish CS2 servers (5k-20k members) — post in LFG channels' },
  { priority: 'MKTG2', color: '#c77dff', task: '🎮 Discord: Join Balkan CS2, Romanian CS2, Polish CS2 servers' },
  { priority: 'MKTG2', color: '#c77dff', task: '🎮 Discord: Join FACEIT regional hub Discords (Turkish, Balkan, CIS) — exact target audience' },
  { priority: 'MKTG2', color: '#c77dff', task: '🎮 Discord: Create RaiseGG server with regional voice channels (Turkish VC, Balkan VC, CIS VC)' },

  // ▸ CYBER CAFE PARTNERSHIPS (Physical guerrilla — huge in TR, GE, IR, KZ)
  { priority: 'MKTG2', color: '#c77dff', task: '🏪 Istanbul: Find gaming cafes on Google Maps, contact owners — offer "Cafe [Name] Weekly CS2 Cup" naming' },
  { priority: 'MKTG2', color: '#c77dff', task: '🏪 Tbilisi/Baku: Same approach — gaming cafes are gathering spots, QR code flyers (Canva, free)' },
  { priority: 'MKTG2', color: '#c77dff', task: '🏪 Tehran/Almaty: Internet cafes still massive — offline-to-online bridge, flyers with QR to raisegg.com' },

  // ▸ CROSS-PROMOTION & PARTNERSHIPS
  { priority: 'MKTG2', color: '#c77dff', task: '🤝 Partner with regional Dota 2 tournament organizers — "Practice 1v1s between tournament matches on RaiseGG"' },
  { priority: 'MKTG2', color: '#c77dff', task: '🤝 Partner with CS2 skin trading platforms popular in Turkey/CIS — cross-promote to their user base' },
  { priority: 'MKTG2', color: '#c77dff', task: '📝 Guest post on esporun.com (TR), Romanian esports sites, Serbian gaming news — free content with RaiseGG mention' },

  // ▸ STEAM & WORKSHOP
  { priority: 'MKTG2', color: '#c77dff', task: '🎮 Steam: Join regional CS2 groups ("CS2 Turkey", "CS2 Romania"), participate in discussions, link in profile' },
  { priority: 'MKTG2', color: '#c77dff', task: '🎮 Workshop: Create "RaiseGG Aim Trainer" map — free exposure to anyone browsing CS2 Workshop' },

  // ▸ VIDEO CONTENT (Zero budget)
  { priority: 'MKTG2', color: '#c77dff', task: '🎥 Screen-record tournament highlights, add music, post to YouTube Shorts/TikTok — "Best plays from Istanbul Friday Night CS2"' },
  { priority: 'MKTG2', color: '#c77dff', task: '🎥 60-second compilations of wins — OBS to record, free tools to edit, post weekly' },

  // ── PHASE 3: Automated Marketing (AI-powered) ─────────────────────────

  // ▸ SEO BLOG CONTENT (Gemini AI generates)
  { priority: 'AUTO', color: '#00e6ff', task: '📰 Turkish SEO: "CS2 para kazanma" (earn money CS2), "CS2 turnuva Türkiye", "ücretsiz CS2 turnuvası", "CS2 1v1 para"' },
  { priority: 'AUTO', color: '#00e6ff', task: '📰 Turkish SEO: "Dota 2 para kazanma yolları" (ways to earn money Dota 2)' },
  { priority: 'AUTO', color: '#00e6ff', task: '📰 Romanian SEO: "CS2 câștigă bani", "turneu CS2 România"' },
  { priority: 'AUTO', color: '#00e6ff', task: '📰 Serbian SEO: "CS2 zarada", "CS2 turnir Srbija"' },
  { priority: 'AUTO', color: '#00e6ff', task: '📰 Polish SEO: "CS2 zarobki", "turniej CS2 Polska"' },
  { priority: 'AUTO', color: '#00e6ff', task: '📰 City articles: "Best CS2 Players from Istanbul", "Georgias Rising CS2 Scene", "Turkish CS2 Scene in 2026"' },
  { priority: 'AUTO', color: '#00e6ff', task: '📰 Comparison: "RaiseGG vs FACEIT: Why Skill-Based Staking is Different" — capture FACEIT alternative searches' },
  { priority: 'AUTO', color: '#00e6ff', task: '📰 First-person stories: "How I Won $X Playing CS2 on RaiseGG" — real early users with permission' },

  // ▸ TELEGRAM CHANNEL AUTOMATION
  { priority: 'AUTO', color: '#00e6ff', task: '📢 Auto-post: Daily tournament announcements with city names in Turkish + English' },
  { priority: 'AUTO', color: '#00e6ff', task: '📢 Auto-post: Match results with player names tagged' },
  { priority: 'AUTO', color: '#00e6ff', task: '📢 Auto-post: Weekly city leaderboard rankings' },

  // ▸ VIRAL PRODUCT MECHANICS (Built into platform)
  { priority: 'AUTO', color: '#00e6ff', task: '🔄 "Bring your rival" — challenge a friend, both get free $1 stake match if friend signs up' },
  { priority: 'AUTO', color: '#00e6ff', task: '🔄 City leaderboard public page — players share to prove their city dominates, free viral content' },
  { priority: 'AUTO', color: '#00e6ff', task: '🔄 "First match free" — new users play one staked match with house money, removes all friction' },

  // ═══════════════════════════════════════════════════════════════════════
  // KEY INSIGHTS:
  // • Telegram > Discord in ALL target regions. Go Telegram-first.
  // • Turkey = anchor market (largest pop, most active CS2, crypto-friendly). Win Turkey first.
  // • Iran = sleeper (85M people, zero platforms, crypto bypasses banking). Huge opportunity.
  // • Lead with "free daily tournament, $5 prize" — not staking. Free is the trojan horse.
  // • City tournament naming is the #1 differentiator. No other platform does this.
  // • First 100 players come from personal outreach. No shortcuts.
  // ═══════════════════════════════════════════════════════════════════════
  // ── Ops tasks ──
  { priority: 'TODO', color: '#ffc107', task: 'Set ADMIN_PLAYER_IDS in Vercel after first Steam login' },
  { priority: 'TODO', color: '#ffc107', task: 'Twitter API — 503 outage from Twitter side, auto-posting will activate when they recover' },
  { priority: 'TODO', color: '#ffc107', task: 'Add CS2 server regions: Romania (OVHcloud ~$12/mo), Georgia (WORLDBUS ~$23/mo) — Istanbul done via DatHost' },
  { priority: 'TODO', color: '#ffc107', task: 'Join Dota 2 + Deadlock Telegram groups — search rate-limited, auto-join cron will handle weekly' },
  { priority: 'LATER', color: '#8a8fb5', task: 'FACEIT API key — user unable to complete application' },
  { priority: 'LATER', color: '#8a8fb5', task: 'Bulk email provider (Resend/SendGrid) for newsletters' },
  { priority: 'LATER', color: '#8a8fb5', task: 'Multi-language support (TR, RU, KA, AZ)' },
  // ── Completed ──
  { priority: 'DONE', color: '#00e676', task: '✓ Game Hubs — community spaces with leaderboard, rules, matches' },
  { priority: 'DONE', color: '#00e676', task: '✓ Map Veto — pick/veto/random in CreateMatchModal + JoinMatchModal' },
  { priority: 'DONE', color: '#00e676', task: '✓ Play Page Activity Feed — live sidebar with Realtime subscriptions' },
  { priority: 'DONE', color: '#00e676', task: '✓ Notification Center — bell icon, unread count, Realtime updates' },
  { priority: 'DONE', color: '#00e676', task: '✓ Profile Depth — ELO graph, cosmetics, battle pass tier, match timeline' },
  { priority: 'DONE', color: '#00e676', task: '✓ Tournament Calendar — week grid, remind-me, countdown widget' },
  { priority: 'DONE', color: '#00e676', task: '✓ Clan Expansion — chat, achievements, recruitment board, treasury' },
  { priority: 'DONE', color: '#00e676', task: '✓ Demo Enhancement — clip timestamps, round stats, report round' },
  { priority: 'DONE', color: '#00e676', task: '✓ First Match Tutorial — 4-step guided walkthrough' },
  { priority: 'DONE', color: '#00e676', task: '✓ Missions page — daily (4/day) + weekly (3/week) with RP rewards' },
  { priority: 'DONE', color: '#00e676', task: '✓ Settings page — profile, notifications, game prefs, privacy, danger zone' },
  { priority: 'DONE', color: '#00e676', task: '✓ Dispute resolution — list + detail + evidence + timeline UI' },
  { priority: 'DONE', color: '#00e676', task: '✓ Regional tournaments — 14 cities per game, rotating daily' },
  { priority: 'DONE', color: '#00e676', task: '✓ Web push notifications — VAPID + PushBanner + PushToggle' },
  { priority: 'DONE', color: '#00e676', task: '✓ Leaderboard nationality flags — 60+ countries' },
  { priority: 'DONE', color: '#00e676', task: '✓ Challenge a Friend — shareable links via Telegram/Twitter/WhatsApp' },
  { priority: 'DONE', color: '#00e676', task: '✓ Telegram bot commands — /start /balance /matches /leaderboard /tournament /help' },
  { priority: 'DONE', color: '#00e676', task: '✓ Side wagers — spectators bet on live matches, 5% rake' },
  { priority: 'DONE', color: '#00e676', task: '✓ 5v5 team matches + match time limits + auto-forfeit' },
  { priority: 'DONE', color: '#00e676', task: '✓ Trust badges — on-chain escrow, skill-based, instant payouts, anti-cheat' },
  { priority: 'DONE', color: '#00e676', task: '✓ Lobby filters — game, stake range, ELO, region, sort' },
  { priority: 'DONE', color: '#00e676', task: '✓ Comeback bonus — 7d: 200XP+50RP, 30d: 500XP+100RP' },
  { priority: 'DONE', color: '#00e676', task: '✓ Loss streak protection — warning banner after 3+ losses' },
  { priority: 'DONE', color: '#00e676', task: '✓ Twitter/X @UnspokenMoves — OAuth 1.0a, API keys set, auto-poster 3x/day (30 templates), banner + bio ready' },
  { priority: 'DONE', color: '#00e676', task: '✓ Telegram userbot — full account control, auto-poster every 6h, auto-join cron weekly, 5 active groups cleaned' },
  { priority: 'DONE', color: '#00e676', task: '✓ Discord REST API bot — auto LFG poster every 8h' },
  { priority: 'DONE', color: '#00e676', task: '✓ VK auto-poster — Russian templates, every 12h' },
  { priority: 'DONE', color: '#00e676', task: '✓ Weekly graphics generator — tournament, leaderboard, match results, stats' },
  { priority: 'DONE', color: '#00e676', task: '✓ Streamer discovery — Twitch API, weekly scan for CS2/Dota2 streamers' },
  { priority: 'DONE', color: '#00e676', task: '✓ Logo redesigned — shield+arrow, no more pentagram' },
  { priority: 'DONE', color: '#00e676', task: '✓ Marketing dashboard at /api/marketing/dashboard' },
  { priority: 'DONE', color: '#00e676', task: '✓ Copy-paste message pack — 10 languages, 25+ messages' },
  { priority: 'DONE', color: '#00e676', task: '✓ University + cybercafe outreach templates — 31 universities, 13 cities' },
  { priority: 'DONE', color: '#00e676', task: '✓ Vercel cron jobs set up — marketing automated' },
  { priority: 'DONE', color: '#00e676', task: '✓ Blog internal + outbound linking rules for Gemini AI' },
  { priority: 'DONE', color: '#00e676', task: '✓ Supabase Realtime — matches, notifications, clan_messages' },
  { priority: 'DONE', color: '#00e676', task: '✓ Solana escrow program deployed' },
  { priority: 'DONE', color: '#00e676', task: '✓ EVM escrow deployed — ETH + BNB' },
  { priority: 'DONE', color: '#00e676', task: '✓ Solana authority wallet funded' },
  { priority: 'DONE', color: '#00e676', task: '✓ CS2 server — Istanbul via DatHost' },
  { priority: 'DONE', color: '#00e676', task: '✓ Steam GSLT token added to DatHost' },
  { priority: 'DONE', color: '#00e676', task: '✓ DatHost API credentials in Vercel' },
  { priority: 'DONE', color: '#00e676', task: '✓ Telegram bot + channel configured' },
  { priority: 'DONE', color: '#00e676', task: '✓ SMTP email configured' },
  { priority: 'DONE', color: '#00e676', task: '✓ VAPID push notification keys' },
  { priority: 'DONE', color: '#00e676', task: '✓ SQL migrations 018-025 all run' },
  { priority: 'DONE', color: '#00e676', task: '✓ Anti-cheat — TBAntiCheat + MatchZy + VAC' },
  { priority: 'DONE', color: '#00e676', task: '✓ Skill verification — Leetify + FACEIT + Steam' },
  { priority: 'DONE', color: '#00e676', task: '✓ Google Search Console — sitemaps submitted' },
  { priority: 'DONE', color: '#00e676', task: '✓ Google News submitted — pending review' },
  { priority: 'DONE', color: '#00e676', task: '✓ Gemini AI blog generation' },
  { priority: 'DONE', color: '#00e676', task: '✓ SEO — 104 URLs, unique title/desc/OG/JSON-LD on all pages' },
  { priority: 'DONE', color: '#00e676', task: '✓ Cleaned 19 dead/spam Telegram channels — kept only active groups with real players' },
  { priority: 'DONE', color: '#00e676', task: '✓ Proof of Win cards — auto-generated 1080x1080 shareable victory images with on-chain verification badge' },
  { priority: 'DONE', color: '#00e676', task: '✓ Bounty Board — weekly bounties on top players ($2-$10), auto-refresh cron, Telegram announcements' },
  { priority: 'DONE', color: '#00e676', task: '✓ Revenge Match links — shareable challenge URLs, 48h expiry, works for non-users too' },
  { priority: 'DONE', color: '#00e676', task: '✓ Share buttons — WhatsApp, Telegram, Twitter/X, Copy Link — reusable component' },
  { priority: 'DONE', color: '#00e676', task: '✓ Free first match faucet — $0.50 USDC for new users, 100/day cap, 7-day account age limit' },
  { priority: 'DONE', color: '#00e676', task: '✓ Streak insurance — 7-day streak = 50% refund on next loss, capped at $5' },
  { priority: 'DONE', color: '#00e676', task: '✓ Holiday tournament calendar — 40+ regional holidays, auto-creates themed tournaments (Iftar Invitational, Nowruz Cup, etc)' },
  { priority: 'DONE', color: '#00e676', task: '✓ Meme auto-poster — 50+ gaming memes in EN/TR/RU, posts to TG groups every 12h, subtle RaiseGG mentions' },
  { priority: 'DONE', color: '#00e676', task: '✓ Full marketing + growth automation pipeline live' },
  { priority: 'DONE', color: '#00e676', task: '✓ DatHost API integrated — auto start/stop/RCON for CS2 match servers' },
  { priority: 'DONE', color: '#00e676', task: '✓ Vercel serverless moved to Frankfurt (fra1) — lower latency for TR/Balkans/Caucasus' },
  { priority: 'DONE', color: '#00e676', task: '✓ Supabase in eu-central-1 (Frankfurt) — same region as Vercel functions' },
  { priority: 'DONE', color: '#00e676', task: '✓ Reddit autopilot — 70+ templates, 50+ subs, 8 crons, karma farming + community posting' },
  { priority: 'DONE', color: '#00e676', task: '✓ Facebook auto-poster — regional gaming groups, scheduled posts' },
  { priority: 'DONE', color: '#00e676', task: '✓ Game card art visibility increased on homepage' },
  { priority: 'DONE', color: '#00e676', task: '✓ Ping estimate on landing page — auto-detects country, shows CS2/Dota2/Deadlock latency' },
  { priority: 'DONE', color: '#00e676', task: '✓ Facebook Page — 30+ templates in EN/TR/RU, auto-posts 3x/day (match highlights, features, tips, memes, tournaments)' },
  { priority: 'DONE', color: '#00e676', task: '✓ Telegram engagement bot — scans 3 groups every 3h, replies to LFG/tournament/betting talk in EN/TR/RU' },
  { priority: 'DONE', color: '#00e676', task: '✓ Telegram auto-join — weekly scan, 100+ target groups across CS2/Dota2/Deadlock/esports/betting' },
  { priority: 'DONE', color: '#00e676', task: '✓ Telegram bot webhook — responds to /start /balance /matches /leaderboard /tournament /help' },
  { priority: 'DONE', color: '#00e676', task: '✓ 35 Vercel cron jobs — marketing, tournaments, social, monitoring, match ops all automated' },
  { priority: 'DONE', color: '#00e676', task: '✓ Status dashboard at status.raisegg.com — health checks, wallet addresses, task board, auto-refresh' },
  { priority: 'DONE', color: '#00e676', task: '✓ Monitor system — 9 health checks, 8 cron freshness monitors, Telegram alerts on outage' },
]

// ─── Wallets & Addresses ─────────────────────────────────────────────────────
const INFRA_ADDRESSES = [
  // Solana
  { chain: 'Solana', label: 'Escrow Program', address: '5TVDLAMTv5hGkgAmEYZsfdyPEvuUBJtkAnqy1LkyQPLK', explorer: 'https://solscan.io/account/' },
  { chain: 'Solana', label: 'Treasury (on-chain rake)', address: '2EYPY7nozd8ZnsKBhG7imZKkm36rthzw3ELRWCGvmfLG', explorer: 'https://solscan.io/account/' },
  { chain: 'Solana', label: 'Authority (backend signer)', address: 'CT7qFYnCwDgDquTxAL8eBQqBvDBqUJemSz3KEZvqc2HW', explorer: 'https://solscan.io/account/' },
  { chain: 'Solana', label: 'USDC Mint', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', explorer: 'https://solscan.io/token/' },
  { chain: 'Solana', label: 'USDT Mint', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', explorer: 'https://solscan.io/token/' },
  // EVM — Ethereum
  { chain: 'Ethereum', label: 'Escrow Contract', address: process.env.NEXT_PUBLIC_ESCROW_ETH || 'not set', explorer: 'https://etherscan.io/address/' },
  { chain: 'Ethereum', label: 'EVM Treasury', address: '0x139B393F8660037B6897E9Ba90EA7A825c9aAB4b', explorer: 'https://etherscan.io/address/' },
  { chain: 'Ethereum', label: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', explorer: 'https://etherscan.io/token/' },
  { chain: 'Ethereum', label: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', explorer: 'https://etherscan.io/token/' },
  // EVM — BNB Chain
  { chain: 'BNB Chain', label: 'Escrow Contract', address: process.env.NEXT_PUBLIC_ESCROW_BNB || 'not set', explorer: 'https://bscscan.com/address/' },
  { chain: 'BNB Chain', label: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', explorer: 'https://bscscan.com/token/' },
  { chain: 'BNB Chain', label: 'USDT (BSC-USD)', address: '0x55d398326f99059fF775485246999027B3197955', explorer: 'https://bscscan.com/token/' },
]

// ─── Services ────────────────────────────────────────────────────────────────
const SERVICES = [
  { label: 'Supabase', value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set', link: process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}` : '' },
  { label: 'Solana RPC', value: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'not set', link: '' },
  { label: 'Vercel Project', value: 'raisegg.com', link: 'https://vercel.com/dashboard' },
  { label: 'DatHost', value: 'raisegg.dat.airforce:26636', link: 'https://dathost.net' },
  { label: 'Telegram Channel', value: '@raise_GG', link: 'https://t.me/raise_GG' },
  { label: 'Domain', value: 'raisegg.com', link: 'https://raisegg.com' },
]

const STATUS_ICONS: Record<string, string> = {
  operational: '🟢',
  degraded: '🟡',
  down: '🔴',
  unknown: '⚪',
}

const CATEGORY_LABELS: Record<string, string> = {
  database: 'Databases',
  api: 'External APIs',
  blockchain: 'Blockchain',
  auth: 'Authentication',
  email: 'Email',
  notifications: 'Notifications',
  content: 'Content',
  cron: 'Scheduled Jobs',
}

const CATEGORY_ORDER = ['database', 'blockchain', 'api', 'auth', 'email', 'notifications', 'content', 'cron']

export async function GET() {
  const start = Date.now()
  const checks = await runAllChecks()
  const elapsed = Date.now() - start

  const grouped: Record<string, typeof checks> = {}
  for (const check of checks) {
    if (!grouped[check.category]) grouped[check.category] = []
    grouped[check.category].push(check)
  }

  const hasDown = checks.some(c => c.status === 'down')
  const hasDegraded = checks.some(c => c.status === 'degraded')
  const overall = hasDown ? 'outage' : hasDegraded ? 'degraded' : 'operational'
  const overallColor = overall === 'operational' ? '#00e676' : overall === 'degraded' ? '#ffc107' : '#ff5252'
  const overallLabel = overall === 'operational' ? 'All Systems Operational' : overall === 'degraded' ? 'Some Systems Degraded' : 'System Outage Detected'
  const opCount = checks.filter(c => c.status === 'operational').length

  const todoHtml = OWNER_TASKS.map((t, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;${i > 0 ? 'border-top:1px solid #1e2045;' : ''}">
      <span style="font-size:10px;font-weight:700;color:${t.color};background:${t.color}15;border:1px solid ${t.color}40;padding:2px 8px;border-radius:4px;letter-spacing:.05em;flex-shrink:0">${t.priority}</span>
      <span style="font-size:14px;color:#c8cce0">${t.task}</span>
    </div>`).join('')

  // Group addresses by chain
  const chainGroups: Record<string, typeof INFRA_ADDRESSES> = {}
  for (const a of INFRA_ADDRESSES) {
    if (!chainGroups[a.chain]) chainGroups[a.chain] = []
    chainGroups[a.chain].push(a)
  }
  const chainColors: Record<string, string> = { 'Solana': '#9945ff', 'Ethereum': '#627eea', 'BNB Chain': '#f0b90b' }

  const walletsHtml = Object.entries(chainGroups).map(([chain, addrs]) => {
    const color = chainColors[chain] ?? '#00e6ff'
    const rows = addrs.map((a, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;gap:12px;${i > 0 ? 'border-top:1px solid #1e2045;' : ''}">
        <div style="flex-shrink:0;min-width:140px">
          <span style="font-size:13px;font-weight:600;color:#c8cce0">${a.label}</span>
        </div>
        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px">
          <a href="${a.explorer}${a.address}" target="_blank" rel="noopener" style="font-family:monospace;font-size:12px;color:#8a8fb5;word-break:break-all;text-decoration:none;hover:color:#00e6ff">${a.address}</a>
        </div>
        <button onclick="navigator.clipboard.writeText('${a.address}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)" style="flex-shrink:0;background:#1e2045;border:1px solid #2a2d5a;color:#00e6ff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:6px;cursor:pointer;transition:all .2s">Copy</button>
      </div>`).join('')

    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span>
          <span style="font-size:14px;font-weight:700;color:${color}">${chain}</span>
        </div>
        <div style="background:#12132a;border:1px solid #1e2045;border-radius:10px;overflow:hidden">${rows}</div>
      </div>`
  }).join('')

  const servicesHtml = SERVICES.map((s, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;gap:12px;${i > 0 ? 'border-top:1px solid #1e2045;' : ''}">
      <span style="font-size:13px;font-weight:600;color:#c8cce0;min-width:120px">${s.label}</span>
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px">
        ${s.link ? `<a href="${s.link}" target="_blank" rel="noopener" style="font-family:monospace;font-size:12px;color:#8a8fb5;word-break:break-all">${s.value}</a>` : `<span style="font-family:monospace;font-size:12px;color:#8a8fb5;word-break:break-all">${s.value}</span>`}
      </div>
      <button onclick="navigator.clipboard.writeText('${s.value}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)" style="flex-shrink:0;background:#1e2045;border:1px solid #2a2d5a;color:#00e6ff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:6px;cursor:pointer">Copy</button>
    </div>`).join('')

  const checksHtml = CATEGORY_ORDER.map(cat => {
    const catChecks = grouped[cat]
    if (!catChecks || catChecks.length === 0) return ''
    const rows = catChecks.map((c, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;${i > 0 ? 'border-top:1px solid #1e2045;' : ''}">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:14px">${STATUS_ICONS[c.status] ?? '⚪'}</span>
          <span style="font-weight:500;font-size:15px">${c.name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:16px">
          ${c.response_ms !== undefined ? `<span style="color:#8a8fb5;font-size:13px">${c.response_ms}ms</span>` : ''}
          <span style="font-size:12px;font-weight:600;color:${c.status === 'operational' ? '#00e676' : c.status === 'degraded' ? '#ffc107' : c.status === 'down' ? '#ff5252' : '#9e9e9e'};text-transform:uppercase;letter-spacing:.05em">${c.status}</span>
        </div>
      </div>`).join('')

    return `
      <h2 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#8a8fb5;margin:0 0 12px 0;font-family:system-ui">${CATEGORY_LABELS[cat] ?? cat}</h2>
      <div style="background:#12132a;border:1px solid #1e2045;border-radius:10px;overflow:hidden;margin-bottom:24px">${rows}</div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>RaiseGG Status</title>
  <meta name="description" content="Real-time platform health for RaiseGG"/>
  <meta http-equiv="refresh" content="30"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:#0b0c1d;color:#e0e6ef;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
    a{color:#00e6ff;text-decoration:none}
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <h1 style="font-size:28px;font-weight:800;margin-bottom:8px">RaiseGG Status</h1>
      <p style="color:#8a8fb5;font-size:14px">Real-time platform health — auto-refreshes every 30s</p>
    </div>

    <div style="background:${overallColor}10;border:1px solid ${overallColor}40;border-radius:12px;padding:20px 24px;display:flex;align-items:center;gap:16px;margin-bottom:32px">
      <span style="width:20px;height:20px;border-radius:50%;background:${overallColor};box-shadow:0 0 16px ${overallColor}80;flex-shrink:0"></span>
      <div>
        <div style="font-size:18px;font-weight:700;color:${overallColor}">${overallLabel}</div>
        <div style="font-size:13px;color:#8a8fb5;margin-top:4px">${opCount}/${checks.length} checks passing — checked in ${elapsed}ms</div>
      </div>
    </div>

    <h2 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#8a8fb5;margin:0 0 12px 0;font-family:system-ui">Wallets & Contracts</h2>
    <div style="margin-bottom:32px">${walletsHtml}</div>

    <h2 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#8a8fb5;margin:0 0 12px 0;font-family:system-ui">Services</h2>
    <div style="background:#12132a;border:1px solid #1e2045;border-radius:10px;overflow:hidden;margin-bottom:32px">${servicesHtml}</div>

    <h2 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#8a8fb5;margin:0 0 12px 0;font-family:system-ui">Owner TODO — ${OWNER_TASKS.filter(t => t.priority !== 'DONE').length} remaining</h2>
    <div style="background:#12132a;border:1px solid #1e2045;border-radius:10px;overflow:hidden;margin-bottom:32px">${todoHtml}</div>

    ${checksHtml}

    <div style="text-align:center;margin-top:40px;padding:20px 0;border-top:1px solid #1e2045;color:#8a8fb5;font-size:13px">
      <p>Checked: ${new Date().toISOString()}</p>
      <p style="margin-top:4px"><a href="/">Back to RaiseGG</a></p>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  })
}
