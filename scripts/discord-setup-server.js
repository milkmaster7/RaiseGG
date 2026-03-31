/**
 * Set up RaiseGG Discord server — channels, roles, welcome messages, invite link
 * Uses browser CDP to make API calls through Discord's authenticated session
 */
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const GUILD_ID = '1488243386384388127';

async function getPageWs() {
  const res = await fetch('http://localhost:9222/json/list');
  const tabs = await res.json();
  const discord = tabs.find(t => t.type === 'page' && t.url.includes('discord.com'));
  return discord ? discord.webSocketDebuggerUrl : null;
}

async function send(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 100000);
  return new Promise((resolve, reject) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.removeListener('message', handler);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { ws.removeListener('message', handler); reject(new Error('timeout')); }, 30000);
  });
}

async function evaluate(ws, expression) {
  const result = await send(ws, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'eval error');
  return result.result.value;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const wsUrl = await getPageWs();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));
  console.log('Connected to browser');

  // First, get the token from browser context
  const token = await evaluate(ws, `
    (() => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const t = iframe.contentWindow.localStorage.getItem('token');
      iframe.remove();
      return t ? t.replace(/"/g, '') : null;
    })()
  `);

  if (!token) { console.error('Could not get token from browser'); process.exit(1); }
  console.log('Got token from browser');

  // Helper: make Discord API calls through the browser
  async function discordApi(endpoint, method = 'GET', body = null) {
    const bodyStr = body ? JSON.stringify(body).replace(/\\/g, '\\\\').replace(/'/g, "\\'") : 'null';
    const result = await evaluate(ws, `
      (async () => {
        const opts = {
          method: '${method}',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': '${token}',
          },
          credentials: 'include'
        };
        ${body ? `opts.body = '${bodyStr}';` : ''}
        const res = await fetch('https://discord.com/api/v9${endpoint}', opts);
        const data = await res.json();
        return JSON.stringify({ status: res.status, data });
      })()
    `);
    const parsed = JSON.parse(result);
    if (parsed.status >= 400 && parsed.status !== 429) {
      console.log('API Error:', endpoint, parsed.status, JSON.stringify(parsed.data));
    }
    if (parsed.status === 429) {
      const wait = (parsed.data.retry_after || 5) * 1000 + 500;
      console.log('Rate limited, waiting', Math.ceil(wait/1000), 'seconds...');
      await sleep(wait);
      return discordApi(endpoint, method, body); // Retry
    }
    return parsed.data;
  }

  // 1. Delete default channels
  console.log('\n--- Deleting default channels ---');
  const existingChannels = await discordApi(`/guilds/${GUILD_ID}/channels`);
  for (const ch of existingChannels) {
    console.log('Deleting:', ch.name);
    await discordApi(`/channels/${ch.id}`, 'DELETE');
    await sleep(600);
  }

  // 2. Create categories and channels
  console.log('\n--- Creating channels ---');
  const categories = [
    {
      name: '📢 INFORMATION',
      channels: [
        { name: 'announcements', topic: 'Platform updates, features, and news' },
        { name: 'rules', topic: 'Server rules — read before posting' },
        { name: 'how-it-works', topic: 'How RaiseGG works: escrow, matches, payouts' },
        { name: 'faq', topic: 'Frequently asked questions' },
      ],
    },
    {
      name: '💬 COMMUNITY',
      channels: [
        { name: 'general', topic: 'General discussion' },
        { name: 'introductions', topic: 'New here? Introduce yourself!' },
        { name: 'memes', topic: 'Gaming memes and clips' },
        { name: 'clips-highlights', topic: 'Share your best plays' },
      ],
    },
    {
      name: '🎮 GAMES',
      channels: [
        { name: 'cs2', topic: 'Counter-Strike 2 discussion, LFG, tips' },
        { name: 'dota2', topic: 'Dota 2 discussion, LFG, tips' },
        { name: 'deadlock', topic: 'Deadlock discussion, LFG, tips' },
      ],
    },
    {
      name: '⚔️ MATCHES',
      channels: [
        { name: 'find-opponent', topic: 'Find someone to play against' },
        { name: 'match-results', topic: 'Post your match results and wins' },
        { name: 'team-recruitment', topic: 'Recruit players for your team' },
      ],
    },
    {
      name: '🏆 TOURNAMENTS',
      channels: [
        { name: 'tournament-announcements', topic: 'Upcoming tournaments and sign-ups' },
        { name: 'tournament-results', topic: 'Brackets and results' },
      ],
    },
    {
      name: '🌍 REGIONAL',
      channels: [
        { name: 'türkiye', topic: 'Türk oyuncular için' },
        { name: 'россия-снг', topic: 'Для русскоязычных игроков' },
        { name: 'balkans', topic: 'Serbia, Romania, Bulgaria, Greece, Croatia' },
        { name: 'caucasus', topic: 'Georgia, Armenia, Azerbaijan' },
      ],
    },
    {
      name: '💰 TRADING',
      channels: [
        { name: 'payouts', topic: 'USDC payout discussion' },
        { name: 'referrals', topic: 'Share referral link — earn $1 per signup' },
      ],
    },
    {
      name: '🔊 VOICE',
      channels: [
        { name: 'General Voice', type: 2 },
        { name: 'CS2 Lobby', type: 2 },
        { name: 'Dota 2 Lobby', type: 2 },
        { name: 'Deadlock Lobby', type: 2 },
      ],
    },
    {
      name: '🛠️ SUPPORT',
      channels: [
        { name: 'support', topic: 'Need help? Ask here' },
        { name: 'bug-reports', topic: 'Report bugs and issues' },
        { name: 'feature-requests', topic: 'Suggest new features' },
      ],
    },
  ];

  const channelMap = {};

  for (const cat of categories) {
    console.log('Category:', cat.name);
    const category = await discordApi(`/guilds/${GUILD_ID}/channels`, 'POST', {
      name: cat.name,
      type: 4,
    });
    await sleep(600);

    for (const ch of cat.channels) {
      const chType = ch.type || 0;
      console.log('  Channel:', ch.name, chType === 2 ? '(voice)' : '');
      const created = await discordApi(`/guilds/${GUILD_ID}/channels`, 'POST', {
        name: ch.name,
        type: chType,
        parent_id: category.id,
        topic: ch.topic || null,
      });
      channelMap[ch.name] = created.id;
      await sleep(600);
    }
  }

  // 3. Create roles
  console.log('\n--- Creating roles ---');
  const roles = [
    { name: 'Admin', color: 0xe74c3c, permissions: '8', hoist: true },
    { name: 'Moderator', color: 0x3498db, permissions: '1099511627766', hoist: true },
    { name: 'Verified Player', color: 0x2ecc71, hoist: true },
    { name: 'CS2', color: 0xf39c12 },
    { name: 'Dota 2', color: 0xe91e63 },
    { name: 'Deadlock', color: 0x9b59b6 },
    { name: 'Tournament Winner', color: 0xffd700, hoist: true },
    { name: '🇹🇷 Turkey', color: 0xe30a17 },
    { name: '🇷🇺 Russia/CIS', color: 0x0039a6 },
    { name: '🇬🇪 Georgia', color: 0xff0000 },
    { name: '🇷🇴 Romania', color: 0x002b7f },
    { name: '🇷🇸 Serbia', color: 0x004aad },
    { name: '🇧🇬 Bulgaria', color: 0x009b74 },
    { name: '🇬🇷 Greece', color: 0x0d5eaf },
    { name: '🇦🇲 Armenia', color: 0xd90012 },
    { name: '🇦🇿 Azerbaijan', color: 0x00b5e2 },
    { name: '🇰🇿 Kazakhstan', color: 0x00afca },
    { name: '🇺🇦 Ukraine', color: 0x005bbb },
    { name: '🇵🇱 Poland', color: 0xdc143c },
  ];

  for (const role of roles) {
    console.log('  Role:', role.name);
    await discordApi(`/guilds/${GUILD_ID}/roles`, 'POST', {
      name: role.name,
      color: role.color,
      permissions: role.permissions || '0',
      hoist: role.hoist || false,
      mentionable: true,
    });
    await sleep(400);
  }

  // 4. Post welcome messages
  console.log('\n--- Posting welcome messages ---');

  const messages = {
    announcements: `# 🎮 Welcome to RaiseGG!\n\n**RaiseGG** is the competitive esports stake platform for **CS2**, **Dota 2**, and **Deadlock**.\n\n🔒 **Blockchain Escrow** — Your money is locked in a Solana smart contract. No scams, ever.\n⚡ **Instant Payouts** — Win a match, get paid in USDC instantly.\n🏆 **Free Daily Tournaments** — $5 USDC prize pool, zero entry fee.\n📊 **ELO Ranking** — Play against your skill level.\n\n👉 **Get started:** https://raisegg.com\n🎁 **First 50 players get $5 free USDC:** https://raisegg.com/promo\n\nJoin a match. Prove your skill. Get paid.`,

    rules: `# 📋 Server Rules\n\n**1.** Be respectful. No racism, sexism, or harassment.\n**2.** No spam or self-promotion without permission.\n**3.** No cheating discussion — zero tolerance.\n**4.** Keep channels on-topic.\n**5.** No scam links or phishing.\n**6.** English, Turkish, and Russian are welcome.\n**7.** Report issues in #support.\n**8.** Have fun and play fair!\n\n⚠️ Breaking rules = warn → mute → ban`,

    'how-it-works': `# 🔒 How RaiseGG Works\n\n## 1. Connect Steam\nSign up at https://raisegg.com and connect your Steam account.\n\n## 2. Find a Match\nChoose your game (CS2, Dota 2, Deadlock) and stake ($2–$100).\n\n## 3. Blockchain Escrow\nBoth players deposit USDC into a **Solana smart contract**. Nobody touches the money until the match ends.\n\n## 4. Play\n- **CS2**: 1v1 on 128-tick servers with anti-cheat\n- **Dota 2**: Submit Match ID — auto-verified via Steam API\n- **Deadlock**: Same as Dota 2\n\n## 5. Get Paid\nWinner gets **90%** of the pot. Instant USDC payout.\n\n🎁 Free daily tournaments if you don't want to stake.`,

    general: `Hey everyone! 👋 Welcome to **RaiseGG** — where competitive CS2, Dota 2, and Deadlock players find matches, talk strats, and compete for real money.\n\n**Quick links:**\n🎮 Play: https://raisegg.com/play\n🏆 Tournaments: https://raisegg.com/tournaments\n📊 Leaderboard: https://raisegg.com/leaderboard\n🎁 $5 Free Promo: https://raisegg.com/promo\n\nGrab your game role and regional role and jump in!`,

    faq: `# ❓ Frequently Asked Questions\n\n**Q: Is this gambling?**\nNo. You play the match yourself. It's skill-based competition with stakes.\n\n**Q: How do I get paid?**\nWinnings are paid in USDC (stablecoin) instantly after the match.\n\n**Q: Is it safe?**\nYes. Funds are held in a Solana smart contract. Neither player can run with the money.\n\n**Q: What's the minimum stake?**\n$2 USDC.\n\n**Q: Do I need a wallet?**\nNot to start. You can deposit and play with your balance. Withdraw when you want.\n\n**Q: Is there anti-cheat?**\nYes. VAC + MatchZy for CS2. Steam API verification for Dota 2 and Deadlock.\n\n**Q: Can I play for free?**\nYes! Free daily tournaments with $5 USDC prize pools.`,
  };

  for (const [channelName, content] of Object.entries(messages)) {
    const channelId = channelMap[channelName];
    if (!channelId) { console.log('  Channel not found:', channelName); continue; }
    console.log('  Posting to:', channelName);
    await discordApi(`/channels/${channelId}/messages`, 'POST', { content });
    await sleep(800);
  }

  // 5. Create permanent invite link
  console.log('\n--- Creating invite link ---');
  const generalId = channelMap['general'];
  if (generalId) {
    const invite = await discordApi(`/channels/${generalId}/invites`, 'POST', {
      max_age: 0,
      max_uses: 0,
      unique: true,
    });
    console.log('✅ Permanent invite: https://discord.gg/' + invite.code);

    // Save server info
    const info = {
      guildId: GUILD_ID,
      inviteCode: invite.code,
      inviteUrl: 'https://discord.gg/' + invite.code,
      channels: channelMap,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(__dirname, 'discord-server-info.json'), JSON.stringify(info, null, 2));
    console.log('Server info saved to discord-server-info.json');
  }

  // 6. Update server settings
  console.log('\n--- Updating server settings ---');
  await discordApi(`/guilds/${GUILD_ID}`, 'PATCH', {
    description: 'Competitive esports stake platform — CS2, Dota 2, Deadlock. Blockchain escrow. Free tournaments daily.',
    verification_level: 1, // Low - must have verified email
    default_message_notifications: 1, // Only mentions
    explicit_content_filter: 2, // Scan all
  });

  console.log('\n✅ RaiseGG Discord server fully set up!');
  ws.close();
}

run().catch(e => console.error('ERROR:', e.message));
