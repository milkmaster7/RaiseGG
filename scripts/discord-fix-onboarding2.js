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
      await sleep((parsed.d.retry_after || 5) * 1000 + 500);
      return api(endpoint, method, bodyObj);
    }
    return parsed;
  }

  // Get roles
  const rolesRes = await api(`/guilds/${GUILD_ID}/roles`, 'GET', null);
  const roleMap = {};
  for (const r of rolesRes.d) roleMap[r.name] = r.id;

  // Get existing onboarding
  const existing = await api(`/guilds/${GUILD_ID}/onboarding`, 'GET', null);
  console.log('Existing onboarding prompts:', existing.d.prompts?.length || 0);
  console.log('Existing:', JSON.stringify(existing.d).substring(0, 500));

  // Discord onboarding PUT requires prompts to have IDs if updating.
  // Since we're creating fresh, we need to generate snowflake IDs.
  // Use Discord's snowflake format: timestamp bits + worker + process + increment
  function generateSnowflake() {
    const epoch = 1420070400000n; // Discord epoch
    const timestamp = BigInt(Date.now()) - epoch;
    const random = BigInt(Math.floor(Math.random() * 4194304)); // 22 bits
    return ((timestamp << 22n) | random).toString();
  }

  const prompt1Id = generateSnowflake();
  const prompt2Id = generateSnowflake();

  // Generate option IDs too
  function genOpts(count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      ids.push(generateSnowflake());
    }
    return ids;
  }

  const gameOptIds = genOpts(3);
  const countryOptIds = genOpts(8);

  const memberRoleId = roleMap['Member'] || roleMap['Verified Player'];

  console.log('Setting up onboarding with generated IDs...');
  const result = await api(`/guilds/${GUILD_ID}/onboarding`, 'PUT', {
    prompts: [
      {
        id: prompt1Id,
        type: 0,
        title: 'What games do you play?',
        options: [
          { id: gameOptIds[0], title: 'CS2', role_ids: [roleMap['CS2']], channel_ids: [CHANNELS['cs2']], emoji: { name: '🎯', id: null } },
          { id: gameOptIds[1], title: 'Dota 2', role_ids: [roleMap['Dota 2']], channel_ids: [CHANNELS['dota2']], emoji: { name: '🗡️', id: null } },
          { id: gameOptIds[2], title: 'Deadlock', role_ids: [roleMap['Deadlock']], channel_ids: [CHANNELS['deadlock']], emoji: { name: '🔒', id: null } },
        ],
        single_select: false,
        required: true,
        in_onboarding: true,
      },
      {
        id: prompt2Id,
        type: 0,
        title: 'Where are you from?',
        options: [
          { id: countryOptIds[0], title: 'Turkey', role_ids: [roleMap['🇹🇷 Turkey']], channel_ids: [CHANNELS['türkiye']], emoji: { name: '🇹🇷', id: null } },
          { id: countryOptIds[1], title: 'Russia/CIS', role_ids: [roleMap['🇷🇺 Russia/CIS']], channel_ids: [CHANNELS['россия-снг']], emoji: { name: '🇷🇺', id: null } },
          { id: countryOptIds[2], title: 'Caucasus', role_ids: [roleMap['🇬🇪 Georgia']], channel_ids: [CHANNELS['caucasus']], emoji: { name: '🏔️', id: null } },
          { id: countryOptIds[3], title: 'Balkans', role_ids: [roleMap['🇷🇴 Romania']], channel_ids: [CHANNELS['balkans']], emoji: { name: '🌍', id: null } },
          { id: countryOptIds[4], title: 'Central Asia', role_ids: [roleMap['🇰🇿 Kazakhstan']], channel_ids: [CHANNELS['general']], emoji: { name: '🏜️', id: null } },
          { id: countryOptIds[5], title: 'Eastern Europe', role_ids: [roleMap['🇺🇦 Ukraine']], channel_ids: [CHANNELS['general']], emoji: { name: '🇪🇺', id: null } },
          { id: countryOptIds[6], title: 'Western Europe/NA', role_ids: [memberRoleId], channel_ids: [CHANNELS['general']], emoji: { name: '🌎', id: null } },
          { id: countryOptIds[7], title: 'Other', role_ids: [memberRoleId], channel_ids: [CHANNELS['general']], emoji: { name: '🗺️', id: null } },
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

  if (result.s < 400 && result.d.prompts) {
    console.log('✅ Onboarding enabled! Prompts:', result.d.prompts.length);
  } else {
    console.log('Result:', result.s, JSON.stringify(result.d).substring(0, 500));
  }

  ws.close();
}

run().catch(e => console.error('ERROR:', e.message));
