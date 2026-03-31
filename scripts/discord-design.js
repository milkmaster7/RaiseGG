/**
 * Set up Discord server design: icon, community mode, membership screening, onboarding
 */
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { createCanvas } = (() => {
  try { return require('canvas'); } catch { return { createCanvas: null }; }
})();

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

// Generate a server icon using SVG (no canvas dependency needed)
function generateIconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a0e1a"/>
        <stop offset="100%" stop-color="#1a1040"/>
      </linearGradient>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#00e5ff"/>
        <stop offset="100%" stop-color="#7c4dff"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)" rx="80"/>
    <circle cx="256" cy="200" r="100" fill="none" stroke="url(#glow)" stroke-width="6" opacity="0.3"/>
    <text x="256" y="240" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="120" font-weight="900" fill="url(#glow)">RG</text>
    <text x="256" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#ffffff">RAISE<tspan fill="#00e5ff">GG</tspan></text>
    <text x="256" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#8892b0">ESPORTS STAKE</text>
    <line x1="120" y1="360" x2="392" y2="360" stroke="#00e5ff" stroke-width="2" opacity="0.5"/>
  </svg>`;
}

async function run() {
  const wsUrl = await getPageWs();
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
      console.log('  API error:', parsed.s, JSON.stringify(parsed.d).substring(0, 300));
    }
    return parsed.d;
  }

  // ─── 1. Generate and set server icon ───────────────────────────────────
  console.log('--- Setting server icon ---');

  // Convert SVG to PNG using browser canvas
  const svg = generateIconSVG();
  const svgB64 = Buffer.from(svg).toString('base64');

  const iconDataUrl = await evaluate(ws, `
    (async () => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 512, 512);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('ERROR');
        img.src = 'data:image/svg+xml;base64,${svgB64}';
      });
    })()
  `);

  if (iconDataUrl && iconDataUrl !== 'ERROR') {
    console.log('  Icon generated, uploading...');
    await api(`/guilds/${GUILD_ID}`, 'PATCH', { icon: iconDataUrl });
    console.log('  Server icon set!');
  } else {
    console.log('  Could not generate icon');
  }
  await sleep(1000);

  // ─── 2. Enable Community mode ──────────────────────────────────────────
  console.log('\n--- Enabling Community mode ---');
  const communityResult = await api(`/guilds/${GUILD_ID}`, 'PATCH', {
    features: ['COMMUNITY', 'AUTO_MODERATION'],
    rules_channel_id: CHANNELS['rules'],
    public_updates_channel_id: CHANNELS['announcements'],
    verification_level: 2,
    explicit_content_filter: 2,
    default_message_notifications: 1,
  });

  if (communityResult.features && communityResult.features.includes('COMMUNITY')) {
    console.log('  Community mode enabled!');
  } else {
    console.log('  Community mode result:', JSON.stringify(communityResult).substring(0, 200));
  }
  await sleep(1000);

  // ─── 3. Set up Membership Screening (rules gate) ───────────────────────
  console.log('\n--- Setting up Membership Screening ---');
  const screeningResult = await api(`/guilds/${GUILD_ID}/member-verification`, 'PUT', {
    version: '2026-03-31T00:00:00.000Z',
    description: 'Welcome to RaiseGG! Please agree to the rules before you can chat.',
    form_fields: [
      {
        field_type: 'TERMS',
        label: 'I have read and agree to the server rules',
        required: true,
        values: [
          'Be respectful — no racism, sexism, or harassment',
          'No spam, self-promotion, or scam links',
          'No cheating discussion — zero tolerance for cheaters',
          'Keep channels on-topic',
          'English, Turkish, and Russian are welcome',
          'Report issues in #support',
        ],
      },
    ],
  });
  console.log('  Screening:', screeningResult.description ? 'Set up!' : JSON.stringify(screeningResult).substring(0, 200));
  await sleep(1000);

  // ─── 4. Set up Welcome Screen ──────────────────────────────────────────
  console.log('\n--- Setting up Welcome Screen ---');
  const welcomeResult = await api(`/guilds/${GUILD_ID}/welcome-screen`, 'PATCH', {
    enabled: true,
    description: 'Welcome to RaiseGG — competitive stake matches for CS2, Dota 2 & Deadlock!',
    welcome_channels: [
      { channel_id: CHANNELS['rules'], description: 'Read the server rules', emoji_name: '📋' },
      { channel_id: CHANNELS['general'], description: 'Join the conversation', emoji_name: '💬' },
      { channel_id: CHANNELS['find-opponent'], description: 'Find someone to play against', emoji_name: '⚔️' },
      { channel_id: CHANNELS['cs2'], description: 'CS2 discussion and LFG', emoji_name: '🎯' },
      { channel_id: CHANNELS['introductions'], description: 'Say hello!', emoji_name: '👋' },
    ],
  });
  console.log('  Welcome screen:', welcomeResult.description ? 'Enabled!' : JSON.stringify(welcomeResult).substring(0, 200));
  await sleep(500);

  // ─── 5. Set up Onboarding ──────────────────────────────────────────────
  console.log('\n--- Setting up Onboarding ---');

  // Get role IDs
  const roles = await api(`/guilds/${GUILD_ID}/roles`);
  const roleMap = {};
  for (const r of roles) roleMap[r.name] = r.id;
  await sleep(500);

  const onboardingResult = await api(`/guilds/${GUILD_ID}/onboarding`, 'PUT', {
    prompts: [
      {
        type: 0, // MULTIPLE_CHOICE
        title: 'What games do you play?',
        options: [
          { title: 'CS2', role_ids: [roleMap['CS2']].filter(Boolean), channel_ids: [CHANNELS['cs2']].filter(Boolean), emoji: { name: '🎯' } },
          { title: 'Dota 2', role_ids: [roleMap['Dota 2']].filter(Boolean), channel_ids: [CHANNELS['dota2']].filter(Boolean), emoji: { name: '🗡️' } },
          { title: 'Deadlock', role_ids: [roleMap['Deadlock']].filter(Boolean), channel_ids: [CHANNELS['deadlock']].filter(Boolean), emoji: { name: '🔒' } },
        ],
        single_select: false,
        required: true,
        in_onboarding: true,
      },
      {
        type: 0,
        title: 'Where are you from?',
        options: [
          { title: 'Turkey', role_ids: [roleMap['🇹🇷 Turkey']].filter(Boolean), channel_ids: [CHANNELS['türkiye']].filter(Boolean), emoji: { name: '🇹🇷' } },
          { title: 'Russia/CIS', role_ids: [roleMap['🇷🇺 Russia/CIS']].filter(Boolean), channel_ids: [CHANNELS['россия-снг']].filter(Boolean), emoji: { name: '🇷🇺' } },
          { title: 'Georgia', role_ids: [roleMap['🇬🇪 Georgia']].filter(Boolean), channel_ids: [CHANNELS['caucasus']].filter(Boolean), emoji: { name: '🇬🇪' } },
          { title: 'Romania', role_ids: [roleMap['🇷🇴 Romania']].filter(Boolean), channel_ids: [CHANNELS['balkans']].filter(Boolean), emoji: { name: '🇷🇴' } },
          { title: 'Serbia', role_ids: [roleMap['🇷🇸 Serbia']].filter(Boolean), channel_ids: [CHANNELS['balkans']].filter(Boolean), emoji: { name: '🇷🇸' } },
          { title: 'Bulgaria', role_ids: [roleMap['🇧🇬 Bulgaria']].filter(Boolean), channel_ids: [CHANNELS['balkans']].filter(Boolean), emoji: { name: '🇧🇬' } },
          { title: 'Greece', role_ids: [roleMap['🇬🇷 Greece']].filter(Boolean), channel_ids: [CHANNELS['balkans']].filter(Boolean), emoji: { name: '🇬🇷' } },
          { title: 'Armenia', role_ids: [roleMap['🇦🇲 Armenia']].filter(Boolean), channel_ids: [CHANNELS['caucasus']].filter(Boolean), emoji: { name: '🇦🇲' } },
          { title: 'Azerbaijan', role_ids: [roleMap['🇦🇿 Azerbaijan']].filter(Boolean), channel_ids: [CHANNELS['caucasus']].filter(Boolean), emoji: { name: '🇦🇿' } },
          { title: 'Kazakhstan', role_ids: [roleMap['🇰🇿 Kazakhstan']].filter(Boolean), emoji: { name: '🇰🇿' } },
          { title: 'Ukraine', role_ids: [roleMap['🇺🇦 Ukraine']].filter(Boolean), emoji: { name: '🇺🇦' } },
          { title: 'Poland', role_ids: [roleMap['🇵🇱 Poland']].filter(Boolean), emoji: { name: '🇵🇱' } },
          { title: 'Other', role_ids: [], emoji: { name: '🌍' } },
        ],
        single_select: true,
        required: true,
        in_onboarding: true,
      },
    ],
    default_channel_ids: [
      CHANNELS['general'],
      CHANNELS['announcements'],
      CHANNELS['rules'],
      CHANNELS['how-it-works'],
      CHANNELS['faq'],
      CHANNELS['find-opponent'],
      CHANNELS['support'],
    ].filter(Boolean),
    enabled: true,
    mode: 0, // ONBOARDING_DEFAULT
  });
  console.log('  Onboarding:', onboardingResult.prompts ? 'Enabled!' : JSON.stringify(onboardingResult).substring(0, 300));

  // ─── 6. Update server description ──────────────────────────────────────
  console.log('\n--- Final server settings ---');
  await api(`/guilds/${GUILD_ID}`, 'PATCH', {
    description: 'Competitive esports stake platform — CS2, Dota 2, Deadlock. Blockchain escrow. Free daily tournaments. 44 countries.',
  });
  console.log('  Server description updated');

  console.log('\n✅ Design, screening, onboarding — all done!');
  console.log('Note: Server banner needs Level 2 boost (7 boosts). Icon is set.');
  ws.close();
}

run().catch(e => console.error('ERROR:', e.message));
