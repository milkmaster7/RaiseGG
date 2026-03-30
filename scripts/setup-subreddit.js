const fs = require('fs');
const https = require('https');

const envContent = fs.readFileSync(require('path').join(__dirname, '..', '.env.local'), 'utf-8');
const TOKEN = envContent.match(/REDDIT_ACCESS_TOKEN=(.+)/)[1].trim();
const SUB = 'RaiseGG';

function redditReq(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? new URLSearchParams(body).toString() : '';
    const options = {
      hostname: 'oauth.reddit.com',
      path: endpoint,
      method,
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'User-Agent': 'web:com.raisegg.app:v1.0.0',
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(bodyStr);
    req.end();
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // 1. Create post flairs
  console.log('Creating flairs...');
  const flairs = [
    { text: 'Match Result', css: 'match', bg: '#FF4500', tc: 'light' },
    { text: 'Tournament', css: 'tournament', bg: '#FFD700', tc: 'dark' },
    { text: 'Announcement', css: 'announcement', bg: '#0079D3', tc: 'light' },
    { text: 'Tips & Strategy', css: 'tips', bg: '#46D160', tc: 'light' },
    { text: 'Bug Report', css: 'bug', bg: '#EA0027', tc: 'light' },
    { text: 'Discussion', css: 'discussion', bg: '#014980', tc: 'light' },
    { text: 'Clip / Highlight', css: 'clip', bg: '#7B61FF', tc: 'light' },
    { text: 'Leaderboard', css: 'leaderboard', bg: '#FF8717', tc: 'light' },
    { text: 'Giveaway', css: 'giveaway', bg: '#00A6A6', tc: 'light' },
    { text: 'Question', css: 'question', bg: '#EDEFF1', tc: 'dark' },
    { text: 'Clutch Play', css: 'clutch', bg: '#CC3600', tc: 'light' },
    { text: 'Update / Patch', css: 'update', bg: '#349E48', tc: 'light' },
  ];

  for (const f of flairs) {
    try {
      await redditReq('POST', '/r/' + SUB + '/api/flairtemplate_v2', {
        api_type: 'json',
        flair_type: 'LINK_FLAIR',
        text: f.text,
        css_class: f.css,
        background_color: f.bg,
        text_color: f.tc,
        mod_only: 'false',
        allowable_content: 'all',
      });
      console.log('  + ' + f.text);
    } catch (e) {
      console.log('  x ' + f.text + ': ' + e.message);
    }
    await sleep(500);
  }

  // 2. Set rules
  console.log('\nSetting rules...');
  const rules = [
    { short: 'Be Respectful', desc: 'No harassment, hate speech, or personal attacks.' },
    { short: 'No Cheating Discussion', desc: 'Do not discuss, promote, or share cheats, exploits, or hacks.' },
    { short: 'No Spam', desc: 'Limited self-promotion is OK. No repeated spam.' },
    { short: 'All Languages Welcome', desc: 'English preferred but all languages OK.' },
    { short: 'No Scam Accusations Without Proof', desc: 'Contact support for disputes. No unproven public accusations.' },
    { short: 'Keep It Relevant', desc: 'Posts about RaiseGG, competitive gaming, esports staking, CS2, Dota 2, Deadlock.' },
  ];

  for (const r of rules) {
    try {
      await redditReq('POST', '/r/' + SUB + '/api/add_subreddit_rule', {
        api_type: 'json',
        kind: 'all',
        short_name: r.short,
        description: r.desc,
        violation_reason: r.short,
      });
      console.log('  + Rule: ' + r.short);
    } catch (e) {
      console.log('  x ' + r.short + ': ' + e.message);
    }
    await sleep(500);
  }

  // 3. AutoModerator
  console.log('\nSetting up AutoModerator...');
  const automod = [
    '---',
    '# Welcome new users',
    'type: submission',
    'author:',
    '  is_contributor: false',
    '  account_age: "< 1 days"',
    'comment: |',
    '  Welcome to r/RaiseGG! Check out [raisegg.com](https://raisegg.com) to get started.',
    '  Free daily tournaments, no deposit needed!',
    '---',
    '# Remove very short posts',
    'type: submission',
    'body_shorter_than: 10',
    'title_shorter_than: 10',
    'action: filter',
    'action_reason: "Short post needs review"',
  ].join('\n');

  try {
    await redditReq('POST', '/r/' + SUB + '/api/wiki/edit', {
      page: 'config/automoderator',
      content: automod,
      reason: 'Initial AutoMod setup',
    });
    console.log('  + AutoModerator configured');
  } catch (e) {
    console.log('  x AutoMod: ' + e.message);
  }

  // 4. Get flair IDs for posting
  let flairMap = {};
  try {
    const flairList = await redditReq('GET', '/r/' + SUB + '/api/link_flair_v2');
    if (Array.isArray(flairList)) {
      for (const f of flairList) {
        flairMap[f.css_class || f.text.toLowerCase()] = f.id;
      }
    }
  } catch {}
  console.log('\nFlairs:', Object.keys(flairMap).join(', '));

  // 5. Post welcome + initial content
  console.log('\nPosting content...');
  const posts = [
    {
      title: 'Welcome to r/RaiseGG - The Free Esports Staking Platform!',
      text: '# Welcome to r/RaiseGG!\n\nThis is the official Reddit community for **RaiseGG** - the free esports staking platform for CS2, Dota 2, and Deadlock.\n\n## What is RaiseGG?\n\nRaiseGG lets you compete in **1v1 matches and tournaments** for real prizes. Powered by **Solana blockchain escrow** - your funds are locked in a smart contract until the match ends, then auto-released to the winner.\n\n### Key Features:\n- **Free daily tournaments** - no deposit needed, win real USDC\n- **1v1 stake matches** - $1 to $50 per match\n- **City & country leaderboards** - represent your hometown\n- **Achievements system** - unlock rewards as you play\n- **Anti-cheat** on all servers\n- **Instant payouts** via Solana\n\n### Games:\n- Counter-Strike 2 (1v1, 2v2, 5v5)\n- Dota 2 (1v1 mid, full matches)\n- Deadlock (1v1)\n\n## Getting Started\n1. Visit [raisegg.com](https://raisegg.com)\n2. Connect your Steam account\n3. Join a free tournament or challenge someone\n4. Win USDC prizes!\n\n## Links\n- [Website](https://raisegg.com)\n- [Discord](https://discord.gg/ErWPgH7gd6)\n- [Telegram](https://t.me/raisegg)\n\n---\n\n**Drop a comment and introduce yourself!** What game do you play? What country are you from?',
      flair: 'announcement',
      sticky: true,
    },
    {
      title: 'Daily Free Tournament - No Deposit Required, Win Real USDC!',
      text: '**Every day at 3 PM UTC** we run a free tournament.\n\n**Format:** Single elimination bracket\n**Prize:** $5 USDC to the winner\n**Games:** CS2 1v1 or Dota 2 1v1 mid\n**Entry:** Free - just sign up\n\nBest way to try the platform risk-free.\n\n[Sign up for today\'s tournament](https://raisegg.com/tournaments)\n\n---\n\n*Who\'s joining today?*',
      flair: 'tournament',
      sticky: true,
    },
    {
      title: 'How RaiseGG Works - Blockchain Escrow Explained',
      text: '## The Problem\nIn wager matches, you have to trust the other player to pay. Most don\'t.\n\n## The Solution: Blockchain Escrow\n1. Both players deposit USDC into a **Solana smart contract**\n2. Money is **locked** - nobody can withdraw\n3. Match plays on anti-cheat servers\n4. Result verified automatically\n5. Winner gets both deposits\n\n## Why Solana?\n- **Fast** - 400ms settlement\n- **Cheap** - near-zero fees\n- **USDC** - stablecoin, no volatility\n\n## Is It Safe?\n- Smart contract handles all funds\n- Anti-cheat on all servers\n- Dispute system for edge cases\n\n[Try it free](https://raisegg.com)\n\n---\n\n*Questions? Ask below.*',
      flair: 'announcement',
    },
    {
      title: 'Tips: How to Win More 1v1 Mid Matches in Dota 2',
      text: '## Creep Aggro\n- Click enemy hero near your ranged creep to pull aggro\n- Use this to manipulate wave position\n\n## Hero Picks\n- **QoP** - strong all-around, dagger kill potential\n- **Ember Spirit** - Flame Guard dominates early\n- **Huskar** - counter-pick into magic damage mids\n\n## General Tips\n1. **Block the first wave** - better block = lane advantage\n2. **Trade efficiently** - don\'t tank 3 creep hits for 1 hero hit\n3. **Bottle timing** - control runes, use bottle immediately\n4. **Rune fights matter** - even in 1v1\n\nPractice in free daily tournaments on [raisegg.com](https://raisegg.com/tournaments)\n\n---\n\n*What\'s your go-to 1v1 mid hero?*',
      flair: 'tips',
    },
    {
      title: 'Weekly Leaderboard - Top Players This Week',
      text: 'The leaderboard resets every Monday. Compete in matches and tournaments to climb.\n\n**Top 3 weekly players get bonus USDC rewards!**\n\nCheck the live leaderboard: [raisegg.com/leaderboard](https://raisegg.com/leaderboard)\n\n---\n\n*What\'s your current rank? Drop your username below!*',
      flair: 'leaderboard',
    },
    {
      title: 'Which Balkan country has the best CS2 players? We\'re tracking it',
      text: 'Started a city/country leaderboard on RaiseGG. Free daily tournaments, $5 USDC prize.\n\nSerbia, Romania, Bulgaria, Greece, Croatia, Bosnia, North Macedonia - who\'s got the best players?\n\nYour country could be #1 right now.\n\n[Join and represent](https://raisegg.com/tournaments)\n\n---\n\n*Where are you from? Claim your country below.*',
      flair: 'discussion',
    },
    {
      title: 'CS2 1v1 Tips: Common Mistakes That Cost You Matches',
      text: 'After watching hundreds of 1v1s on RaiseGG, here are the most common mistakes:\n\n1. **Over-peeking** - taking fights you don\'t need to take\n2. **Bad economy** - force buying when you should save\n3. **Predictable patterns** - always pushing the same angle\n4. **Ignoring utility** - not using smokes/flashes in 1v1\n5. **Tilting after round 1** - mental game is everything\n\n**Fix these and you\'ll win 60%+ of your 1v1s.**\n\nPractice free: [raisegg.com/tournaments](https://raisegg.com/tournaments)\n\n---\n\n*What mistake do you see the most?*',
      flair: 'tips',
    },
  ];

  for (let i = 0; i < posts.length; i++) {
    if (i > 0) await sleep(11000); // Rate limit safe

    const p = posts[i];
    try {
      const params = {
        sr: SUB,
        kind: 'self',
        title: p.title,
        text: p.text,
        api_type: 'json',
      };
      if (flairMap[p.flair]) {
        params.flair_id = flairMap[p.flair];
      }

      const result = await redditReq('POST', '/api/submit', params);
      const data = result?.json?.data;
      if (data?.url) {
        console.log('  + ' + p.title.substring(0, 50) + ' -> ' + data.url);

        // Distinguish as mod
        await redditReq('POST', '/api/distinguish', { id: data.name, how: 'yes' });

        // Sticky if requested
        if (p.sticky) {
          await redditReq('POST', '/api/set_subreddit_sticky', {
            id: data.name,
            state: 'true',
          });
          console.log('    (stickied)');
        }
      } else {
        const errors = result?.json?.errors;
        console.log('  x ' + p.title.substring(0, 40) + ': ' + JSON.stringify(errors || result).substring(0, 200));
      }
    } catch (e) {
      console.log('  x ' + p.title.substring(0, 40) + ': ' + e.message);
    }
  }

  // 6. Update subreddit settings
  console.log('\nUpdating subreddit appearance...');
  try {
    await redditReq('POST', '/r/' + SUB + '/api/site_admin', {
      api_type: 'json',
      sr: 't5_' + SUB,
      name: SUB,
      title: 'RaiseGG | Free Esports Staking | CS2 Dota 2 Deadlock',
      public_description: 'Official community for RaiseGG - the free esports staking platform. Compete in CS2, Dota 2 & Deadlock matches for USDC prizes. Blockchain escrow, anti-cheat servers, daily free tournaments. raisegg.com',
      type: 'public',
      link_type: 'any',
      allow_images: 'true',
      allow_videos: 'true',
      show_media: 'true',
      header_title: 'RaiseGG - Stake. Play. Win.',
      submit_text: 'Share your plays, ask questions, or discuss esports staking!',
    });
    console.log('  + Subreddit settings updated');
  } catch (e) {
    console.log('  x Settings: ' + e.message);
  }

  // 7. Create user flairs (city/game/rank)
  console.log('\nCreating user flairs...');
  const userFlairs = [
    { text: 'Istanbul', css: 'istanbul', bg: '#e74c3c', tc: 'light' },
    { text: 'Ankara', css: 'ankara', bg: '#e67e22', tc: 'light' },
    { text: 'Izmir', css: 'izmir', bg: '#f39c12', tc: 'dark' },
    { text: 'Bucharest', css: 'bucharest', bg: '#2980b9', tc: 'light' },
    { text: 'Belgrade', css: 'belgrade', bg: '#8e44ad', tc: 'light' },
    { text: 'Sofia', css: 'sofia', bg: '#27ae60', tc: 'light' },
    { text: 'Athens', css: 'athens', bg: '#2c3e50', tc: 'light' },
    { text: 'Tbilisi', css: 'tbilisi', bg: '#d35400', tc: 'light' },
    { text: 'Baku', css: 'baku', bg: '#16a085', tc: 'light' },
    { text: 'Yerevan', css: 'yerevan', bg: '#c0392b', tc: 'light' },
    { text: 'Moscow', css: 'moscow', bg: '#2c3e50', tc: 'light' },
    { text: 'St Petersburg', css: 'spb', bg: '#3498db', tc: 'light' },
    { text: 'Almaty', css: 'almaty', bg: '#1abc9c', tc: 'light' },
    { text: 'Kyiv', css: 'kyiv', bg: '#f1c40f', tc: 'dark' },
    { text: 'Warsaw', css: 'warsaw', bg: '#e74c3c', tc: 'light' },
    { text: 'Prague', css: 'prague', bg: '#3498db', tc: 'light' },
    { text: 'Zagreb', css: 'zagreb', bg: '#2980b9', tc: 'light' },
    { text: 'Sarajevo', css: 'sarajevo', bg: '#27ae60', tc: 'light' },
    { text: 'Tirana', css: 'tirana', bg: '#e74c3c', tc: 'light' },
    { text: 'Tehran', css: 'tehran', bg: '#2ecc71', tc: 'light' },
    { text: 'CS2', css: 'cs2-user', bg: '#ff6b00', tc: 'light' },
    { text: 'Dota 2', css: 'dota2-user', bg: '#e74c3c', tc: 'light' },
    { text: 'Deadlock', css: 'deadlock-user', bg: '#9b59b6', tc: 'light' },
    { text: 'Bronze', css: 'bronze', bg: '#cd7f32', tc: 'light' },
    { text: 'Silver', css: 'silver', bg: '#c0c0c0', tc: 'dark' },
    { text: 'Gold', css: 'gold', bg: '#ffd700', tc: 'dark' },
    { text: 'Diamond', css: 'diamond', bg: '#00e6ff', tc: 'dark' },
    { text: 'Champion', css: 'champion', bg: '#ff00ff', tc: 'light' },
  ];

  for (const f of userFlairs) {
    try {
      await redditReq('POST', '/r/' + SUB + '/api/flairtemplate_v2', {
        api_type: 'json',
        flair_type: 'USER_FLAIR',
        text: f.text,
        css_class: f.css,
        background_color: f.bg,
        text_color: f.tc,
        text_editable: 'true',
        mod_only: 'false',
      });
      console.log('  + User flair: ' + f.text);
    } catch (e) {
      console.log('  x ' + f.text + ': ' + e.message);
    }
    await sleep(500);
  }

  // 8. Create wiki pages
  console.log('\nCreating wiki pages...');
  const wikiPages = {
    index: '# r/RaiseGG Wiki\n\nWelcome to the official RaiseGG wiki!\n\n## Pages\n\n- [Getting Started](/r/RaiseGG/wiki/getting-started)\n- [How Escrow Works](/r/RaiseGG/wiki/escrow)\n- [Tournaments](/r/RaiseGG/wiki/tournaments)\n- [City Leaderboard](/r/RaiseGG/wiki/city-leaderboard)\n- [FAQ](/r/RaiseGG/wiki/faq)\n\n## Quick Links\n\n- [Play Now](https://raisegg.com/play)\n- [Tournaments](https://raisegg.com/tournaments)\n- [Leaderboard](https://raisegg.com/leaderboard)',
    'getting-started': '# Getting Started with RaiseGG\n\n## Step 1: Create an Account\nVisit [raisegg.com](https://raisegg.com) and sign up.\n\n## Step 2: Try a Free Tournament\nEvery day at 3 PM UTC. No deposit needed. $5 USDC prize.\n\n## Step 3: Play Stake Matches\n1. Choose your game (CS2, Dota 2, Deadlock)\n2. Set your stake ($1-$50 USDC)\n3. Both deposit into blockchain escrow\n4. Play on anti-cheat servers\n5. Winner receives both stakes\n\n## Supported Games\n- CS2 (1v1, 2v2, 5v5)\n- Dota 2 (1v1 Mid)\n- Deadlock (1v1)',
    escrow: '# How Blockchain Escrow Works\n\n## The Problem\nTraditional wager matches rely on trust. Most players don\'t pay.\n\n## The Solution\n1. Both players deposit USDC into a Solana smart contract\n2. Funds are locked — nobody can withdraw\n3. Match plays on anti-cheat servers\n4. Result verified → winner gets paid automatically\n\n## Why Solana?\n- Fast (400ms)\n- Cheap (near-zero fees)\n- USDC stablecoin (no volatility)\n- Works cross-border',
    tournaments: '# Tournaments\n\n## Daily Free Tournament\n- Time: 3 PM UTC every day\n- Format: 8-player single elimination\n- Entry: FREE\n- Prize: $5 USDC\n\n## Themed Nights\n- Monday: Balkan Night\n- Wednesday: Turkish Wednesday\n- Saturday: Championship\n\n[Sign Up](https://raisegg.com/tournaments)',
    'city-leaderboard': '# City Leaderboard\n\nEvery match earns points for your city.\n\n## Points\n- Win: +3 points\n- Tournament win: +10 points\n- Participation: +1 point\n\n## Cities\nIstanbul, Ankara, Bucharest, Belgrade, Sofia, Athens, Tbilisi, Baku, Yerevan, Moscow, Almaty, Kyiv, Warsaw, Prague, Zagreb, Sarajevo, and more.\n\nWeekly reset every Monday.\n\n[View Leaderboard](https://raisegg.com/leaderboard)',
    faq: '# FAQ\n\n**Is RaiseGG free?** Yes! Free daily tournaments.\n\n**What games?** CS2, Dota 2, Deadlock.\n\n**How do I get paid?** USDC on Solana. Instant withdrawal.\n\n**Can I get scammed?** No. Smart contract escrow.\n\n**Do I need KYC?** No. Just a Steam account.\n\n**How do I get a flair?** Click "edit flair" in the sidebar.',
  };

  for (const [page, content] of Object.entries(wikiPages)) {
    try {
      await redditReq('POST', '/r/' + SUB + '/api/wiki/edit', {
        page,
        content,
        reason: 'Initial wiki setup',
      });
      console.log('  + Wiki: ' + page);
    } catch (e) {
      console.log('  x Wiki ' + page + ': ' + e.message);
    }
    await sleep(500);
  }

  console.log('\n=== r/RaiseGG SETUP COMPLETE ===');
  console.log('Visit: https://www.reddit.com/r/RaiseGG/');
}

main().catch(e => console.error(e.message));
