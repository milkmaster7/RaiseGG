/**
 * scripts/reddit-setup-subreddit.js
 *
 * One-time setup script for r/RaiseGG subreddit.
 * Creates the subreddit, sets up sidebar, flairs, AutoModerator,
 * and posts initial welcome + content threads.
 *
 * Usage: node scripts/reddit-setup-subreddit.js
 * Requires: REDDIT_USERNAME + REDDIT_PASSWORD in .env.local
 */

const fs = require('fs');
const path = require('path');

// ─── Load .env.local ──────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// ─── Reddit API ───────────────────────────────────────────────────────────

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_API_BASE = 'https://oauth.reddit.com';
const PUBLIC_CLIENT_ID = 'ohXpoqrZYub1kg';
const USER_AGENT = 'Android:com.raisegg.app:v1.0.0 (by /u/RaiseGG)';

let cachedToken = null;

async function getToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID || PUBLIC_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing REDDIT_USERNAME or REDDIT_PASSWORD in .env.local');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(REDDIT_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username,
      password,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reddit auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function redditPost(endpoint, params) {
  const token = await getToken();
  const url = `${REDDIT_API_BASE}${endpoint}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams(params).toString(),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return { ok: res.ok, status: res.status, data };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Subreddit content ────────────────────────────────────────────────────

const SUBREDDIT = 'RaiseGG';

const SIDEBAR = `# Welcome to r/RaiseGG

**RaiseGG** is a competitive stake gaming platform for CS2, Dota 2, and Deadlock. Play 1v1, 2v2, or 5v5 matches for USDC/USDT with blockchain escrow on Solana.

---

## How It Works

1. Find a match or create one
2. Both players deposit USDC into smart contract escrow
3. Play on dedicated servers with anti-cheat
4. Winner receives the pot automatically

## Games Supported

- **CS2** — 1v1, 2v2, 5v5
- **Dota 2** — 1v1 Mid
- **Deadlock** — 1v1

## Free Daily Tournaments

No deposit needed. $5 USDC prize to the winner. 8-player single elimination.

## Links

- [Play Now](https://raisegg.com/play)
- [Tournaments](https://raisegg.com/tournaments)
- [Leaderboard](https://raisegg.com/leaderboard)
- [Discord](https://discord.gg/ErWPgH7gd6)
- [Telegram](https://t.me/raisegg)
- [Twitter / X](https://x.com/raise_gg)

## Rules

1. Be respectful — No harassment, slurs, or personal attacks
2. No cheating discussion — Don't promote or discuss cheats/exploits
3. No scam links — Only official RaiseGG links allowed
4. Use post flairs — Tag your posts correctly
5. No spam — Don't post the same thing repeatedly
6. English or local language welcome
7. No account trading
8. Report bugs with the Bug Report flair
9. Keep it gaming-related
10. Have fun

---

*RaiseGG — Stake. Play. Win.*`;

const PUBLIC_DESC = 'RaiseGG — 1v1 stake matches in CS2, Dota 2 & Deadlock. Blockchain escrow on Solana. Free daily tournaments.';

const FLAIRS = [
  { text: 'CS2', css: 'cs2', bg: '#ff6b00', color: 'light' },
  { text: 'Dota 2', css: 'dota2', bg: '#e74c3c', color: 'light' },
  { text: 'Deadlock', css: 'deadlock', bg: '#9b59b6', color: 'light' },
  { text: 'Match Result', css: 'match-result', bg: '#2ecc71', color: 'light' },
  { text: 'Tournament', css: 'tournament', bg: '#f1c40f', color: 'dark' },
  { text: 'Discussion', css: 'discussion', bg: '#3498db', color: 'light' },
  { text: 'Meme', css: 'meme', bg: '#e91e63', color: 'light' },
  { text: 'Bug Report', css: 'bug-report', bg: '#e74c3c', color: 'light' },
  { text: 'Feature Request', css: 'feature-request', bg: '#00bcd4', color: 'light' },
  { text: 'City Rivalry', css: 'city-rivalry', bg: '#ff9800', color: 'light' },
  { text: 'Announcement', css: 'announcement', bg: '#00e6ff', color: 'dark' },
  { text: 'Guide', css: 'guide', bg: '#4caf50', color: 'light' },
];

const AUTOMOD_CONFIG = `---
# Welcome message on new posts
type: submission
is_edited: false
comment: |
    Thanks for posting in r/RaiseGG!

    **Quick links:**
    - [Play Now](https://raisegg.com/play) | [Tournaments](https://raisegg.com/tournaments) | [Leaderboard](https://raisegg.com/leaderboard)
    - [Discord](https://discord.gg/ErWPgH7gd6) | [Telegram](https://t.me/raisegg)

    Please make sure your post has the correct flair. If you're reporting a bug, include as much detail as possible.

    *I am a bot. This action was performed automatically.*
comment_stickied: true
---
# Spam filter
type: any
body (includes, regex): ["free money", "guaranteed win", "hack", "cheat download", "boosting service"]
action: filter
action_reason: "Possible spam/cheat promotion"
---
# New account filter
type: any
author:
    account_age: "< 3 days"
action: filter
action_reason: "New account (< 3 days)"
---
# Low karma filter
type: any
author:
    combined_karma: "< 10"
action: filter
action_reason: "Low karma account"
`;

const WELCOME_POST = {
  title: 'Welcome to r/RaiseGG — 1v1 Stake Matches in CS2, Dota 2 & Deadlock',
  body: `# Welcome to r/RaiseGG!

This is the official subreddit for **RaiseGG** — a competitive stake gaming platform where you can play 1v1, 2v2, or 5v5 matches for USDC/USDT with blockchain escrow on Solana.

---

## What is RaiseGG?

RaiseGG lets you play competitive matches in **CS2, Dota 2, and Deadlock** for real money. The money goes into a Solana smart contract before the match starts, and the winner receives it automatically after the match ends.

**No trust needed.** No scams. No disputes.

## How It Works

1. Create or join a match
2. Both players deposit USDC into blockchain escrow
3. Play on dedicated servers with anti-cheat (VAC + MatchZy)
4. Winner receives both stakes minus a small fee

## Free Daily Tournaments

Don't want to stake money? No problem. We run **free daily tournaments** with real prizes:

- 8-player single elimination
- $5 USDC to the winner
- No entry fee, no deposit needed
- Daily themed nights (Balkan Night, Turkish Wednesday, Caucasus Cup, etc.)

## City Leaderboards

We track wins by city. Rep your city and climb the leaderboard:
Istanbul, Ankara, Bucharest, Belgrade, Tbilisi, Baku, and more.

## Links

- **Play:** [raisegg.com/play](https://raisegg.com/play)
- **Tournaments:** [raisegg.com/tournaments](https://raisegg.com/tournaments)
- **Leaderboard:** [raisegg.com/leaderboard](https://raisegg.com/leaderboard)
- **Discord:** [discord.gg/ErWPgH7gd6](https://discord.gg/ErWPgH7gd6)
- **Telegram:** [t.me/raisegg](https://t.me/raisegg)
- **Twitter:** [x.com/raise_gg](https://x.com/raise_gg)

## Subreddit Rules

Please read the sidebar rules. TL;DR: be respectful, no cheating talk, use flairs.

---

**Questions? Ask below. We're here to help.**

*Stake. Play. Win.*`,
  flair: 'Announcement',
};

const INITIAL_POSTS = [
  {
    title: 'Free CS2 Tournament — $5 USDC prize, no entry fee, 8 slots — runs daily',
    body: `We run free CS2 tournaments every single day on RaiseGG.

**Format:**
- 8 players, single elimination, BO1
- Dedicated servers with VAC + MatchZy anti-cheat
- Winner takes $5 USDC (withdraw to any crypto wallet)
- No entry fee — completely free

**Themed nights:**
- Monday: Balkan Night
- Tuesday: Caucasus Cup
- Wednesday: Turkish Wednesday
- Thursday: Central Asia
- Friday: Istanbul Night
- Saturday: Championship

Just need a Steam account. No deposit needed.

[Sign up here](https://raisegg.com/tournaments)`,
    flair: 'Tournament',
  },
  {
    title: 'How blockchain escrow works on RaiseGG — simple explanation',
    body: `A lot of people will ask about this, so here's the explainer:

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

**Don't have crypto?** Free tournaments don't require any crypto or wallet setup.

Questions? Ask below.`,
    flair: 'Guide',
  },
  {
    title: 'City Leaderboard is live — which city will dominate?',
    body: `We track wins by city on RaiseGG. Every match you play counts toward your city's ranking.

**How it works:**
- Set your city in your profile
- Play matches (free or stake)
- Your wins count for your city
- City rankings update in real-time

**Themed tournament nights:**
- Monday: Balkan Night (Belgrade vs Bucharest vs Sofia vs Athens)
- Tuesday: Caucasus Cup (Tbilisi vs Baku vs Yerevan)
- Wednesday: Turkish Wednesday (Istanbul vs Ankara vs Izmir)
- Friday: Istanbul Night
- Saturday: Open Championship

Which city are you repping? Drop your city in the comments!

[City Leaderboard](https://raisegg.com/leaderboard) | [Tournaments](https://raisegg.com/tournaments)`,
    flair: 'City Rivalry',
  },
  {
    title: 'What game do you want to see more tournaments in? CS2, Dota 2, or Deadlock?',
    body: `RaiseGG supports all three Valve competitive games:

- **CS2** — 1v1, 2v2, 5v5 (most popular currently)
- **Dota 2** — 1v1 Mid
- **Deadlock** — 1v1

We're expanding tournaments. Which game should we focus on next?

Also open to format suggestions:
- Dota 2: What heroes should be allowed/banned in 1v1?
- Deadlock: What win condition is fairest? (First to X kills? First tower? Most souls?)
- CS2: Should we add more map variety?

Your feedback shapes the platform.`,
    flair: 'Discussion',
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  r/RaiseGG Subreddit Setup');
  console.log('========================================');
  console.log('');

  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!username || !password) {
    console.log('  ERROR: REDDIT_USERNAME and REDDIT_PASSWORD must be set in .env.local');
    console.log('  Run scripts/reddit-login.bat first to set up credentials.');
    process.exit(1);
  }

  log('*', `Reddit account: ${username}`);
  console.log('');

  // Step 1: Test auth
  log('>', 'Testing Reddit authentication...');
  try {
    await getToken();
    log('+', 'Authentication successful!');
  } catch (err) {
    log('X', `Authentication failed: ${err.message}`);
    process.exit(1);
  }

  await sleep(1000);

  // Step 2: Create subreddit
  log('>', `Creating r/${SUBREDDIT}...`);
  const createRes = await redditPost('/api/site_admin', {
    name: SUBREDDIT,
    title: 'RaiseGG — 1v1 Stake Matches in CS2, Dota 2 & Deadlock',
    public_description: PUBLIC_DESC,
    description: SIDEBAR,
    type: 'public',
    link_type: 'any',
    allow_images: 'true',
    allow_videos: 'true',
    allow_polls: 'true',
    allow_post_crossposts: 'true',
    show_media: 'true',
    show_media_preview: 'true',
    lang: 'en',
    over_18: 'false',
    allow_discovery: 'true',
    api_type: 'json',
  });

  if (createRes.ok || (createRes.data?.json?.errors?.length === 0)) {
    log('+', `r/${SUBREDDIT} created successfully!`);
  } else {
    const errors = createRes.data?.json?.errors;
    if (errors && errors.some(e => e[0] === 'SUBREDDIT_EXISTS')) {
      log('~', `r/${SUBREDDIT} already exists — continuing with setup.`);
    } else {
      log('!', `Create subreddit response: ${JSON.stringify(createRes.data)}`);
      log('~', 'Continuing with setup anyway (subreddit may already exist)...');
    }
  }

  await sleep(2000);

  // Step 3: Create flairs
  log('>', 'Creating post flairs...');
  let flairCount = 0;
  for (const flair of FLAIRS) {
    const res = await redditPost(`/r/${SUBREDDIT}/api/flairtemplate_v2`, {
      api_type: 'json',
      css_class: flair.css,
      flair_type: 'LINK_FLAIR',
      text: flair.text,
      text_editable: 'false',
      background_color: flair.bg,
      text_color: flair.color,
    });
    if (res.ok) flairCount++;
    await sleep(500);
  }
  log('+', `Created ${flairCount}/${FLAIRS.length} flairs.`);

  await sleep(1000);

  // Step 4: Set up AutoModerator
  log('>', 'Setting up AutoModerator...');
  const automodRes = await redditPost(`/r/${SUBREDDIT}/api/wiki/edit`, {
    content: AUTOMOD_CONFIG,
    page: 'config/automoderator',
    reason: 'RaiseGG AutoModerator initial setup',
  });
  if (automodRes.ok) {
    log('+', 'AutoModerator configured!');
  } else {
    log('!', `AutoModerator setup: ${JSON.stringify(automodRes.data)}`);
  }

  await sleep(2000);

  // Step 5: Post welcome thread (and sticky it)
  log('>', 'Posting welcome thread...');
  const welcomeRes = await redditPost('/api/submit', {
    sr: SUBREDDIT,
    kind: 'self',
    title: WELCOME_POST.title,
    text: WELCOME_POST.body,
    flair_text: WELCOME_POST.flair,
    resubmit: 'true',
    api_type: 'json',
  });

  const welcomeId = welcomeRes.data?.json?.data?.name;
  const welcomeUrl = welcomeRes.data?.json?.data?.url;
  if (welcomeId) {
    log('+', `Welcome thread posted: ${welcomeUrl}`);

    // Sticky it
    await sleep(1000);
    await redditPost('/api/set_subreddit_sticky', {
      id: welcomeId,
      state: 'true',
      num: '1',
      api_type: 'json',
    });
    log('+', 'Welcome thread stickied!');
  } else {
    log('!', `Welcome post response: ${JSON.stringify(welcomeRes.data)}`);
  }

  // Step 6: Post initial content threads
  log('>', 'Posting initial content threads...');
  for (let i = 0; i < INITIAL_POSTS.length; i++) {
    const post = INITIAL_POSTS[i];

    // Wait between posts to avoid rate limiting
    await sleep(3000);

    const res = await redditPost('/api/submit', {
      sr: SUBREDDIT,
      kind: 'self',
      title: post.title,
      text: post.body,
      flair_text: post.flair,
      resubmit: 'true',
      api_type: 'json',
    });

    const postUrl = res.data?.json?.data?.url;
    if (postUrl) {
      log('+', `Post ${i + 1}/${INITIAL_POSTS.length}: ${postUrl}`);
    } else {
      const errors = res.data?.json?.errors;
      if (errors && errors.length > 0) {
        log('!', `Post ${i + 1} failed: ${errors.map(e => e.join(': ')).join('; ')}`);
        if (errors.some(e => e[0] === 'RATELIMIT')) {
          log('~', 'Rate limited — stopping posts. Run again later for remaining posts.');
          break;
        }
      } else {
        log('!', `Post ${i + 1}: ${JSON.stringify(res.data)}`);
      }
    }
  }

  console.log('');
  console.log('========================================');
  console.log('  Setup complete!');
  console.log(`  Visit: https://reddit.com/r/${SUBREDDIT}`);
  console.log('========================================');
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
