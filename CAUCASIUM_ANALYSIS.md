# Caucasium.com Analysis + CS2 Wager Platform Feature Map

**Date:** 2026-03-29
**Purpose:** Feature inventory for RaiseGG competitive modeling

---

## 1. Caucasium.com — Direct Observations

### What We Confirmed
- **Domain:** caucasium.com (live, responds with 200)
- **Title/Tagline:** "Caucasium | Fair Ping. Fair Play. Competitive Esports Arena"
- **Tech:** JavaScript SPA (single-page application). All content rendered client-side — zero server-rendered HTML beyond the title tag
- **robots.txt:** Open to all crawlers (Googlebot, Bingbot, Twitterbot, facebookexternalhit, *)
- **Sitemap:** None (404)
- **Web Archive:** Zero snapshots on Wayback Machine
- **Search Engine Index:** Zero pages indexed on Google (site:caucasium.com returns nothing)
- **Social Presence:** No Twitter/X, YouTube, or Reddit mentions found
- **API endpoints:** /api/matches returns the SPA shell (no public REST API)

### What the Tagline Reveals
The "Fair Ping. Fair Play." positioning tells us:
1. **Server-side anti-cheat or ping equalization** — they likely route matches through dedicated servers with ping normalization (not peer-to-peer)
2. **Anti-cheat emphasis** — "Fair Play" implies VAC/FACEIT-level anti-cheat integration or match verification
3. **Competitive focus** — "Arena" framing positions it as a skill-based platform, not gambling

### Assessment
Caucasium is either very new, in closed beta, or a small regional platform. The complete absence of search engine presence, social media, and web archives suggests it launched recently or operates by invitation only. The SPA architecture means all logic lives in JavaScript bundles loaded after page load.

---

## 2. Competitor Deep Dive: Ewagers.co (Closest Model to RaiseGG)

Ewagers is the most direct competitor in the peer-to-peer esports wager space. Here is every feature documented:

### 2.1 Navigation & Information Architecture
| Element | Detail |
|---------|--------|
| Primary Nav | Find Wagers, Tournaments, Social, My Wagers, Leaderboard, FAQ |
| CTAs | "Create Wager" (prominent), Login, Sign Up |
| Mobile Nav | Bottom bar with icon-swapping active states |
| Support | FreshChat widget (live chat) |

### 2.2 Homepage Sections
1. **Hero:** Logo + "A skill-based Esports wagering platform" + "Compete against other users, friends, and even your favorite streamer for cash!" + "Sign up now" CTA + "Guaranteed Payouts" badge
2. **How It Works:** 4 cards — Wagers, Streamer Wagers, Tournaments, Side Wagers
3. **Trust Section:** 3 pillars — Encrypted deposits, Safely held funds, Withdraw whenever
4. **Streamer Testimonials:** 3 featured streamers with quotes + embedded Twitch players
5. **Advisory Board:** 8 people (Former DraftKings CMO, EA Music President, Sling TV CPO, etc.)
6. **Partners:** NVIDIA, GBG logos
7. **Footer:** About / Help / More sections, SSL/payment badges, social links

### 2.3 Match Lobby (/home)
- **Hero carousel:** 4 rotating banner images
- **Live Feed tabs:**
  - "Completed Wagers" — 10 recent, showing: title, game, metric (Kills/Score/Placement), amount ($19-$95)
  - "Available Wagers" — 6 open, showing: creator username, game, format (1v1/2v2/4v4), stake ($5-$250)
- **Game Selection Grid:** 16 games with thumbnails + "Create Wager" per game
  - CoD Warzone 2.0, LoL, Fortnite, UFC 5, Battlefield 6, R6 Siege, The Finals, Rocket League, Halo Infinite, 2K25, Valorant, Apex Legends, FC 25, CoD BO6, and more
- **How To Play:** 3-step flow — Register → Deposit → Play & Win
- **Wager Types:** Wagers, Side Wagers, Streamer Wagers

### 2.4 Wager Types (CRITICAL FOR RAISEGG)
| Type | Description | Flow |
|------|-------------|------|
| **Standard Wager** | 1v1 or team, direct PvP, outcome depends on your play | Creator sets game + rules + stake → opponent accepts → play → report scores → winner paid |
| **Side Wager** | Spectator bets on existing matches | Browse active wagers → pick winner → stake amount → if correct, win payout |
| **Streamer Wager** | Streamer vs audience | Streamer creates wager → viewers bet against → streamer plays live → outcome determines payout |
| **Tournament** | Bracket-style elimination | Creator sets entry fee + prize allocation → players register → bracket plays out |

### 2.5 Monetization
- **Rake:** 5% of all prize amounts earned by winners
- **Entry fees:** Disclosed before wager, non-refundable
- **"ALL CHARGES... ARE FINAL, AND ARE NONREFUNDABLE"**

### 2.6 Payment Methods
PayPal, Visa, Mastercard, American Express, Discover, Stripe

