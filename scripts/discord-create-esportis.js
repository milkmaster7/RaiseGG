/**
 * Create esport.is Discord server with full channel structure
 * Uses browser CDP through Brave on port 9222
 */
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

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
      if (msg.id === id) { ws.removeListener('message', handler); resolve(msg.result); }
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
  if (!wsUrl) { console.error('No Discord browser tab'); process.exit(1); }
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));
  console.log('Connected to browser');

  const token = await evaluate(ws, `
    (() => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const t = iframe.contentWindow.localStorage.getItem('token');
      iframe.remove();
      return t ? t.replace(/"/g, '') : null;
    })()
  `);

  async function api(endpoint, method, bodyObj) {
    const randVar = '_api_' + Math.random().toString(36).slice(2, 8);
    if (bodyObj) {
      await evaluate(ws, `window.${randVar} = ${JSON.stringify(JSON.stringify(bodyObj))}`);
    }
    const result = await evaluate(ws, `
      (async () => {
        const opts = {
          method: '${method}',
          headers: { 'Content-Type': 'application/json', 'Authorization': '${token}' },
          credentials: 'include'
        };
        ${bodyObj ? `opts.body = window.${randVar};` : ''}
        const res = await fetch('https://discord.com/api/v9${endpoint}', opts);
        const data = await res.json().catch(() => ({}));
        ${bodyObj ? `delete window.${randVar};` : ''}
        return JSON.stringify({ s: res.status, d: data });
      })()
    `);
    const parsed = JSON.parse(result);
    if (parsed.s === 429) {
      const wait = (parsed.d.retry_after || 5) * 1000 + 500;
      console.log('  Rate limited, waiting', Math.ceil(wait / 1000), 's...');
      await sleep(wait);
      return api(endpoint, method, bodyObj);
    }
    if (parsed.s >= 400) {
      console.log('  API error:', endpoint, parsed.s, JSON.stringify(parsed.d).substring(0, 200));
    }
    return parsed.d;
  }

  // ─── 1. Create server ──────────────────────────────────────────────────
  console.log('Creating esport.is server...');
  const guild = await api('/guilds', 'POST', { name: 'esport.is — Live Esports Hub' });
  if (!guild.id) { console.error('Failed to create guild:', JSON.stringify(guild)); ws.close(); return; }
  console.log('Server created! ID:', guild.id);
  const G = guild.id;
  await sleep(2000);

  // ─── 2. Delete default channels ────────────────────────────────────────
  console.log('\nDeleting defaults...');
  const defaults = await api(`/guilds/${G}/channels`, 'GET', null);
  for (const ch of defaults) {
    await api(`/channels/${ch.id}`, 'DELETE', null);
    await sleep(400);
  }

  // ─── 3. Create categories and channels ─────────────────────────────────
  const channelMap = {};

  const structure = [
    {
      name: '📢 INFO',
      channels: [
        { name: 'announcements', topic: 'Site updates, new features, breaking esports news' },
        { name: 'rules', topic: 'Server rules — read before posting' },
        { name: 'bot-commands', topic: 'Use bot commands here: /score, /upcoming, /results, /team' },
      ],
    },
    {
      name: '🔴 LIVE MATCHES',
      channels: [
        { name: 'live-scores', topic: 'Auto-posted live match scores from esport.is' },
        { name: 'match-alerts', topic: 'Notifications for major matches starting' },
        { name: 'predictions', topic: 'Predict match outcomes — who wins?' },
      ],
    },
    {
      name: '🎯 CS2',
      channels: [
        { name: 'cs2-discussion', topic: 'Counter-Strike 2 esports talk' },
        { name: 'cs2-matches', topic: 'CS2 match results and highlights' },
        { name: 'cs2-transfers', topic: 'CS2 roster moves and rumors' },
      ],
    },
    {
      name: '⚔️ VALORANT',
      channels: [
        { name: 'valorant-discussion', topic: 'Valorant esports talk' },
        { name: 'valorant-matches', topic: 'VCT results and highlights' },
        { name: 'valorant-transfers', topic: 'Valorant roster moves' },
      ],
    },
    {
      name: '🗡️ LEAGUE OF LEGENDS',
      channels: [
        { name: 'lol-discussion', topic: 'League of Legends esports' },
        { name: 'lol-matches', topic: 'LCS, LEC, LCK, LPL results' },
      ],
    },
    {
      name: '🛡️ DOTA 2',
      channels: [
        { name: 'dota2-discussion', topic: 'Dota 2 esports talk' },
        { name: 'dota2-matches', topic: 'DPC, TI, Major results' },
      ],
    },
    {
      name: '🎮 MORE GAMES',
      channels: [
        { name: 'rainbow-six', topic: 'R6 Siege esports' },
        { name: 'rocket-league', topic: 'RLCS discussion' },
        { name: 'overwatch', topic: 'OWL and OW2 esports' },
        { name: 'apex-fortnite-pubg', topic: 'Battle royale esports' },
      ],
    },
    {
      name: '💬 COMMUNITY',
      channels: [
        { name: 'general', topic: 'General esports chat' },
        { name: 'introductions', topic: 'New here? Say hi!' },
        { name: 'memes', topic: 'Esports memes and clips' },
        { name: 'content-creators', topic: 'Share your esports content' },
        { name: 'fantasy-esports', topic: 'Fantasy lineups and strategy' },
      ],
    },
    {
      name: '📊 DATA & API',
      channels: [
        { name: 'rankings-talk', topic: 'Discuss team/player rankings' },
        { name: 'api-developers', topic: 'Using the esport.is API? Ask here' },
        { name: 'feature-requests', topic: 'Suggest features for esport.is' },
      ],
    },
    {
      name: '🔊 VOICE',
      channels: [
        { name: 'Watch Party', type: 2 },
        { name: 'CS2 Talk', type: 2 },
        { name: 'Valorant Talk', type: 2 },
        { name: 'General Voice', type: 2 },
      ],
    },
    {
      name: '🛠️ SUPPORT',
      channels: [
        { name: 'help', topic: 'Need help with the site or bot?' },
        { name: 'bug-reports', topic: 'Report bugs on esport.is' },
      ],
    },
  ];

  for (const cat of structure) {
    console.log('Category:', cat.name);
    const category = await api(`/guilds/${G}/channels`, 'POST', { name: cat.name, type: 4 });
    await sleep(500);

    for (const ch of cat.channels) {
      console.log('  Channel:', ch.name, ch.type === 2 ? '(voice)' : '');
      const created = await api(`/guilds/${G}/channels`, 'POST', {
        name: ch.name,
        type: ch.type || 0,
        parent_id: category.id,
        topic: ch.topic || null,
      });
      channelMap[ch.name] = created.id;
      await sleep(500);
    }
  }

  // ─── 4. Create roles ──────────────────────────────────────────────────
  console.log('\nCreating roles...');
  const roles = [
    { name: 'Admin', color: 0xe74c3c, permissions: '8', hoist: true },
    { name: 'Moderator', color: 0x3498db, permissions: '1099511627766', hoist: true },
    { name: 'API Developer', color: 0x2ecc71, hoist: true },
    { name: 'CS2', color: 0xe97f2a },
    { name: 'Valorant', color: 0xff4655 },
    { name: 'League of Legends', color: 0xc89b3c },
    { name: 'Dota 2', color: 0xe91e63 },
    { name: 'R6 Siege', color: 0x2a7de1 },
    { name: 'Rocket League', color: 0x0078f2 },
    { name: 'Overwatch', color: 0xf99e1a },
    { name: 'Content Creator', color: 0x9b59b6, hoist: true },
  ];

  for (const role of roles) {
    console.log('  Role:', role.name);
    await api(`/guilds/${G}/roles`, 'POST', {
      name: role.name,
      color: role.color,
      permissions: role.permissions || '0',
      hoist: role.hoist || false,
      mentionable: true,
    });
    await sleep(300);
  }

  // ─── 5. Assign Admin to owner ─────────────────────────────────────────
  const allRoles = await api(`/guilds/${G}/roles`, 'GET', null);
  const adminRole = allRoles.find(r => r.name === 'Admin');
  if (adminRole) {
    await api(`/guilds/${G}/members/562556383078121492/roles/${adminRole.id}`, 'PUT', null);
    console.log('Admin role assigned to owner');
  }
  await sleep(500);

  // ─── 6. Lock info channels ────────────────────────────────────────────
  console.log('\nLocking info channels...');
  const everyoneId = G;
  for (const chName of ['announcements', 'rules', 'live-scores', 'match-alerts']) {
    const chId = channelMap[chName];
    if (!chId) continue;
    await api(`/channels/${chId}/permissions/${everyoneId}`, 'PUT', {
      type: 0,
      deny: '2048', // SEND_MESSAGES
      allow: '0',
    });
    if (adminRole) {
      await api(`/channels/${chId}/permissions/${adminRole.id}`, 'PUT', {
        type: 0,
        allow: '2048',
        deny: '0',
      });
    }
    await sleep(400);
  }

  // ─── 7. Slow mode ────────────────────────────────────────────────────
  for (const [ch, sec] of Object.entries({ general: 5, memes: 10, predictions: 10, introductions: 30 })) {
    if (channelMap[ch]) await api(`/channels/${channelMap[ch]}`, 'PATCH', { rate_limit_per_user: sec });
    await sleep(300);
  }

  // ─── 8. Post welcome messages ─────────────────────────────────────────
  console.log('\nPosting welcome messages...');

  if (channelMap['announcements']) {
    await api(`/channels/${channelMap['announcements']}/messages`, 'POST', {
      content: `# Welcome to esport.is! 🎮\n\n**esport.is** is the real-time esports data hub — live scores, rankings, transfers, predictions, and breaking news across **11 games**.\n\n🔴 **Live Scores** — Real-time match tracking\n📊 **Rankings** — Global team & player rankings\n🔄 **Transfers** — Roster moves as they happen\n🎯 **Predictions** — Pick'em contests & match predictions\n📰 **News** — Breaking esports stories\n🏆 **Tournaments** — Brackets, schedules, results\n\n👉 **Visit:** https://esport.is\n📡 **API:** https://esport.is/api\n\nFree. No account needed. No paywalls.`,
    });
    await sleep(500);
  }

  if (channelMap['rules']) {
    await api(`/channels/${channelMap['rules']}/messages`, 'POST', {
      content: `# 📋 Server Rules\n\n**1.** Be respectful. No toxicity, racism, or harassment.\n**2.** No spam or self-promotion without permission.\n**3.** Keep game discussions in the right channels.\n**4.** No spoilers in #general — use game-specific channels.\n**5.** No NSFW content.\n**6.** English is the primary language.\n**7.** Use #help for site/bot issues.\n\n⚠️ Breaking rules = warn → mute → ban`,
    });
    await sleep(500);
  }

  if (channelMap['bot-commands']) {
    await api(`/channels/${channelMap['bot-commands']}/messages`, 'POST', {
      content: `# 🤖 Bot Commands\n\n\`/score\` — Current live matches\n\`/upcoming\` — Next 5 scheduled matches\n\`/results\` — Recent match results\n\`/team [name]\` — Search for a team\n\`/standings [game]\` — Rankings link\n\nThe bot also auto-posts live match alerts in #live-scores and #match-alerts.\n\n💡 More commands coming soon!`,
    });
    await sleep(500);
  }

  if (channelMap['general']) {
    await api(`/channels/${channelMap['general']}/messages`, 'POST', {
      content: `Welcome! 👋 This is the official **esport.is** Discord — your hub for live esports scores, rankings, and community.\n\n**Quick links:**\n🔴 Live: https://esport.is/live\n📊 Rankings: https://esport.is/rankings\n🏆 Events: https://esport.is/events\n📰 News: https://esport.is/news\n\nGrab your game roles and jump into the discussion!`,
    });
    await sleep(500);
  }

  // ─── 9. Server settings ───────────────────────────────────────────────
  console.log('\nUpdating server settings...');
  await api(`/guilds/${G}`, 'PATCH', {
    description: 'Real-time esports data hub — live scores, rankings, transfers, predictions across 11 games. Free & open.',
    verification_level: 1,
    default_message_notifications: 1,
    explicit_content_filter: 2,
  });

  // ─── 10. Create invite ────────────────────────────────────────────────
  console.log('\nCreating invite...');
  const generalId = channelMap['general'];
  if (generalId) {
    const invite = await api(`/channels/${generalId}/invites`, 'POST', {
      max_age: 0,
      max_uses: 0,
      unique: true,
    });
    console.log('✅ Invite: https://discord.gg/' + invite.code);

    // Save info
    fs.writeFileSync(path.join(__dirname, 'esportis-discord-info.json'), JSON.stringify({
      guildId: G,
      inviteCode: invite.code,
      inviteUrl: 'https://discord.gg/' + invite.code,
      channels: channelMap,
      createdAt: new Date().toISOString(),
    }, null, 2));
  }

  // ─── 11. Server icon ──────────────────────────────────────────────────
  console.log('\nSetting server icon...');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a0e1a"/>
        <stop offset="100%" stop-color="#0d1528"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#00e5ff"/>
        <stop offset="100%" stop-color="#7c4dff"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)" rx="80"/>
    <text x="256" y="220" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="100" font-weight="900" fill="url(#accent)">E.IS</text>
    <text x="256" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#ffffff">ESPORT.IS</text>
    <text x="256" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#8892b0">LIVE ESPORTS HUB</text>
    <line x1="140" y1="330" x2="372" y2="330" stroke="#00e5ff" stroke-width="2" opacity="0.5"/>
  </svg>`;
  const svgB64 = Buffer.from(svg).toString('base64');
  const iconDataUrl = await evaluate(ws, `
    (async () => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 512; c.height = 512;
          c.getContext('2d').drawImage(img, 0, 0, 512, 512);
          resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => resolve('ERROR');
        img.src = 'data:image/svg+xml;base64,${svgB64}';
      });
    })()
  `);
  if (iconDataUrl && iconDataUrl !== 'ERROR') {
    await api(`/guilds/${G}`, 'PATCH', { icon: iconDataUrl });
    console.log('  Icon set!');
  }

  // ─── 12. AutoMod ──────────────────────────────────────────────────────
  console.log('\nSetting up AutoMod...');
  await api(`/guilds/${G}/auto-moderation/rules`, 'POST', {
    name: 'Block Spam & Scams',
    event_type: 1,
    trigger_type: 1,
    trigger_metadata: {
      keyword_filter: [
        'free nitro', 'discord nitro free', 'click here to claim',
        'congratulations you won', 'earn money fast', 'get rich quick',
        'bit.ly/*', 'tinyurl.com/*', 'onlyfans', 'porn',
      ],
    },
    actions: [{ type: 1, metadata: {} }],
    enabled: true,
  });
  await sleep(500);

  await api(`/guilds/${G}/auto-moderation/rules`, 'POST', {
    name: 'Anti-Spam',
    event_type: 1,
    trigger_type: 3,
    trigger_metadata: {},
    actions: [{ type: 1, metadata: {} }],
    enabled: true,
  });
  await sleep(500);

  await api(`/guilds/${G}/auto-moderation/rules`, 'POST', {
    name: 'Mention Spam',
    event_type: 1,
    trigger_type: 5,
    trigger_metadata: { mention_total_limit: 5 },
    actions: [{ type: 1, metadata: {} }],
    enabled: true,
  });

  console.log('\n✅ esport.is Discord fully set up!');
  ws.close();
}

run().catch(e => console.error('ERROR:', e.message));
