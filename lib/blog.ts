export type BlogPost = {
  slug:         string
  title:        string
  description:  string
  tag:          string
  publishedAt:  string
  readTime:     number // minutes
  content:      string // HTML
  relatedLinks?: { href: string; label: string }[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug:         'how-staking-works-raisegg',
    title:        'How Staking Works on RaiseGG',
    description:  'A full breakdown of how RaiseGG handles stake matches — from depositing USDC or USDT to receiving your payout in seconds.',
    tag:          'Guide',
    publishedAt:  '2025-09-01',
    readTime:     5,
    relatedLinks: [{ href: '/how-it-works', label: 'How It Works' }, { href: '/play', label: 'Find a Match' }],
    content: `
      <p>RaiseGG is built on a simple idea: when two players disagree about who would win, money should be on the line — and it should be settled on the server, not in someone's PayPal account.</p>
      <h2>The Flow</h2>
      <ol>
        <li><strong>Connect Steam</strong> — we verify your account age, VAC status, and hours to confirm you're a legitimate player.</li>
        <li><strong>Deposit USDC or USDT</strong> — transfer USDC or USDT from your Phantom or Solflare wallet to your RaiseGG balance. Funds sit in a Solana smart contract at all times.</li>
        <li><strong>Create a Match</strong> — set your game, format, and stake. Your funds lock into a vault PDA the moment you confirm.</li>
        <li><strong>Opponent Joins</strong> — they deposit equal stake. The contract now holds both players' funds — neither side can touch them.</li>
        <li><strong>Play</strong> — for Dota 2, submit the match ID after the game. For CS2, results are recorded automatically from our game server.</li>
        <li><strong>Payout</strong> — the winner receives 90% of the pot within seconds. We take 10% as rake.</li>
      </ol>
      <h2>Why Solana?</h2>
      <p>Solana transactions settle in under 400ms and cost fractions of a cent. That means for a $10 match, the gas fee is negligible — unlike Ethereum where fees could eat 10% of your winnings on a small stake.</p>
      <h2>Is my money safe?</h2>
      <p>The vault is a PDA (program-derived address) — an account controlled entirely by the smart contract's program logic. Not us, not anyone. Funds are only released when a verified match result is confirmed on-chain.</p>
    `,
  },
  {
    slug:         'cs2-1v1-tips-raisegg',
    title:        'CS2 1v1 Tips: How to Win Your Stake Match',
    description:  'Practical tips for winning CS2 1v1 stake matches on RaiseGG — map selection, aim warmup, and mental game.',
    tag:          'CS2',
    publishedAt:  '2025-09-08',
    readTime:     6,
    relatedLinks: [{ href: '/games/cs2', label: 'CS2 on RaiseGG' }, { href: '/play', label: 'Play Now' }],
    content: `
      <p>A stake 1v1 is different from a ranked match. There's money on the line, it's just two players, and the meta shifts dramatically. Here's how to give yourself the best chance.</p>
      <h2>Map Selection</h2>
      <p>Know which 1v1 maps favour your playstyle. Aim_map variants favour raw mechanical skill. More tactical maps reward reading your opponent. Always pick a map you've played at least 50 hours on — don't gamble on map knowledge AND stakes.</p>
      <h2>Warmup Properly</h2>
      <p>Cold-starting into a stake match is how you lose money. Spend 15 minutes in aim_botz or a deathmatch server before queuing. Get your crosshair placement sharp before the adrenaline kicks in.</p>
      <h2>Stake at Your ELO Level</h2>
      <p>RaiseGG enforces minimum stakes per ELO tier — this prevents high-ranked players from farming low-stakes lobbies. But that doesn't mean you should always play at the maximum. Find the stake you're comfortable with so tilt doesn't affect your decision-making.</p>
      <h2>Mental Game</h2>
      <p>If you lose a round, forget it. The match isn't over until the scoreboard says so. Players who can reset mentally after being down points win far more often than their raw aim would suggest.</p>
      <h2>After the Match</h2>
      <p>RaiseGG CS2 matches are resolved automatically from the game server — you don't need to do anything. The payout hits your balance within seconds of the match ending.</p>
    `,
  },
  {
    slug:         'dota2-how-to-submit-match-id',
    title:        'Dota 2: How to Submit Your Match ID for Payout',
    description:  'Step-by-step guide to submitting your Dota 2 match ID on RaiseGG and receiving your USDC/USDT payout.',
    tag:          'Dota 2',
    publishedAt:  '2025-09-15',
    readTime:     3,
    relatedLinks: [{ href: '/games/dota2', label: 'Dota 2 on RaiseGG' }, { href: '/dashboard/matches', label: 'My Matches' }],
    content: `
      <p>Dota 2 results on RaiseGG are verified via Valve's Steam API. Here's how to get paid after a win.</p>
      <h2>Step 1: Find Your Match ID</h2>
      <p>After the match ends, open Dota 2 and go to your profile → Matches. Click on the most recent game and copy the Match ID shown at the top — it's a long number like <code>7891234567</code>.</p>
      <h2>Step 2: Submit on RaiseGG</h2>
      <p>Go to your active match on RaiseGG and click "Submit Match ID". Paste the number and confirm. Our system pulls the result directly from Steam's API.</p>
      <h2>What We Verify</h2>
      <ul>
        <li>Both players were present in the match</li>
        <li>The match lasted at least 10 minutes (prevents forfeit farming)</li>
        <li>The match was played after the stake was created</li>
        <li>The lobby type is valid (not a bot match)</li>
      </ul>
      <h2>Payout Timeline</h2>
      <p>If verification passes, your USDC or USDT payout hits your RaiseGG balance immediately. Withdraw to your wallet anytime — it arrives in under 30 seconds.</p>
      <h2>What If It Fails?</h2>
      <p>If the verification fails, you'll see an error explaining why. If you believe it's a bug, raise a dispute from the match page and our team will review within 24 hours.</p>
    `,
  },
  {
    slug:         'what-is-deadlock-valve',
    title:        'What is Deadlock? Valve\'s New Hero Shooter Explained',
    description:  'A quick introduction to Deadlock, Valve\'s newest game — and why RaiseGG is the first stake platform to support it.',
    tag:          'Deadlock',
    publishedAt:  '2025-09-22',
    readTime:     4,
    relatedLinks: [{ href: '/games/deadlock', label: 'Deadlock on RaiseGG' }, { href: '/play', label: 'Play Now' }],
    content: `
      <p>Deadlock is Valve's third major multiplayer game after CS and Dota 2. Released in early access in 2024, it blends MOBA mechanics with a third-person shooter — think Dota 2 lanes with CS2-level gunplay.</p>
      <h2>The Basics</h2>
      <p>Two teams of six fight across four lanes to destroy the enemy's base. Each player controls a "Hero" with unique abilities, but winning gunfights is just as important as ability usage. The skill ceiling is high — and that makes it ideal for staking.</p>
      <h2>Why Stake Deadlock?</h2>
      <p>The game is still new enough that rank gaps are volatile. High-mechanical players who arrive early consistently outperform their matchmaking rank. If you're skilled, you have an edge — RaiseGG lets you monetise it.</p>
      <h2>RaiseGG Deadlock Support</h2>
      <p>We're the first and only stake platform building Deadlock support. Match verification is pending Valve adding public match history to their API — we'll enable it the moment that ships. Register now and you'll be first in queue when it goes live.</p>
    `,
  },
  {
    slug:         'why-usdc-solana-for-gaming',
    title:        'Why We Use USDC on Solana — Not PayPal, Not ETH',
    description:  'The technical and practical reasons RaiseGG uses Solana + USDC instead of traditional payment methods or Ethereum.',
    tag:          'Tech',
    publishedAt:  '2025-09-29',
    readTime:     5,
    relatedLinks: [{ href: '/how-it-works', label: 'How It Works' }, { href: '/dashboard/wallet', label: 'Wallet' }],
    content: `
      <p>When we built RaiseGG, we had a choice: credit cards, PayPal, Ethereum, or Solana. Here's why we picked Solana with USDC — and why it matters for you as a player.</p>
      <h2>PayPal & Cards: The Problem</h2>
      <p>Payment processors don't like gaming stakes. Accounts get frozen, chargebacks get filed, and platforms get shut down. We needed something where neither we nor any third party could block a payout once a match result was confirmed.</p>
      <h2>Ethereum: Too Expensive</h2>
      <p>Ethereum's smart contracts are battle-tested, but gas fees are brutal. A $10 stake match could cost $5–$15 in fees alone. That's unacceptable for micro-stakes gaming.</p>
      <h2>Solana: Fast, Cheap, Trustless</h2>
      <p>Solana settles in ~400ms with fees under $0.001. Our Anchor program (the smart contract) holds stake funds in a PDA vault — meaning no one can touch them until a verified result comes in. The code is the rule.</p>
      <h2>USDC: Stable Value</h2>
      <p>SOL price swings would make stakes unpredictable. USDC is always worth $1, so a $10 stake is worth $10 when you deposit and $9 when you win (after rake) — no surprises.</p>
      <h2>The 44-Country Advantage</h2>
      <p>Our users in Turkey, Georgia, Armenia, Serbia and surrounding regions often don't have reliable access to USD payment rails. With a Phantom wallet and $10 of USDC, anyone can stake in under 2 minutes — no bank account required.</p>
    `,
  },
  {
    slug:        'raisegg-elo-system-explained',
    title:       'How the RaiseGG ELO System Works',
    description: 'A breakdown of RaiseGG\'s six-tier ELO rating system — Bronze through Apex — and how wins, losses and stake amounts affect your rank.',
    tag:         'Guide',
    publishedAt: '2025-10-06',
    readTime:    4,
    content: `
      <p>Your RaiseGG ELO isn't just a number — it determines who you get matched against, what stake tiers you can access, and your position on the regional leaderboard. Here's how the system works.</p>
      <h2>The Six Tiers</h2>
      <ul>
        <li><strong>Bronze</strong> — 0–899 ELO</li>
        <li><strong>Silver</strong> — 900–1099. New players start at 1000 (Silver).</li>
        <li><strong>Gold</strong> — 1100–1299</li>
        <li><strong>Platinum</strong> — 1300–1499</li>
        <li><strong>Diamond</strong> — 1500–1699</li>
        <li><strong>Apex</strong> — 1700+. The top of the leaderboard.</li>
      </ul>
      <h2>How ELO Changes After a Match</h2>
      <p>We use a modified Elo formula where K (the maximum points per game) scales with your current tier. Lower-ranked players gain and lose more per match — this lets skilled players climb faster. Higher-ranked players have smaller swings, keeping the top of the ladder stable.</p>
      <p>The expected outcome is also factored in. Beating a Diamond player as a Silver earns significantly more ELO than beating someone of equal rank.</p>
      <h2>Separate ELO Per Game</h2>
      <p>Your CS2 ELO and Dota 2 ELO are tracked independently. A Grand Master Dota 2 player starts fresh in CS2 — there's no cross-game rating bleed.</p>
      <h2>Stake Tiers and ELO Gates</h2>
      <p>Certain stake amounts require a minimum ELO. This prevents Bronze players from immediately jumping into high-stakes lobbies, and stops rank-boosting via low-effort wins. The higher your ELO, the more stake options you unlock.</p>
    `,
  },
  {
    slug:         'cs2-stake-platform-turkey',
    title:        'CS2 Stake Matches for Turkish Players — Full Guide',
    description:  'How Turkish CS2 players can join RaiseGG, deposit USDC or USDT, and start winning stake matches with fast Solana payouts.',
    tag:          'CS2',
    publishedAt:  '2025-10-13',
    readTime:     5,
    relatedLinks: [{ href: '/cs2-platform-turkey', label: 'CS2 in Turkey' }, { href: '/play', label: 'Play Now' }],
    content: `
      <p>Turkey has one of the most active CS2 player bases in the world — and almost no legitimate stake platform built for it. RaiseGG fills that gap. Here's everything Turkish players need to know.</p>
      <h2>Why Turkish Players Use RaiseGG</h2>
      <p>Traditional esports betting sites in Turkey are restricted or require identity verification that many players don't want to complete. RaiseGG is different — it's skill-based competition, not betting. You're not wagering on someone else's outcome; you're competing directly.</p>
      <p>No ID required. Just a Steam account and a Phantom wallet.</p>
      <h2>Getting USDC or USDT in Turkey</h2>
      <p>You can buy USDC or USDT on Solana through Binance, OKX or any major exchange that serves Turkey. Transfer from your exchange to a Phantom wallet, then deposit to RaiseGG. The whole process takes about 5 minutes.</p>
      <h2>Turkish CS2 Scene on RaiseGG</h2>
      <p>We specifically serve the Turkey and Caucasus region — you'll find opponents at your skill level with no ping disadvantage. Our servers are located to minimise latency for the region.</p>
      <h2>Language Support</h2>
      <p>The platform is in English, but our Telegram has a dedicated Turkish community channel. Join at t.me/raisegg.</p>
    `,
  },
  {
    slug:         'cs2-stake-platform-georgia',
    title:        'CS2 Stake Matches in Georgia — RaiseGG Guide',
    description:  'Georgian CS2 players: how to register, deposit USDC or USDT, and compete in stake matches on RaiseGG. Step-by-step.',
    tag:          'CS2',
    publishedAt:  '2025-10-20',
    readTime:     4,
    relatedLinks: [{ href: '/cs2-platform-georgia', label: 'CS2 in Georgia' }, { href: '/play', label: 'Play Now' }],
    content: `
      <p>Georgia's competitive gaming scene is growing fast — and RaiseGG was built in part for it. Here's how Georgian players get started.</p>
      <h2>Registration</h2>
      <p>Click "Connect Steam" and authenticate with your Steam account. That's it — no email, no ID, no waiting. Your profile is created instantly and your ELO starts at 1000 (Silver).</p>
      <h2>Depositing USDC or USDT in Georgia</h2>
      <p>USDC and USDT on Solana are available through Binance, which accepts GEL via local payment methods. Buy USDC or USDT, send it to your Phantom wallet, then deposit to your RaiseGG balance. Minimum deposit is $5.</p>
      <h2>Playing Your First Match</h2>
      <p>Go to the Play page, set your stake (start small — $2–5 is common for new players), select CS2 and your preferred format, and create the lobby. When an opponent joins, you'll get a real-time notification.</p>
      <h2>Withdrawing Winnings</h2>
      <p>Won a match? Your USDC or USDT balance updates automatically. Withdraw anytime from your Wallet page — it hits your Phantom wallet in under 30 seconds.</p>
      <h2>Community</h2>
      <p>Join our Telegram (t.me/raisegg) to find Georgian opponents, discuss maps, and get help from the team.</p>
    `,
  },
  {
    slug:         'how-to-get-usdc-solana-wallet',
    title:        'How to Get a Solana Wallet and USDC/USDT for RaiseGG',
    description:  'Complete beginner\'s guide to setting up Phantom wallet and buying USDC or USDT on Solana to fund your RaiseGG account.',
    tag:          'Guide',
    publishedAt:  '2025-10-27',
    readTime:     6,
    relatedLinks: [{ href: '/dashboard/wallet', label: 'Wallet' }, { href: '/how-it-works', label: 'How It Works' }],
    content: `
      <p>Never used crypto before? Don't worry — getting a wallet and USDC or USDT takes about 10 minutes. Here's the step-by-step.</p>
      <h2>Step 1: Install Phantom Wallet</h2>
      <p>Phantom is the most popular Solana wallet. Install the browser extension from phantom.app (Chrome, Firefox, Brave, Edge). Create a new wallet and <strong>write down your seed phrase on paper</strong> — if you lose it, your funds are gone forever.</p>
      <h2>Step 2: Buy USDC or USDT</h2>
      <p>You need USDC or USDT on the Solana network (not Ethereum). You can get it from:</p>
      <ul>
        <li><strong>Binance</strong> — available in most countries. Buy USDC or USDT and withdraw to your Phantom address on the Solana network.</li>
        <li><strong>OKX</strong> — similar process, widely available in the Caucasus and Turkey.</li>
        <li><strong>Coinbase</strong> — available in some countries, has a native Solana USDC option.</li>
      </ul>
      <p>When withdrawing from an exchange, always select "Solana" as the network — not Ethereum or BEP-20. Sending on the wrong network means lost funds.</p>
      <h2>Step 3: Deposit to RaiseGG</h2>
      <p>Connect your Phantom wallet on the RaiseGG Wallet page. Click "Deposit", enter the amount, and approve the transaction in Phantom. Your RaiseGG balance updates within a few seconds.</p>
      <h2>How Much Should I Start With?</h2>
      <p>$10–$20 is plenty to start. You can enter matches for as little as $2. Don't deposit more than you're comfortable competing with.</p>
      <h2>Is It Safe?</h2>
      <p>Your USDC or USDT is held in a smart contract vault — not in RaiseGG's bank account. The contract code determines who gets paid; we can't take your money without a verified match result.</p>
    `,
  },
  {
    slug:         'dota2-stake-matches-armenia-azerbaijan',
    title:        'Dota 2 Stake Matches for Armenian and Azerbaijani Players',
    description:  'How players from Armenia and Azerbaijan can compete in Dota 2 stake matches on RaiseGG and win USDC or USDT.',
    tag:          'Dota 2',
    publishedAt:  '2025-11-03',
    readTime:     4,
    relatedLinks: [{ href: '/dota2-platform-armenia', label: 'Dota 2 in Armenia' }, { href: '/games/dota2', label: 'Dota 2' }],
    content: `
      <p>The Caucasus has some of the world's most dedicated Dota 2 players — and almost no platform that lets you profit from your skills. RaiseGG changes that for Armenia and Azerbaijan.</p>
      <h2>Getting Started</h2>
      <p>You need a Steam account with at least 100 hours of Dota 2. Connect Steam on RaiseGG, set up your Phantom wallet, and deposit USDC or USDT. The registration process takes under 5 minutes.</p>
      <h2>How Dota 2 Matches Work on RaiseGG</h2>
      <p>Unlike CS2 (which uses automatic server verification), Dota 2 matches are verified by match ID submission. After your match ends, you submit the Dota 2 match ID in your active match page, and our system verifies the result via Steam API within seconds.</p>
      <h2>What Makes a Valid Match?</h2>
      <ul>
        <li>Both players must be present in the submitted match</li>
        <li>The match must have lasted at least 10 minutes</li>
        <li>The match must have been played after the stake was created</li>
        <li>Lobby type must be ranked or unranked (not bot matches)</li>
      </ul>
      <h2>Ping and Region</h2>
      <p>We recommend the EU East or Middle East server regions for Armenian and Azerbaijani players to get the best latency for your matches.</p>
    `,
  },
  {
    slug:         'raisegg-smart-contract-security',
    title:        'How RaiseGG\'s Smart Contract Keeps Your Funds Safe',
    description:  'A plain-English explanation of how the RaiseGG Anchor program works — and why no one, not even us, can take your stake.',
    tag:          'Tech',
    publishedAt:  '2025-11-10',
    readTime:     5,
    relatedLinks: [{ href: '/about', label: 'About RaiseGG' }, { href: '/dashboard/wallet', label: 'Wallet' }],
    content: `
      <p>When you stake $20 on a match, where does that money actually go? The answer is: a Solana smart contract vault that neither we nor you can access until a verified result arrives.</p>
      <h2>What is a PDA Vault?</h2>
      <p>A PDA (Program Derived Address) is an on-chain account controlled entirely by program logic — not by any private key. When you create a match, your USDC or USDT is transferred to a PDA vault specific to that match. The vault address is deterministic (derived from the match ID and program ID), so anyone can verify it exists on-chain.</p>
      <h2>Who Can Release the Funds?</h2>
      <p>Only the smart contract's <code>resolve_match</code> instruction can release funds — and it only fires when called by the RaiseGG authority wallet with a valid winner. The authority wallet is controlled by our backend, but the contract enforces the rules: 90% to the winner's wallet, 10% to the treasury. There's no "admin drain" function.</p>
      <h2>What If RaiseGG Goes Down?</h2>
      <p>If our servers went offline mid-match, the funds would remain locked in the vault. We have a <code>cancel_match</code> instruction that refunds both players — this is what runs when matches expire. In a worst-case scenario, we can push a match cancellation directly on-chain.</p>
      <h2>Audits and Open Source</h2>
      <p>The Anchor program source code is available for review. We plan to commission a third-party audit before reaching significant TVL (total value locked) on the platform.</p>
    `,
  },
  {
    slug:         'first-tournament-raisegg',
    title:        'How Tournaments Work on RaiseGG — Entry, Format, Prizes',
    description:  'Everything you need to know about competing in RaiseGG tournaments — from entry requirements to prize pool distribution.',
    tag:          'Guide',
    publishedAt:  '2025-11-17',
    readTime:     4,
    relatedLinks: [{ href: '/tournaments', label: 'Tournaments' }, { href: '/play', label: 'Play Now' }],
    content: `
      <p>Beyond 1v1 stake matches, RaiseGG hosts structured tournaments with prize pools funded by entry fees and platform contributions. Here's how to compete.</p>
      <h2>Finding Tournaments</h2>
      <p>All upcoming and live tournaments are listed on the Tournaments page. You'll see the game, format, entry fee, prize pool, and how many spots remain. Filter by game to find what you're looking for.</p>
      <h2>Entry Requirements</h2>
      <p>Each tournament lists its own eligibility requirements — usually a minimum ELO and sometimes a maximum stake history requirement to ensure fair brackets. You must be logged in and have sufficient balance to cover the entry fee.</p>
      <h2>Prize Pool Distribution</h2>
      <p>Prize pools are typically distributed as: 50% to 1st place, 30% to 2nd, 20% to 3rd (for 8-player brackets). Larger tournaments may pay deeper. Exact distribution is listed on each tournament's detail page before you register.</p>
      <h2>Match Format</h2>
      <p>Most RaiseGG tournaments run as single-elimination or double-elimination brackets. CS2 matches use our game server (automatic result detection). Dota 2 requires match ID submission after each round.</p>
      <h2>Payouts</h2>
      <p>Winnings are credited to your RaiseGG balance immediately after bracket completion. Withdraw anytime.</p>
    `,
  },
  {
    slug:         'cs2-dota2-stake-balkans',
    title:        'CS2 & Dota 2 Stake Matches for Balkan Players — Full Guide',
    description:  'How players from Serbia, Croatia, Bosnia, Montenegro, Albania and North Macedonia can win USDC or USDT on RaiseGG. Regional guide.',
    tag:          'Guide',
    publishedAt:  '2025-12-01',
    readTime:     5,
    relatedLinks: [{ href: '/cs2-platform-serbia', label: 'CS2 in Serbia' }, { href: '/play', label: 'Play Now' }],
    content: `
      <p>The Western Balkans has one of the highest concentrations of competitive CS2 and Dota 2 talent per capita in Europe — and almost no platform that rewards that skill with real money. RaiseGG was built to change that.</p>
      <h2>Who Is RaiseGG For in the Balkans?</h2>
      <p>Whether you're in Belgrade, Zagreb, Sarajevo, Podgorica, Tirana, Skopje, or anywhere in the region, RaiseGG gives you access to USDC/USDT stake matches for CS2, Dota 2 and Deadlock. No third-party payment processors. No country-specific restrictions. Just a Steam account and a Phantom wallet.</p>
      <h2>Getting USDC or USDT in the Balkans</h2>
      <p>USDC and USDT on Solana are available through Binance, OKX and most major exchanges that operate in the region. The process: create an exchange account, buy USDC or USDT, withdraw to Solana network into a Phantom wallet, then deposit to RaiseGG. Total time: under 10 minutes.</p>
      <h2>Playing CS2 vs Dota 2</h2>
      <p><strong>CS2:</strong> Matches are played on RaiseGG dedicated servers — you'll receive a connect string after both players are ready. Results are recorded automatically. No match ID required.</p>
      <p><strong>Dota 2:</strong> Play your match in the Dota 2 client (EU West or EU East server for lowest ping). After the game ends, paste the match ID into your active match on RaiseGG. Payout follows within seconds of verification.</p>
      <h2>Community</h2>
      <p>Our Telegram has a Balkan community channel where you can find opponents, discuss meta, and get support. Join at t.me/raisegg.</p>
    `,
  },
  {
    slug:         'cs2-stake-platform-central-asia',
    title:        'CS2 Stake Matches in Central Asia — Kazakhstan, Uzbekistan & Beyond',
    description:  'A guide for CS2 players in Kazakhstan, Uzbekistan, Kyrgyzstan and Tajikistan on how to join RaiseGG and compete for real USDC/USDT.',
    tag:          'CS2',
    publishedAt:  '2025-12-08',
    readTime:     4,
    relatedLinks: [{ href: '/cs2-platform-kazakhstan', label: 'CS2 in Kazakhstan' }, { href: '/play', label: 'Play Now' }],
    content: `
      <p>Central Asia has a large and growing competitive gaming scene — but almost no financial infrastructure built around it. RaiseGG opens stake competition to players across Kazakhstan, Uzbekistan, Kyrgyzstan, Tajikistan, and Turkmenistan.</p>
      <h2>Why Central Asian Players Choose RaiseGG</h2>
      <p>Most Western esports platforms require payment methods that aren't widely available in Central Asia. RaiseGG only needs a Steam account and USDC or USDT on Solana — both globally accessible. Binance is widely used across the region and supports easy on-ramps for both.</p>
      <h2>Server Recommendations</h2>
      <p>For CS2 stake matches, we recommend testing your ping to our servers before committing to a high-stakes match. Players in Kazakhstan typically get best results on CIS-region servers. Our dedicated CS2 servers for stake matches aim to minimise latency for all served regions.</p>
      <h2>Depositing from Central Asia</h2>
      <ol>
        <li>Create a Binance account (available in KZ, UZ, KG, TJ)</li>
        <li>Buy USDC or USDT — select Solana as the withdrawal network</li>
        <li>Install Phantom wallet (phantom.app)</li>
        <li>Withdraw USDC or USDT from Binance to your Phantom address</li>
        <li>Connect Phantom to RaiseGG and deposit from the Wallet page</li>
      </ol>
      <h2>Minimum Stake</h2>
      <p>You can start with as little as $2 per match. New players start at 1000 ELO (Silver tier) — the minimum stake for Silver is low, making it easy to start without risk exposure.</p>
    `,
  },
  {
    slug:         'raisegg-vs-faceit-vs-esea',
    title:        'RaiseGG vs FACEIT vs ESEA — What\'s the Difference?',
    description:  'How RaiseGG compares to FACEIT and ESEA for competitive CS2 players — and why staking adds a dimension neither platform has.',
    tag:          'CS2',
    publishedAt:  '2025-11-24',
    readTime:     5,
    relatedLinks: [{ href: '/games/cs2', label: 'CS2 on RaiseGG' }, { href: '/play', label: 'Play Now' }],
    content: `
      <p>If you're a serious CS2 player, you've heard of FACEIT and ESEA. Here's how RaiseGG fits alongside them — and what it offers that they don't.</p>
      <h2>FACEIT</h2>
      <p>FACEIT is the world's largest competitive CS2 platform. It offers ranked matchmaking (Elo-based), premium servers, and a large player base. Its biggest advantage is volume — you'll find a game at any hour. The limitation: no financial stake. Winning means rank points, not money.</p>
      <h2>ESEA</h2>
      <p>ESEA targets the North American market primarily. It's known for its anti-cheat technology and league play structure. Less relevant for Caucasus and Turkish players due to ping.</p>
      <h2>RaiseGG</h2>
      <p>RaiseGG isn't trying to replace FACEIT's matchmaking volume. Instead, it adds a stake layer: when you want to put something on the line against a specific opponent, RaiseGG is where you do it. The combination that many players use: FACEIT for practice volume, RaiseGG when they want real stakes.</p>
      <h2>Key Differences</h2>
      <ul>
        <li><strong>Financial rewards</strong> — only RaiseGG pays in real USDC/USDT</li>
        <li><strong>Region focus</strong> — RaiseGG is built for Caucasus, Turkey, and Balkans; FACEIT is global</li>
        <li><strong>Format</strong> — FACEIT is 5v5 matchmaking; RaiseGG is 1v1 stake matches and tournaments</li>
        <li><strong>Account requirements</strong> — RaiseGG requires Steam only; FACEIT requires email + account</li>
        <li><strong>Payout speed</strong> — RaiseGG pays in seconds via Solana; FACEIT has no payout</li>
      </ul>
      <p>The short version: play FACEIT for rank. Play RaiseGG when you want to earn.</p>
    `,
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}

export function getBlogPostSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug)
}