### 2.7 Dispute Resolution System
| Scenario | Rule |
|----------|------|
| Time limit | 1 hour 15 min to complete wager after acceptance |
| Score reporting | First player reports → opponent has 15 min to confirm/counter |
| Auto-confirm | If no response in 15 min, first reported score wins |
| Abandoned wager | Not recorded on profile, funds refunded to both |
| Tournament disputes | 15-min filing window per round |
| Evidence required | Photo/video proof mandatory or dispute dismissed |
| Disconnection | No evidence = forfeit |
| Forged scores | Auto-forfeit + account review + potential ban |
| Unauthorized roster change | Disqualification |
| Stream crash (streamer wager) | Disqualification |
| Private match violation | Disqualification |
| Intentional lag | Game loss + potential ban |
| Abusive language | Ban |

### 2.8 Terms & Legal Structure
- **Operator:** E-Ventures, Inc.
- **Classification:** "No gambling is allowed" — skill-based competitions
- **Age:** 18+ minimum
- **Accounts:** 1 per person, EWAGERS property (licensed to user)
- **Inactivity:** 180 days → permanent deletion
- **Arbitration:** Binding, American Arbitration Association, no class actions
- **Governing law:** Nevada
- **Content license:** Users grant irrevocable, perpetual, royalty-free worldwide license

### 2.9 Trust Signals
- SSL badges
- Payment provider logos
- Advisory board with named executives
- Streamer testimonials
- "Guaranteed Payouts" messaging
- Encrypted deposits claim

### 2.10 Technical Stack
- FreshChat (customer support widget)
- LogRocket (session recording)
- Google Analytics (multiple IDs)
- Turbolinks/Turbo (SPA navigation)
- Responsive bottom nav for mobile

---

## 3. Competitor Deep Dive: CheckMate Gaming (CMG)

CMG is the largest established platform in this space. Key stats and features:

### 3.1 Scale Stats
- **16,180,332** matches played
- **$214,004,592** winnings paid out
- **253** active ladders
- **373,514,378** XP earned

### 3.2 Competition Types
| Type | Description |
|------|-------------|
| **Matchfinder** | Head-to-head wagers — pick game, rules, prize |
| **Community Tournaments** | Multi-team bracket, single elimination |
| **Elite** | Premium competitive tier |
| **Switcharoo** | Unique format (proprietary) |
| **Cash Matches** | Direct money wagers |
| **XP Matches** | Free matches for ranking/progression |
| **Free Entry** | No-cost tournament entry |

### 3.3 Game Catalog (25+ titles)
CoD series (12+ variants including zombies), Fortnite, Apex, Fall Guys, Rocket League, Valorant, LoL, Halo Infinite, Gears 5, Marvel Rivals, College Football 26, MLB The Show 26, Madden 26, NBA 2K26, FC 26, CoD Warzone Mobile, Clash Royale, Penguin Paradise

### 3.4 Unique Features
- **Players of the Week:** Weekly leaderboard with credit rewards (+30/+20/+10)
- **XP System:** Progression across all match types
- **News Section:** Game-related articles with dates
- **Find Teammates:** Social matchmaking feature
- **Shop:** In-platform store
- **Multi-language:** English, German, French, Spanish, Polish
- **Skill filters:** Novice, Amateur, All Skills on tournaments
- **Platform icons:** Cross-platform indicators on matches
- **Region tags:** NA+EU, Worldwide

### 3.5 Technical Stack
Google Tag Manager, New Relic, Firebase, Ramp ad network, Cloudflare

---

## 4. Full Feature Matrix — What RaiseGG Needs

Based on Caucasium's positioning + Ewagers + CMG + the broader market:

### 4.1 CORE FEATURES (Must Have)

| Feature | Ewagers | CMG | RaiseGG Status | Priority |
|---------|---------|-----|----------------|----------|
| 1v1 wager matches | Yes | Yes | Built | Done |
| Team wagers (2v2, 5v5) | Yes (2v2, 4v4) | Yes | Not built | HIGH |
| Match lobby with filters | Yes | Yes | Basic | IMPROVE |
| Create match flow | Yes | Yes | Built | Done |
| Join match flow | Yes | Yes | Built | Done |
| Score reporting | Manual | Manual | Auto (Dota2) + manual | Done |
| Dispute system | Full | Full | Basic | IMPROVE |
| Leaderboard | Yes | Yes (weekly) | Not built | HIGH |
| User profiles | Yes | Yes | Basic | IMPROVE |
| Steam auth | N/A | N/A | Built | Done |
| Wallet (deposit/withdraw) | Yes | Yes (credits) | Built | Done |
| Game selection | 16 games | 25+ games | 3 games (CS2/Dota2/Deadlock) | OK for now |

### 4.2 GROWTH FEATURES (Should Have)

