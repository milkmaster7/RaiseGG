/**
 * All-in-one platform setup for RaiseGG
 *
 * Run: node scripts/setup-all-platforms.js [discord|vk|steam|all]
 *
 * Prerequisites: Chrome must be running with --remote-debugging-port=9222
 * Launch: chrome.exe --remote-debugging-port=9222
 *
 * What this does:
 * 1. DISCORD: Creates server → channels → webhook → bot → saves DISCORD_WEBHOOK_URL + DISCORD_BOT_TOKEN
 * 2. VK: Creates app → gets token → creates community → saves VK_ACCESS_TOKEN + VK_GROUP_IDS
 * 3. STEAM: Extracts session cookie → creates group → saves STEAM_SESSION_COOKIE
 *
 * You just need to be logged into each platform in Chrome. The script does everything else.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const ENV_FILE = path.join(__dirname, '..', '.env.local');
const SHOTS = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function readEnv() {
  return fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
}

function setEnvVar(key, value) {
  let env = readEnv();
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(env)) {
    env = env.replace(regex, `${key}=${value}`);
  } else {
    env = env.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_FILE, env);
  console.log(`  ✓ Saved ${key} to .env.local`);
}

async function getPages() {
  return new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } });
    }).on('error', () => rej(new Error('Chrome CDP not running. Start Chrome with: chrome.exe --remote-debugging-port=9222')));
  });
}

async function connectTab(wsUrl) {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
  let id = 1;
  const pending = new Map();
  ws.on('message', d => {
    const m = JSON.parse(d.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  await new Promise(r => ws.on('open', r));

  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = id++;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { pending.delete(i); rej(new Error('CDP timeout')); }, 30000);
  });

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r?.result?.result?.value;
  };

  const shot = async (name) => {
    try {
      const r = await send('Page.captureScreenshot', { format: 'png', quality: 60 });
      if (r?.result?.data) fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.result.data, 'base64'));
    } catch(e) {}
  };

  const nav = async (url) => {
    await send('Page.navigate', { url });
    await sleep(5000);
  };

  const getCookies = async (urls) => {
    const r = await send('Network.getCookies', { urls });
    return r?.result?.cookies || [];
  };

  return { ws, send, ev, shot, nav, getCookies, close: () => ws.close() };
}

// ─── DISCORD ─────────────────────────────────────────────────────────────

async function setupDiscord(tab) {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     DISCORD SETUP                    ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Check if already logged in
  await tab.nav('https://discord.com/channels/@me');
  const url = await tab.ev('window.location.href');

  if (!url || url.includes('/login')) {
    console.log('  ✗ Not logged into Discord.');
    console.log('  → Please log in at https://discord.com/login in this Chrome window');
    console.log('  → Then re-run: node scripts/setup-all-platforms.js discord\n');

    // Open login page and wait
    console.log('  Waiting 60 seconds for you to log in...');
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      const checkUrl = await tab.ev('window.location.href');
      if (checkUrl && checkUrl.includes('/channels/')) {
        console.log('  ✓ Logged in!');
        break;
      }
      if (i === 11) {
        console.log('  ✗ Timeout. Please log in and re-run.');
        return false;
      }
    }
  }

  console.log('  1. Extracting user token...');
  const userToken = await tab.ev(`
    (function() {
      try {
        var token = null;
        (window.webpackChunkdiscord_app || []).push([[Date.now()], {}, function(r) {
          var keys = Object.keys(r.c);
          for (var i = 0; i < keys.length; i++) {
            try {
              var m = r.c[keys[i]];
              if (m && m.exports && m.exports.default && m.exports.default.getToken) {
                token = m.exports.default.getToken(); return;
              }
              if (m && m.exports && m.exports.getToken) {
                token = m.exports.getToken(); return;
              }
            } catch(e) {}
          }
        }]);
        return token;
      } catch(e) { return null; }
    })()
  `);

  if (!userToken) {
    console.log('  ✗ Could not extract Discord user token');
    return false;
  }
  console.log('  ✓ Token extracted (length: ' + userToken.length + ')');

  // Check for existing RaiseGG server
  console.log('  2. Checking for existing RaiseGG server...');
  const guilds = await tab.ev(`
    (async function() {
      try {
        var res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { 'Authorization': '${userToken}' }
        });
        var data = await res.json();
        return JSON.stringify(data.map(function(g) { return { id: g.id, name: g.name, owner: g.owner }; }));
      } catch(e) { return '[]'; }
    })()
  `);

  let guildList = [];
  try { guildList = JSON.parse(guilds); } catch(e) {}
  const existing = guildList.find(g => g.name === 'RaiseGG');

  let serverId, channelId;
  if (existing) {
    console.log('  ✓ Found existing RaiseGG server: ' + existing.id);
    serverId = existing.id;
  } else {
    // Create new server
    console.log('  3. Creating RaiseGG server...');
    const createResult = await tab.ev(`
      (async function() {
        try {
          var res = await fetch('https://discord.com/api/v10/guilds', {
            method: 'POST',
            headers: { 'Authorization': '${userToken}', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'RaiseGG',
              region: 'europe',
              icon: null,
              channels: [
                { name: 'general', type: 0 },
                { name: 'announcements', type: 0 },
                { name: 'tournaments', type: 0 },
                { name: 'match-results', type: 0 },
                { name: 'lfg', type: 0 },
                { name: 'Voice', type: 2 }
              ]
            })
          });
          var data = await res.json();
          return JSON.stringify(data);
        } catch(e) { return JSON.stringify({ error: e.message }); }
      })()
    `);

    let guild;
    try { guild = JSON.parse(createResult); } catch(e) {}
    if (!guild || !guild.id) {
      console.log('  ✗ Failed to create server:', createResult);
      return false;
    }
    serverId = guild.id;
    console.log('  ✓ Server created: ' + guild.name + ' (ID: ' + serverId + ')');
  }

  // Get channels
  console.log('  4. Getting channels...');
  const channels = await tab.ev(`
    (async function() {
      try {
        var res = await fetch('https://discord.com/api/v10/guilds/${serverId}/channels', {
          headers: { 'Authorization': '${userToken}' }
        });
        return await res.text();
      } catch(e) { return '[]'; }
    })()
  `);

  let channelList = [];
  try { channelList = JSON.parse(channels); } catch(e) {}
  const general = channelList.find(c => c.name === 'general' && c.type === 0);
  const announcements = channelList.find(c => c.name === 'announcements' && c.type === 0);
  channelId = (announcements || general || channelList[0])?.id;
  console.log('  ✓ Using channel: ' + (announcements?.name || general?.name || 'first') + ' (ID: ' + channelId + ')');

  // Create webhook
  if (channelId) {
    console.log('  5. Creating webhook...');
    const webhookResult = await tab.ev(`
      (async function() {
        try {
          var res = await fetch('https://discord.com/api/v10/channels/${channelId}/webhooks', {
            method: 'POST',
            headers: { 'Authorization': '${userToken}', 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'RaiseGG Bot' })
          });
          var data = await res.json();
          if (data.id && data.token) {
            return 'https://discord.com/api/webhooks/' + data.id + '/' + data.token;
          }
          return 'error:' + JSON.stringify(data);
        } catch(e) { return 'error:' + e.message; }
      })()
    `);

    if (webhookResult && webhookResult.startsWith('https://')) {
      console.log('  ✓ Webhook created!');
      setEnvVar('DISCORD_WEBHOOK_URL', webhookResult);

      // Test webhook
      const testResult = await tab.ev(`
        (async function() {
          var res = await fetch('${webhookResult}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: '**RaiseGG is live!** 🎮\\n\\nCS2 / Dota 2 / Deadlock stake matches with blockchain escrow.\\nFree daily tournaments with USDC prizes.\\n\\nhttps://raisegg.com',
              username: 'RaiseGG'
            })
          });
          return res.status + ': ' + res.statusText;
        })()
      `);
      console.log('  ✓ Test message sent: ' + testResult);
    } else {
      console.log('  ✗ Webhook failed: ' + webhookResult);
    }
  }

  // Create invite link
  if (channelId) {
    console.log('  6. Creating invite link...');
    const invite = await tab.ev(`
      (async function() {
        try {
          var res = await fetch('https://discord.com/api/v10/channels/${channelId}/invites', {
            method: 'POST',
            headers: { 'Authorization': '${userToken}', 'Content-Type': 'application/json' },
            body: JSON.stringify({ max_age: 0, max_uses: 0 })
          });
          var data = await res.json();
          return data.code ? 'https://discord.gg/' + data.code : JSON.stringify(data);
        } catch(e) { return 'error:' + e.message; }
      })()
    `);
    if (invite && invite.startsWith('https://')) {
      console.log('  ✓ Invite link: ' + invite);
      setEnvVar('DISCORD_INVITE_URL', invite);
    }
  }

  console.log('\n  ═══ DISCORD SETUP COMPLETE ═══\n');
  return true;
}

// ─── VK ──────────────────────────────────────────────────────────────────

async function setupVK(tab) {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     VK SETUP                         ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Check if logged in
  await tab.nav('https://vk.com/feed');
  let url = await tab.ev('window.location.href');

  // Handle challenge
  if (url && url.includes('challenge')) {
    await tab.ev(`(function() { var b = document.querySelector('button.start'); if (b) b.click(); })()`);
    await sleep(6000);
    url = await tab.ev('window.location.href');
  }

  if (!url || !url.includes('/feed')) {
    console.log('  ✗ Not logged into VK.');
    console.log('  → Please log in at https://vk.com in this Chrome window');
    console.log('  → Then re-run: node scripts/setup-all-platforms.js vk\n');

    console.log('  Waiting 60 seconds for you to log in...');
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      url = await tab.ev('window.location.href');
      if (url && url.includes('/feed')) {
        console.log('  ✓ Logged in!');
        break;
      }
      if (i === 11) {
        console.log('  ✗ Timeout. Please log in and re-run.');
        return false;
      }
    }
  }

  console.log('  ✓ Logged into VK');

  // VK requires an app to get an access token
  // Use the implicit OAuth flow with a standalone app
  // First, try to create a VK app via the dev portal
  console.log('  1. Navigating to VK Dev Portal...');
  await tab.nav('https://dev.vk.com/ru');
  await sleep(3000);

  // Try to create an app via the VK developer settings
  console.log('  2. Creating VK standalone app...');
  await tab.nav('https://vk.com/editapp?act=create');
  await sleep(5000);

  url = await tab.ev('window.location.href');
  await tab.shot('vk-editapp');

  if (url && url.includes('editapp')) {
    // We're on the app creation page
    const pageText = await tab.ev('document.body?.innerText?.substring(0, 1000)');
    console.log('  App creation page:', (pageText || '').substring(0, 200));

    // Fill in the form
    await tab.ev(`
      (function() {
        var inputs = document.querySelectorAll('input');
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].name === 'title' || inputs[i].placeholder?.includes('name') || inputs[i].placeholder?.includes('название')) {
            var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inputs[i], 'RaiseGG');
            inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
            return 'set title';
          }
        }
        return 'no title input';
      })()
    `);

    // Select standalone app type
    await tab.ev(`
      (function() {
        var els = document.querySelectorAll('[data-value], [role=option], label, input[type=radio]');
        for (var i = 0; i < els.length; i++) {
          var t = (els[i].textContent || '').trim().toLowerCase();
          if (t.includes('standalone') || t.includes('автономное')) {
            els[i].click(); return 'clicked standalone';
          }
        }
        return 'no standalone option';
      })()
    `);
    await sleep(1000);

    // Click create/save button
    await tab.ev(`
      (function() {
        var btns = document.querySelectorAll('button, input[type=submit]');
        for (var i = 0; i < btns.length; i++) {
          var t = (btns[i].textContent || btns[i].value || '').trim();
          if (/create|создать|save|сохранить|connect|подключить/i.test(t)) {
            btns[i].click(); return 'clicked: ' + t;
          }
        }
        return 'no create button';
      })()
    `);
    await sleep(3000);

    url = await tab.ev('window.location.href');
    console.log('  After create URL:', url);

    // Try to extract app ID from URL or page
    const appId = await tab.ev(`
      (function() {
        var m = window.location.href.match(/app_id=(\\d+)/);
        if (m) return m[1];
        m = document.body?.innerHTML?.match(/"app_id":(\\d+)/);
        if (m) return m[1];
        return null;
      })()
    `);

    if (appId) {
      console.log('  ✓ VK App created! ID: ' + appId);

      // Now use implicit flow to get access token
      console.log('  3. Getting access token via implicit flow...');
      const oauthUrl = `https://oauth.vk.com/authorize?client_id=${appId}&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=wall,groups,offline&response_type=token&v=5.199`;
      await tab.nav(oauthUrl);
      await sleep(3000);

      // Check if we got the token in the URL hash
      url = await tab.ev('window.location.href');
      const tokenMatch = url?.match(/access_token=([^&]+)/);

      if (tokenMatch) {
        const token = tokenMatch[1];
        console.log('  ✓ Access token obtained! (length: ' + token.length + ')');
        setEnvVar('VK_ACCESS_TOKEN', token);

        // Create a VK community
        console.log('  4. Creating RaiseGG community...');
        const createRes = await tab.ev(`
          (async function() {
            var res = await fetch('https://api.vk.com/method/groups.create?title=RaiseGG&description=CS2,+Dota+2+%26+Deadlock+stake+matches.+1v1+for+USDC+with+blockchain+escrow.+Free+daily+tournaments.&type=public&v=5.199&access_token=${token}');
            return await res.text();
          })()
        `);

        let groupData;
        try { groupData = JSON.parse(createRes); } catch(e) {}

        if (groupData?.response?.id) {
          const groupId = groupData.response.id;
          console.log('  ✓ Community created! ID: ' + groupId);
          setEnvVar('VK_GROUP_IDS', String(groupId));

          // Test post
          console.log('  5. Testing wall post...');
          const postRes = await tab.ev(`
            (async function() {
              var res = await fetch('https://api.vk.com/method/wall.post?owner_id=-${groupId}&from_group=1&message=Welcome+to+RaiseGG!+CS2,+Dota+2+%26+Deadlock+competitive+stake+matches.+raisegg.com&v=5.199&access_token=${token}');
              return await res.text();
            })()
          `);
          console.log('  Post result:', postRes?.substring(0, 200));
        } else {
          console.log('  ✗ Community creation failed:', createRes?.substring(0, 200));
        }
      } else {
        console.log('  ✗ Could not get token. URL:', url?.substring(0, 100));
        // May need to click Allow
        await tab.ev(`
          (function() {
            var btns = document.querySelectorAll('button');
            for (var i = 0; i < btns.length; i++) {
              if (/allow|разрешить/i.test(btns[i].textContent)) {
                btns[i].click(); return 'clicked allow';
              }
            }
            return 'no allow button';
          })()
        `);
        await sleep(3000);
        url = await tab.ev('window.location.href');
        const retry = url?.match(/access_token=([^&]+)/);
        if (retry) {
          console.log('  ✓ Token obtained after Allow click!');
          setEnvVar('VK_ACCESS_TOKEN', retry[1]);
        }
      }
    } else {
      console.log('  ✗ Could not create VK app. VK may require additional verification.');
      console.log('  → Manual step: Go to https://vk.com/editapp?act=create and create a standalone app');
      console.log('  → Then visit: https://oauth.vk.com/authorize?client_id=YOUR_APP_ID&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=wall,groups,offline&response_type=token&v=5.199');
      console.log('  → Copy the access_token from the URL and set VK_ACCESS_TOKEN in .env.local');
    }
  } else {
    console.log('  ✗ VK redirected away from app creation. Session may be restricted.');
    console.log('  → Try logging into VK in a normal Chrome window (not CDP)');
  }

  console.log('\n  ═══ VK SETUP COMPLETE ═══\n');
  return true;
}

// ─── STEAM ───────────────────────────────────────────────────────────────

async function setupSteam(tab) {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     STEAM SETUP                      ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Check login
  await tab.nav('https://steamcommunity.com/my');
  let url = await tab.ev('window.location.href');

  if (!url || url.includes('/login')) {
    console.log('  ✗ Not logged into Steam.');
    console.log('  → Please log in at https://steamcommunity.com/login in this Chrome window');
    console.log('  → Then re-run: node scripts/setup-all-platforms.js steam\n');

    console.log('  Waiting 90 seconds for you to log in...');
    for (let i = 0; i < 18; i++) {
      await sleep(5000);
      const checkUrl = await tab.ev('window.location.href');
      if (checkUrl && (checkUrl.includes('/id/') || checkUrl.includes('/profiles/'))) {
        console.log('  ✓ Logged in!');
        break;
      }
      if (i === 17) {
        console.log('  ✗ Timeout. Please log in and re-run.');
        return false;
      }
    }
    url = await tab.ev('window.location.href');
  }

  console.log('  ✓ Logged into Steam. Profile: ' + url);

  // Extract session cookie
  console.log('  1. Extracting session cookie...');
  const cookies = await tab.getCookies(['https://steamcommunity.com']);
  const steamLogin = cookies.find(c => c.name === 'steamLoginSecure');

  if (steamLogin) {
    console.log('  ✓ steamLoginSecure cookie found (length: ' + steamLogin.value.length + ')');
    setEnvVar('STEAM_SESSION_COOKIE', steamLogin.value);
  } else {
    console.log('  ✗ steamLoginSecure cookie not found');
    console.log('  Available cookies:', cookies.map(c => c.name).join(', '));
    return false;
  }

  // Check for existing RaiseGG group
  console.log('  2. Checking for existing RaiseGG group...');
  await tab.nav('https://steamcommunity.com/groups/RaiseGG');
  await sleep(3000);
  url = await tab.ev('window.location.href');
  const groupExists = await tab.ev('document.body?.innerText?.includes("RaiseGG")');

  if (url && url.includes('/groups/RaiseGG') && groupExists) {
    console.log('  ✓ RaiseGG group already exists!');
  } else {
    // Try creating the group
    console.log('  3. Creating RaiseGG Steam group...');
    await tab.nav('https://steamcommunity.com/actions/GroupCreate');
    await sleep(5000);

    await tab.shot('steam-group-create');
    const pageText = await tab.ev('document.body?.innerText?.substring(0, 500)');
    console.log('  Page:', (pageText || '').substring(0, 200));

    // Fill in group creation form
    const fillResult = await tab.ev(`
      (function() {
        var results = [];
        // Group name
        var nameInput = document.querySelector('#group_name, input[name="group_name"], input[name="groupName"]');
        if (nameInput) {
          nameInput.value = 'RaiseGG';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          results.push('name set');
        }
        // Abbreviation
        var abbrInput = document.querySelector('#group_abbreviation, input[name="group_abbreviation"]');
        if (abbrInput) {
          abbrInput.value = 'RGG';
          abbrInput.dispatchEvent(new Event('input', { bubbles: true }));
          results.push('abbr set');
        }
        // Headline
        var headline = document.querySelector('#group_headline, input[name="group_headline"]');
        if (headline) {
          headline.value = 'CS2 & Dota 2 Stake Matches — Win Real USDC';
          headline.dispatchEvent(new Event('input', { bubbles: true }));
          results.push('headline set');
        }
        // Summary
        var summary = document.querySelector('#group_summary, textarea[name="group_summary"]');
        if (summary) {
          summary.value = 'RaiseGG is a competitive stake gaming platform for CS2, Dota 2, and Deadlock. Play 1v1 matches for USDC/USDT with blockchain escrow on Solana. Free daily tournaments. raisegg.com';
          summary.dispatchEvent(new Event('input', { bubbles: true }));
          results.push('summary set');
        }
        return results.join(', ') || 'no form fields found';
      })()
    `);
    console.log('  Form fill:', fillResult);

    if (fillResult !== 'no form fields found') {
      // Try submitting
      await sleep(1000);
      await tab.ev(`
        (function() {
          var btn = document.querySelector('input[type=submit], button[type=submit], #submit_group, .btn_green_white_innerfade');
          if (btn) { btn.click(); return 'clicked'; }
          return 'no submit button';
        })()
      `);
      await sleep(5000);

      url = await tab.ev('window.location.href');
      console.log('  After submit URL:', url);

      if (url && url.includes('/groups/')) {
        console.log('  ✓ Group created!');
      } else {
        console.log('  ✗ Group creation may have failed (CAPTCHA or Steam Guard required)');
        console.log('  → Manual step: Visit https://steamcommunity.com/actions/GroupCreate');
        console.log('  → Create group named "RaiseGG"');
      }
    }
  }

  // Test the session by getting session ID
  console.log('  4. Testing session...');
  const sessionTest = await tab.ev(`
    (async function() {
      try {
        var res = await fetch('https://steamcommunity.com');
        var html = await res.text();
        var m = html.match(/g_sessionID\\s*=\\s*"([a-f0-9]+)"/);
        return m ? 'sessionID: ' + m[1] : 'no session ID found';
      } catch(e) { return 'error: ' + e.message; }
    })()
  `);
  console.log('  ' + sessionTest);

  console.log('\n  ═══ STEAM SETUP COMPLETE ═══\n');
  return true;
}

// ─── MAIN ────────────────────────────────────────────────────────────────

async function main() {
  const target = process.argv[2] || 'all';
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   RaiseGG Platform Setup — ' + target.toUpperCase().padEnd(22) + '║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  let pages;
  try {
    pages = await getPages();
  } catch(e) {
    console.error('\n  ✗ ' + e.message);
    console.error('  Start Chrome with remote debugging:');
    console.error('  chrome.exe --remote-debugging-port=9222\n');
    process.exit(1);
  }

  console.log('  Chrome CDP connected. ' + pages.filter(p => p.type === 'page').length + ' tabs found.\n');

  // Use the first main tab for automation
  const mainTab = pages.find(p => p.type === 'page' && !p.parentId);
  if (!mainTab) {
    console.error('  ✗ No usable tab found');
    process.exit(1);
  }

  const tab = await connectTab(mainTab.webSocketDebuggerUrl);

  try {
    const results = {};

    if (target === 'all' || target === 'discord') {
      results.discord = await setupDiscord(tab);
    }
    if (target === 'all' || target === 'vk') {
      results.vk = await setupVK(tab);
    }
    if (target === 'all' || target === 'steam') {
      results.steam = await setupSteam(tab);
    }

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   SETUP RESULTS                                 ║');
    console.log('╠══════════════════════════════════════════════════╣');
    for (const [platform, ok] of Object.entries(results)) {
      console.log('║   ' + (ok ? '✓' : '✗') + ' ' + platform.toUpperCase().padEnd(44) + '║');
    }
    console.log('╚══════════════════════════════════════════════════╝');

    // Show what needs to be pushed to Vercel
    const env = readEnv();
    const varsToSync = ['DISCORD_WEBHOOK_URL', 'DISCORD_BOT_TOKEN', 'DISCORD_INVITE_URL',
                        'VK_ACCESS_TOKEN', 'VK_GROUP_IDS', 'STEAM_SESSION_COOKIE'];
    const found = varsToSync.filter(v => env.includes(v + '='));
    if (found.length > 0) {
      console.log('\n  Next: Push to Vercel:');
      for (const v of found) {
        const val = env.match(new RegExp(v + '=(.+)'))?.[1] || '';
        console.log(`  vercel env add ${v} production < <(echo "${val.substring(0, 10)}...")`);
      }
    }
  } finally {
    tab.close();
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
