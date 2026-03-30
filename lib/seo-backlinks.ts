/**
 * lib/seo-backlinks.ts — Automated SEO backlink building for RaiseGG
 */

const SITE_URL = 'https://raisegg.gg'
const SITE_NAME = 'RaiseGG'

// ─── Search Engine Ping ─────────────────────────────────────────────────

export async function pingSearchEngines(): Promise<{ ok: boolean; results: Record<string, boolean> }> {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`
  const engines: Record<string, string> = {
    google: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    bing: `https://www.bing.com/indexnow?url=${encodeURIComponent(SITE_URL)}&key=raisegg`,
    yandex: `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  }

  const results: Record<string, boolean> = {}
  for (const [name, url] of Object.entries(engines)) {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) })
      results[name] = res.ok || res.status === 200
    } catch {
      results[name] = false
    }
  }

  return { ok: Object.values(results).some(v => v), results }
}

// ─── IndexNow ───────────────────────────────────────────────────────────

export async function submitIndexNow(urls: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'raisegg.gg',
        key: 'raisegg-indexnow-key',
        keyLocation: `${SITE_URL}/raisegg-indexnow-key.txt`,
        urlList: urls.slice(0, 10000),
      }),
      signal: AbortSignal.timeout(15000),
    })
    return { ok: res.ok || res.status === 202 }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Dev.to Article Publishing ──────────────────────────────────────────

interface DevToArticle {
  title: string
  body_markdown: string
  tags: string[]
  published: boolean
}

export async function publishToDevTo(article: DevToArticle): Promise<{ ok: boolean; url?: string; error?: string }> {
  const apiKey = process.env.DEVTO_API_KEY
  if (!apiKey) return { ok: false, error: 'DEVTO_API_KEY not set' }

  try {
    const res = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ article }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Dev.to ${res.status}: ${text}` }
    }

    const data = await res.json() as { url: string }
    return { ok: true, url: data.url }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function generateBacklinkArticle(): DevToArticle {
  const articles: DevToArticle[] = [
    {
      title: 'Building a Blockchain Escrow System for Competitive Gaming',
      tags: ['blockchain', 'gaming', 'solana', 'webdev'],
      published: true,
      body_markdown: `## The Problem

Competitive gamers want to play for real stakes, but trust is the #1 barrier. How do you ensure both players pay up when they lose?

## The Solution: Blockchain Escrow

[RaiseGG](${SITE_URL}) uses Solana smart contracts to hold stakes in escrow during competitive matches:

1. Both players deposit USDC before the match
2. Funds are locked in a Solana escrow program
3. Match result is verified via game API (Steam for CS2/Dota 2)
4. Winner receives both stakes minus a small platform fee
5. Entire process is on-chain and verifiable

## Why Solana?

- **Speed**: Transactions confirm in ~400ms — fast enough for real-time gaming
- **Cost**: $0.00025 per transaction vs $2+ on Ethereum
- **USDC**: Native USDC on Solana means no bridging needed

## Tech Stack

- **Next.js 14** — App Router with server actions
- **Solana Web3.js** — Wallet integration + escrow program
- **Supabase** — User profiles, match history, ELO ratings
- **Steam API** — Match result verification for CS2 and Dota 2

## Anti-Cheat

We verify match results through official game APIs, not player reports. VAC-banned accounts are automatically flagged and can't participate.

## City Leaderboards

We added city-based competition — players represent their city and climb local leaderboards. Istanbul vs Bucharest, Belgrade vs Sofia. Adds a layer of community pride to competitive play.

Try it: [raisegg.gg](${SITE_URL})

---

*Building anything with Solana escrow? Would love to compare approaches.*`,
    },
    {
      title: 'How We Built an ELO Rating System for 1v1 Esports Matches',
      tags: ['algorithms', 'gaming', 'typescript', 'esports'],
      published: true,
      body_markdown: `## 1v1 ELO for Esports

[RaiseGG](${SITE_URL}) is a competitive gaming platform where players stake USDC on 1v1 matches in CS2, Dota 2, and Deadlock. We needed a fair ranking system.

## The Algorithm

Standard ELO with esports modifications:

\`\`\`typescript
const K = 32 // Base K-factor
const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
const newElo = playerElo + K * (actualScore - expectedScore)
\`\`\`

## Our Modifications

### Stake-Weighted K-Factor
Higher stakes = more ELO at risk. A $20 match matters more than a $1 match.

### Game-Specific Adjustments
CS2 1v1s are more volatile than Dota 2 1v1s, so K-factors differ by game.

### Placement Matches
New players get a higher K-factor for their first 10 matches to quickly reach their true skill level.

### City Rankings
Players belong to cities. City ELO is the average of top 10 players from that city. Creates regional rivalries.

## Results

After thousands of matches, the system produces stable rankings where:
- Top players consistently beat lower-ranked opponents
- Upsets happen but don't wildly swing rankings
- New players reach their true rank within ~15 matches

Check the leaderboards: [raisegg.gg](${SITE_URL})

---

*Have you implemented ELO or similar rating systems? What edge cases did you hit?*`,
    },
    {
      title: 'Competitive Gaming Platform with Solana Payments — Full Tech Stack Breakdown',
      tags: ['webdev', 'nextjs', 'solana', 'gaming'],
      published: true,
      body_markdown: `## What We Built

[RaiseGG](${SITE_URL}) — a platform where gamers play CS2, Dota 2, and Deadlock for real USDC stakes. Here's the full stack.

## Frontend
- **Next.js 14** with App Router
- **Tailwind CSS** for styling
- **Solana Wallet Adapter** for wallet connections

## Backend
- **Supabase** — PostgreSQL database + auth + real-time subscriptions
- **Vercel** — Hosting + serverless functions + cron jobs
- **Redis** — Match queue, rate limiting, caching

## Blockchain
- **Solana** — USDC escrow smart contracts
- **@solana/web3.js** — Transaction building
- **Token Program** — USDC SPL token handling

## Game Integration
- **Steam Web API** — CS2/Dota 2 match verification + VAC ban checking
- **Custom VAC checker** — Runs every 6 hours, flags banned accounts

## Automation (32 cron jobs)
- Match notifications, tournament creation, city leaderboards
- Social media posting (Twitter, Telegram, Discord, VK, Reddit)
- Blog generation, meme posting, streamer discovery
- Self-healing monitor + auto-retrigger

## Key Challenges

1. **Escrow timing** — Match results can take minutes to appear on Steam API. We poll with exponential backoff.
2. **Anti-cheat** — VAC bans are binary but don't cover all cheats. We added ELO anomaly detection.
3. **Regional targeting** — Turkey, CIS, Caucasus markets. Multilingual everything (EN/TR/RU).

Try it: [raisegg.gg](${SITE_URL})`,
    },
  ]

  const dayOfYear = Math.floor((Date.now() - new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).getTime()) / 86400000)
  return articles[dayOfYear % articles.length]
}