// ─── Supabase AI posts (server-only) ─────────────────────────────────────────

type AIRow = {
  slug: string
  title: string
  description: string
  tag: string
  published_at: string
  read_time: number
  content: string
  related_links: { href: string; label: string }[] | null
}

function rowToPost(r: AIRow): BlogPost {
  return {
    slug:         r.slug,
    title:        r.title,
    description:  r.description,
    tag:          r.tag,
    publishedAt:  r.published_at,
    readTime:     r.read_time,
    content:      r.content,
    relatedLinks: r.related_links ?? [],
  }
}

export async function getAIBlogPosts(): Promise<BlogPost[]> {
  try {
    const { createServiceClient } = await import('@/lib/supabase')
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('ai_blog_posts')
      .select('slug,title,description,tag,published_at,read_time,content,related_links')
      .order('published_at', { ascending: false })
    return (data ?? []).map(rowToPost)
  } catch {
    return []
  }
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const ai = await getAIBlogPosts()
  const all = [...BLOG_POSTS, ...ai]
  // Deduplicate by slug, static posts win
  const seen = new Set<string>()
  const deduped: BlogPost[] = []
  for (const post of all) {
    if (!seen.has(post.slug)) {
      seen.add(post.slug)
      deduped.push(post)
    }
  }
  return deduped.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export async function getBlogPostWithAI(slug: string): Promise<BlogPost | undefined> {
  const static_ = getBlogPost(slug)
  if (static_) return static_
  try {
    const { createServiceClient } = await import('@/lib/supabase')
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('ai_blog_posts')
      .select('slug,title,description,tag,published_at,read_time,content,related_links')
      .eq('slug', slug)
      .single()
    return data ? rowToPost(data) : undefined
  } catch {
    return undefined
  }
}