| Feature | Where Seen | RaiseGG Status |
|---------|-----------|----------------|
| Side wagers (spectator bets) | Ewagers | Not built |
| Streamer wagers | Ewagers | Not built |
| Tournaments/brackets | Ewagers, CMG | Basic (built) |
| XP/progression system | CMG | Not built |
| Players of the Week | CMG | Not built |
| Find Teammates | CMG | Not built |
| News/articles section | CMG | Not built |
| Referral program | Ewagers | Not built |
| Live chat support | Ewagers (FreshChat) | Not built |
| Multi-language | CMG (5 langs) | Not built |
| Platform/region filters | CMG | Not built |
| Skill-level matchmaking | CMG (Novice/Amateur/All) | Not built |
| Streamer testimonials | Ewagers | Not built |

### 4.3 MONETIZATION MODEL

| Element | Ewagers | CMG | Recommendation for RaiseGG |
|---------|---------|-----|---------------------------|
| Rake/fee | 5% of winner prize | Credit-based | 5% rake (already planned) |
| Entry fees | Per-wager | Per-match/tournament | Per-match |
| Refund policy | Non-refundable | N/A | Non-refundable |
| Premium tier | No | "Elite" tier | Consider later |
| Shop/store | No | Yes | Consider later |
| Ads | No | Ramp ad network | No (per user preference) |

### 4.4 TRUST & LEGAL (Must Have)

| Element | Industry Standard | RaiseGG Status |
|---------|------------------|----------------|
| "Skill-based, not gambling" disclaimer | Ewagers TOS | Not added |
| Age 18+ requirement | Universal | Not enforced |
| 1 account per person | Ewagers TOS | Not enforced |
| Binding arbitration clause | Ewagers TOS | Not added |
| SSL/payment badges | Ewagers, CMG | Not added |
| Evidence-based dispute rules | Ewagers | Not built |
| Auto-forfeit for no-shows (15 min) | Ewagers | Not built |
| Score auto-confirm timer | Ewagers (15 min) | Not built |
| Match time limit | Ewagers (1h 15m) | Not built |
| Inactive account policy | Ewagers (180 days) | Not added |

---

## 5. Caucasium's Unique Positioning: "Fair Ping"

This is the most interesting differentiator. Here's what "Fair Ping" likely means and how RaiseGG should think about it:

### What "Fair Ping" Implies
1. **Dedicated game servers** (not player-hosted) in the target region (Caucasus/Turkey/Balkans)
2. **Ping equalization** — possibly adding artificial latency to the lower-ping player so both play at equal disadvantage
3. **Server selection by geography** — auto-routing to nearest server or letting players agree on server location
4. **Anti-advantage measures** — preventing one player from choosing a server they have 5ms ping to while opponent has 100ms

### How RaiseGG Can Implement This
- For CS2: Use FACEIT/community server integration where both players connect to a neutral server
- For Dota2: Valve servers are already neutral (region-selected)
- Display each player's ping in match details
- Allow mutual server region agreement before match start
- Consider "Fair Ping" as a marketing angle — it resonates in the Caucasus/Turkey region where ping variance is a real competitive issue

---

## 6. Key Takeaways for RaiseGG

### What RaiseGG Already Does Better
1. **Crypto-native (USDC/USDT on Solana)** — Ewagers/CMG use fiat only. This is a massive advantage in the target region where banking is limited
2. **Auto-verification (Dota2 via OpenDota)** — Ewagers/CMG rely on manual score reporting + disputes
3. **On-chain escrow** — trustless, verifiable. Competitors hold funds in traditional accounts
4. **Regional focus** — Caucasus/Turkey/Balkans is underserved. Competitors are US/EU focused

### Top 10 Features to Add (Priority Order)
1. **Dispute system upgrade** — Evidence upload, 15-min auto-confirm timer, admin review queue
2. **Leaderboard** — Weekly/monthly/all-time, with stat columns (wins, losses, win rate, earnings)
3. **Side wagers** — Let spectators bet on active matches (huge engagement + revenue multiplier)
4. **Team matches** — 2v2 and 5v5 support (CS2 is fundamentally a team game)
5. **Match time limits** — Auto-cancel/forfeit if not completed within timeframe
6. **XP/progression system** — Ranks, badges, levels to drive retention
7. **Streamer integration** — Streamer wagers + embedded Twitch/Kick streams
8. **Social features** — Player profiles with match history, W/L record, earnings graph
9. **Trust page** — SSL badges, "skill-based not gambling" disclaimer, on-chain escrow explainer
10. **Referral program** — Bonus USDC for inviting players

### Ewagers Weaknesses RaiseGG Can Exploit
- No crypto payments (huge friction in emerging markets)
- Manual score verification only (slow, dispute-heavy)
- US-focused (Nevada law, USD only)
- No on-chain transparency
- Advisory board is impressive but platform UX is dated
- Only 16 games and all console/PC mainstream — no regional game support

### CMG Weaknesses
- Very US-centric (CoD-heavy game catalog)
- Credit-based system (not real money feel)
- Bloated game catalog (25+ games but thin activity per game)
- No crypto, no blockchain
- Ad-supported (degrades experience)