// ─── Backlink Targets ───────────────────────────────────────────────────

export const BACKLINK_TARGETS = [
  { name: 'Product Hunt', da: 90, url: 'https://www.producthunt.com', notes: 'Gaming/Crypto category' },
  { name: 'AlternativeTo', da: 82, url: 'https://alternativeto.net/submit/', notes: 'Alternative to FACEIT, ESEA, 1v1Me' },
  { name: 'SaaSHub', da: 55, url: 'https://www.saashub.com/submit', notes: 'Alternative to FACEIT' },
  { name: 'Wellfound', da: 89, url: 'https://wellfound.com', notes: 'Startup profile' },
  { name: 'Crunchbase', da: 91, url: 'https://www.crunchbase.com', notes: 'Company profile' },
  { name: 'Indie Hackers', da: 65, url: 'https://www.indiehackers.com', notes: 'Product page + milestones' },
  { name: 'BetaList', da: 65, url: 'https://betalist.com', notes: 'Startup listing' },
  { name: 'StackShare', da: 72, url: 'https://stackshare.io', notes: 'Tech stack showcase' },
  { name: 'Dev.to', da: 85, url: 'https://dev.to', notes: 'Technical articles' },
  { name: 'Hacker News', da: 92, url: 'https://news.ycombinator.com', notes: 'Show HN — blockchain gaming' },
  { name: 'Battlefy', da: 45, url: 'https://battlefy.com', notes: 'Tournament organizer' },
  { name: 'Toornament', da: 50, url: 'https://www.toornament.com', notes: 'Tournament organizer' },
  { name: 'GitHub', da: 99, url: 'https://github.com', notes: 'Open source repos' },
  { name: 'LinkedIn', da: 99, url: 'https://linkedin.com', notes: 'Company page' },
  { name: 'Quora', da: 93, url: 'https://quora.com', notes: 'Answer gaming questions' },
  { name: 'Flipboard', da: 90, url: 'https://flipboard.com', notes: 'Gaming magazine' },
]
