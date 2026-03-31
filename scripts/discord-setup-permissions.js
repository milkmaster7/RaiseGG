/**
 * Set up Discord server permissions, restrictions, and auto-moderation
 * - Lock info channels (read-only for @everyone)
 * - Assign Admin role to owner
 * - Configure verification level
 * - Set up AutoMod rules (spam, slurs, invite links)
 * - Slow mode on community channels
 */
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const serverInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'discord-server-info.json'), 'utf-8'));
const GUILD_ID = serverInfo.guildId;
const CHANNELS = serverInfo.channels;

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

  // Get token
  const token = await evaluate(ws, `
    (() => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const t = iframe.contentWindow.localStorage.getItem('token');
      iframe.remove();
      return t ? t.replace(/"/g, '') : null;
    })()
  `);

  // Helper for API calls
  async function api(endpoint, method = 'GET', body = null) {
    const bodyStr = body ? JSON.stringify(body) : 'null';
    const escaped = bodyStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    const result = await evaluate(ws, `
      (async () => {
        const opts = {
          method: '${method}',
          headers: { 'Content-Type': 'application/json', 'Authorization': '${token}' },
          credentials: 'include'
        };
        ${body ? `opts.body = '${escaped}';` : ''}
        const res = await fetch('https://discord.com/api/v9${endpoint}', opts);
        const data = await res.json().catch(() => ({}));
        return JSON.stringify({ s: res.status, d: data });
      })()
    `);
    const parsed = JSON.parse(result);
    if (parsed.s === 429) {
      const wait = (parsed.d.retry_after || 5) * 1000 + 500;
      console.log('  Rate limited, waiting', Math.ceil(wait / 1000), 's...');
      await sleep(wait);
      return api(endpoint, method, body);
    }
    if (parsed.s >= 400) {
      console.log('  API error:', endpoint, parsed.s, JSON.stringify(parsed.d).substring(0, 200));
    }
    return parsed.d;
  }

  // ─── 1. Get roles ───────────────────────────────────────────────────────
  console.log('--- Fetching roles ---');
  const roles = await api(`/guilds/${GUILD_ID}/roles`);
  const roleMap = {};
  for (const r of roles) {
    roleMap[r.name] = r.id;
    console.log(`  Role: ${r.name} (${r.id})`);
  }
  await sleep(500);

  const everyoneId = roleMap['@everyone'] || GUILD_ID;
  const adminRoleId = roleMap['Admin'];
  const modRoleId = roleMap['Moderator'];
  const verifiedRoleId = roleMap['Verified Player'];

  // ─── 2. Assign Admin role to owner ──────────────────────────────────────
  console.log('\n--- Assigning Admin role to owner ---');
  const OWNER_ID = '562556383078121492'; // milkmaster7
  await api(`/guilds/${GUILD_ID}/members/${OWNER_ID}/roles/${adminRoleId}`, 'PUT');
  console.log('  Admin role assigned to owner');
  await sleep(500);

  // ─── 3. Lock info channels (read-only for @everyone) ───────────────────
  console.log('\n--- Locking info channels ---');
  const readOnlyChannels = ['announcements', 'rules', 'how-it-works', 'faq'];

  // Permission bits
  const SEND_MESSAGES = 0x800n;
  const ADD_REACTIONS = 0x40n;
  const CREATE_THREADS = 0x800000000n;
  const SEND_THREADS = 0x4000000000n;

  const denyBits = (SEND_MESSAGES | ADD_REACTIONS | CREATE_THREADS | SEND_THREADS).toString();

  for (const chName of readOnlyChannels) {
    const chId = CHANNELS[chName];
    if (!chId) continue;
    console.log(`  Locking #${chName}`);
    // Deny @everyone from sending
    await api(`/channels/${chId}/permissions/${everyoneId}`, 'PUT', {
      type: 0, // role
      deny: denyBits,
      allow: '0',
    });
    await sleep(400);

    // Allow Admin + Mod to send
    if (adminRoleId) {
      await api(`/channels/${chId}/permissions/${adminRoleId}`, 'PUT', {
        type: 0,
        allow: SEND_MESSAGES.toString(),
        deny: '0',
      });
      await sleep(300);
    }
    if (modRoleId) {
      await api(`/channels/${chId}/permissions/${modRoleId}`, 'PUT', {
        type: 0,
        allow: SEND_MESSAGES.toString(),
        deny: '0',
      });
      await sleep(300);
    }
  }

  // ─── 4. Lock tournament channels (only admins post) ─────────────────────
  console.log('\n--- Locking tournament channels ---');
  for (const chName of ['tournament-announcements', 'tournament-results']) {
    const chId = CHANNELS[chName];
    if (!chId) continue;
    console.log(`  Locking #${chName}`);
    await api(`/channels/${chId}/permissions/${everyoneId}`, 'PUT', {
      type: 0,
      deny: SEND_MESSAGES.toString(),
      allow: '0',
    });
    await sleep(400);
    if (adminRoleId) {
      await api(`/channels/${chId}/permissions/${adminRoleId}`, 'PUT', {
        type: 0,
        allow: SEND_MESSAGES.toString(),
        deny: '0',
      });
      await sleep(300);
    }
  }

  // ─── 5. Slow mode on community channels ────────────────────────────────
  console.log('\n--- Setting slow mode ---');
  const slowModeChannels = {
    'general': 5,           // 5 sec
    'memes': 10,            // 10 sec
    'clips-highlights': 10,
    'find-opponent': 15,    // 15 sec to reduce spam
    'referrals': 30,        // 30 sec
    'introductions': 30,
  };

  for (const [chName, seconds] of Object.entries(slowModeChannels)) {
    const chId = CHANNELS[chName];
    if (!chId) continue;
    console.log(`  #${chName}: ${seconds}s slow mode`);
    await api(`/channels/${chId}`, 'PATCH', { rate_limit_per_user: seconds });
    await sleep(400);
  }

  // ─── 6. Server-wide settings ───────────────────────────────────────────
  console.log('\n--- Updating server settings ---');
  await api(`/guilds/${GUILD_ID}`, 'PATCH', {
    verification_level: 2,           // Medium: must be registered for 5+ minutes
    default_message_notifications: 1, // Only @mentions
    explicit_content_filter: 2,       // Scan messages from all members
    system_channel_flags: 6,          // Suppress join + boost notifications
  });
  console.log('  Verification: Medium (5 min registered)');
  console.log('  Content filter: All members');
  console.log('  Notifications: @mentions only');
  await sleep(500);

  // ─── 7. Auto-Moderation rules ──────────────────────────────────────────
  console.log('\n--- Setting up AutoMod rules ---');

  // Rule 1: Block spam/scam keywords
  console.log('  Creating spam filter...');
  await api(`/guilds/${GUILD_ID}/auto-moderation/rules`, 'POST', {
    name: 'Block Spam & Scams',
    event_type: 1, // MESSAGE_SEND
    trigger_type: 1, // KEYWORD
    trigger_metadata: {
      keyword_filter: [
        'free nitro', 'discord nitro free', 'steam gift',
        'click here to claim', 'congratulations you won',
        'earn money fast', 'get rich quick',
        'csgo skins free', 'free knife', 'free skins',
        'bit.ly/*', 'tinyurl.com/*',
        'onlyfans', 'porn', 'nude',
        'hack', 'cheat', 'aimbot', 'wallhack', 'esp hack',
      ],
      regex_patterns: [],
      allow_list: [],
    },
    actions: [
      { type: 1, metadata: {} }, // Block message
      {
        type: 2, // Alert in channel
        metadata: { channel_id: CHANNELS['support'] || Object.values(CHANNELS)[0] },
      },
    ],
    enabled: true,
  });
  await sleep(800);

  // Rule 2: Block invite links from non-admins
  console.log('  Creating invite link filter...');
  await api(`/guilds/${GUILD_ID}/auto-moderation/rules`, 'POST', {
    name: 'Block Discord Invites',
    event_type: 1,
    trigger_type: 1, // KEYWORD
    trigger_metadata: {
      keyword_filter: ['discord.gg/*', 'discord.com/invite/*', 'discordapp.com/invite/*'],
      regex_patterns: ['discord\\.gg\\/[a-zA-Z0-9]+', 'discord\\.com\\/invite\\/[a-zA-Z0-9]+'],
      allow_list: ['discord.gg/ErWPgH7gd6'], // Allow our own invite
    },
    actions: [
      { type: 1, metadata: {} },
    ],
    exempt_roles: [adminRoleId, modRoleId].filter(Boolean),
    enabled: true,
  });
  await sleep(800);

  // Rule 3: Anti-spam (mention spam)
  console.log('  Creating mention spam filter...');
  await api(`/guilds/${GUILD_ID}/auto-moderation/rules`, 'POST', {
    name: 'Mention Spam Protection',
    event_type: 1,
    trigger_type: 5, // MENTION_SPAM
    trigger_metadata: {
      mention_total_limit: 5, // Max 5 mentions per message
    },
    actions: [
      { type: 1, metadata: {} }, // Block
      { type: 3, metadata: { duration_seconds: 600 } }, // 10 min timeout
    ],
    enabled: true,
  });
  await sleep(800);

  // Rule 4: Block harmful links
  console.log('  Creating harmful link filter...');
  await api(`/guilds/${GUILD_ID}/auto-moderation/rules`, 'POST', {
    name: 'Block Harmful Links',
    event_type: 1,
    trigger_type: 1, // KEYWORD
    trigger_metadata: {
      keyword_filter: [
        'grabify.link/*', 'iplogger.org/*', 'iplogger.com/*',
        'phishing', 'scam site', 'virus',
      ],
      regex_patterns: [],
      allow_list: ['raisegg.com'],
    },
    actions: [
      { type: 1, metadata: {} },
      { type: 3, metadata: { duration_seconds: 3600 } }, // 1hr timeout
    ],
    exempt_roles: [adminRoleId, modRoleId].filter(Boolean),
    enabled: true,
  });
  await sleep(800);

  // Rule 5: Spam detection (repeated messages)
  console.log('  Creating spam rate limit...');
  await api(`/guilds/${GUILD_ID}/auto-moderation/rules`, 'POST', {
    name: 'Anti-Spam Rate Limit',
    event_type: 1,
    trigger_type: 3, // SPAM
    trigger_metadata: {},
    actions: [
      { type: 1, metadata: {} },
      { type: 3, metadata: { duration_seconds: 300 } }, // 5 min timeout
    ],
    exempt_roles: [adminRoleId, modRoleId].filter(Boolean),
    enabled: true,
  });
  await sleep(500);

  // ─── 8. Set up welcome screen ──────────────────────────────────────────
  console.log('\n--- Setting up welcome screen ---');
  await api(`/guilds/${GUILD_ID}/welcome-screen`, 'PATCH', {
    enabled: true,
    description: 'Welcome to RaiseGG! Competitive stake matches for CS2, Dota 2 & Deadlock.',
    welcome_channels: [
      { channel_id: CHANNELS['rules'], description: 'Read the server rules first', emoji_name: '📋' },
      { channel_id: CHANNELS['general'], description: 'Chat with the community', emoji_name: '💬' },
      { channel_id: CHANNELS['find-opponent'], description: 'Find someone to play against', emoji_name: '⚔️' },
      { channel_id: CHANNELS['cs2'], description: 'CS2 discussion and LFG', emoji_name: '🎮' },
      { channel_id: CHANNELS['introductions'], description: 'Introduce yourself', emoji_name: '👋' },
    ],
  });
  console.log('  Welcome screen enabled');

  console.log('\n✅ All permissions, restrictions, and auto-moderation set up!');
  ws.close();
}

run().catch(e => console.error('ERROR:', e.message));
