/**
 * Fix Discord onboarding + membership screening
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
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));
  console.log('Connected');

  const token = await evaluate(ws, `
    (() => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const t = iframe.contentWindow.localStorage.getItem('token');
      iframe.remove();
      return t ? t.replace(/"/g, '') : null;
    })()
  `);

  // Helper: make API calls through browser
  async function api(endpoint, method, bodyObj) {
    // Serialize body and pass via window variable to avoid escaping issues
    const bodyJson = bodyObj ? JSON.stringify(bodyObj) : '';
    const randVar = '_api_' + Math.random().toString(36).slice(2, 8);

    if (bodyObj) {
      // Store the body JSON in a window variable
      await evaluate(ws, `window.${randVar} = ${JSON.stringify(bodyJson)}`);
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
      console.log('  API error:', parsed.s, JSON.stringify(parsed.d).substring(0, 300));
    }
    return parsed.d;
  }

  // 1. Get roles
  console.log('Fetching roles...');
  const roles = await api(`/guilds/${GUILD_ID}/roles`, 'GET', null);
  const roleMap = {};
  for (const r of roles) roleMap[r.name] = r.id;
  await sleep(500);

  // 2. Create Member role for "Other" country
  console.log('Creating Member role...');
  const memberRole = await api(`/guilds/${GUILD_ID}/roles`, 'POST', {
    name: 'Member',
    color: 0x546e7a,
    hoist: false,
    mentionable: false,
  });
  const memberRoleId = memberRole.id;
  console.log('  Member role ID:', memberRoleId);
  await sleep(500);

  // 3. Membership screening (rules gate)
  console.log('Setting up membership screening...');
  const screening = await api(`/guilds/${GUILD_ID}/member-verification`, 'PATCH', {
    version: '2026-03-31T00:00:00.000Z',
    description: 'Welcome to RaiseGG! Please agree to the rules to start chatting.',
    form_fields: [
      {
        field_type: 'TERMS',
        label: 'I agree to follow the server rules',
        required: true,
        values: [
          'Be respectful — no racism, sexism, or harassment',
          'No spam, self-promotion, or scam links',
          'No cheating tools or discussion',
          'Keep channels on-topic',
          'Report issues in #support',
        ],
      },
    ],
  });
  console.log('  Screening result:', screening.description || JSON.stringify(screening).substring(0, 200));
  await sleep(500);

  // 4. Onboarding (game + country selection)
  console.log('Setting up onboarding...');
  const onboarding = await api(`/guilds/${GUILD_ID}/onboarding`, 'PUT', {
    prompts: [
      {
        type: 0,
        title: 'What games do you play?',
        options: [
          { title: 'CS2', role_ids: [roleMap['CS2']], channel_ids: [CHANNELS['cs2']], emoji: { name: '🎯' } },
          { title: 'Dota 2', role_ids: [roleMap['Dota 2']], channel_ids: [CHANNELS['dota2']], emoji: { name: '🗡️' } },
          { title: 'Deadlock', role_ids: [roleMap['Deadlock']], channel_ids: [CHANNELS['deadlock']], emoji: { name: '🔒' } },
        ],
        single_select: false,
        required: true,
        in_onboarding: true,
      },
      {
        type: 0,
        title: 'Where are you from?',
        options: [
          { title: 'Turkey', role_ids: [roleMap['🇹🇷 Turkey']], channel_ids: [CHANNELS['türkiye']], emoji: { name: '🇹🇷' } },
          { title: 'Russia/CIS', role_ids: [roleMap['🇷🇺 Russia/CIS']], channel_ids: [CHANNELS['россия-снг']], emoji: { name: '🇷🇺' } },
          { title: 'Georgia', role_ids: [roleMap['🇬🇪 Georgia']], channel_ids: [CHANNELS['caucasus']], emoji: { name: '🇬🇪' } },
          { title: 'Romania', role_ids: [roleMap['🇷🇴 Romania']], channel_ids: [CHANNELS['balkans']], emoji: { name: '🇷🇴' } },
          { title: 'Serbia', role_ids: [roleMap['🇷🇸 Serbia']], channel_ids: [CHANNELS['balkans']], emoji: { name: '🇷🇸' } },
          { title: 'Bulgaria', role_ids: [roleMap['🇧🇬 Bulgaria']], channel_ids: [CHANNELS['balkans']], emoji: { name: '🇧🇬' } },
          { title: 'Greece', role_ids: [roleMap['🇬🇷 Greece']], channel_ids: [CHANNELS['balkans']], emoji: { name: '🇬🇷' } },
          { title: 'Armenia', role_ids: [roleMap['🇦🇲 Armenia']], channel_ids: [CHANNELS['caucasus']], emoji: { name: '🇦🇲' } },
          { title: 'Azerbaijan', role_ids: [roleMap['🇦🇿 Azerbaijan']], channel_ids: [CHANNELS['caucasus']], emoji: { name: '🇦🇿' } },
          { title: 'Kazakhstan', role_ids: [roleMap['🇰🇿 Kazakhstan']], channel_ids: [CHANNELS['general']], emoji: { name: '🇰🇿' } },
          { title: 'Ukraine', role_ids: [roleMap['🇺🇦 Ukraine']], channel_ids: [CHANNELS['general']], emoji: { name: '🇺🇦' } },
          { title: 'Poland', role_ids: [roleMap['🇵🇱 Poland']], channel_ids: [CHANNELS['general']], emoji: { name: '🇵🇱' } },
          { title: 'Other', role_ids: [memberRoleId], channel_ids: [CHANNELS['general']], emoji: { name: '🌍' } },
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
    ],
    enabled: true,
    mode: 0,
  });

  if (onboarding.prompts) {
    console.log('  Onboarding enabled! Prompts:', onboarding.prompts.length);
  } else {
    console.log('  Onboarding result:', JSON.stringify(onboarding).substring(0, 300));
  }

  console.log('\nDone!');
  ws.close();
}

run().catch(e => console.error('ERROR:', e.message));
