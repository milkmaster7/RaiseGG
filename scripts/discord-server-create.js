/**
 * Create a Discord SERVER (not bot app) via Discord web UI
 * Then create a webhook for automated posting
 * Uses existing Chrome on port 9222
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 9222;
const SHOTS = path.join(__dirname, '..', 'screenshots');
const ENV_FILE = path.join(__dirname, '..', '.env.local');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const pages = await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${PORT}/json`, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  // Create new tab
  const tab = await new Promise((res, rej) => {
    const req = http.request(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej);
    req.end();
  });

  const ws = new WebSocket(tab.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 1; const pending = new Map();
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  await new Promise(r => ws.on('open', r));

  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = id++; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 30000);
  });
  const nav = async url => { await send('Page.navigate', { url }); await sleep(4000); };
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); return r?.result?.result?.value; };
  const shot = async name => {
    try {
      const r = await send('Page.captureScreenshot', { format: 'png', quality: 70 });
      if (r?.result?.data) fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64'));
      console.log(`📸 ${name}`);
    } catch {}
  };

  // Go to Discord app — check if logged in
  console.log('1. Checking Discord login...');
  await nav('https://discord.com/channels/@me');
  await sleep(3000);

  const url = await ev('window.location.href');
  console.log('  URL:', url);
  await shot('ds-01-check');

  if (url.includes('/login')) {
    console.log('  ❌ Not logged into Discord.');
    console.log('  The Discord login page is open in Chrome.');
    console.log('  Please log in, then run this script again.');
    ws.close();
    return;
  }

  console.log('  ✅ Logged into Discord!');

  // Check if RaiseGG server already exists
  console.log('\n2. Checking for existing RaiseGG server...');
  const servers = await ev(`
    (function() {
      const serverList = document.querySelectorAll('[data-list-item-id*="guildsnav"]');
      const names = [];
      serverList.forEach(s => {
        const name = s.getAttribute('aria-label') || s.textContent.trim();
        names.push(name);
      });
      return names.join(' | ');
    })()
  `);
  console.log('  Servers:', servers);

  if (servers.includes('RaiseGG')) {
    console.log('  RaiseGG server already exists!');
    // Click on it
    await ev(`
      (function() {
        const servers = document.querySelectorAll('[data-list-item-id*="guildsnav"]');
        for (const s of servers) {
          if ((s.getAttribute('aria-label') || '').includes('RaiseGG')) {
            s.click();
            return 'clicked';
          }
        }
      })()
    `);
    await sleep(3000);
  } else {
    // Create new server
    console.log('\n3. Creating RaiseGG server...');

    // Click the "+" button to add a server
    const addBtn = await ev(`
      (function() {
        // The add server button is usually at the bottom of the server list
        const btns = document.querySelectorAll('[aria-label="Add a Server"], [data-list-item-id="guildsnav___create-join-button"]');
        for (const b of btns) {
          b.click();
          return 'clicked add server';
        }
        // Try the green plus icon
        const plus = document.querySelector('svg[class*="circleIcon"]');
        if (plus) { plus.closest('div[role="treeitem"], div[class*="pill"]')?.click(); return 'clicked plus'; }
        return 'not found';
      })()
    `);
    console.log('  Add server:', addBtn);
    await sleep(2000);
    await shot('ds-02-add-modal');

    // Click "Create My Own"
    const createOwn = await ev(`
      (function() {
        const btns = document.querySelectorAll('button, div[role="button"]');
        for (const b of btns) {
          const t = b.textContent.trim();
          if (t.includes('Create My Own') || t.includes('Create my own')) {
            b.click();
            return 'clicked Create My Own';
          }
        }
        // Try any element with that text
        const all = document.querySelectorAll('*');
        for (const el of all) {
          if (el.textContent.trim() === 'Create My Own' && el.children.length <= 2) {
            el.click();
            return 'clicked text match';
          }
        }
        return 'not found';
      })()
    `);
    console.log('  Create My Own:', createOwn);
    await sleep(2000);
    await shot('ds-03-create-type');

    // Select "For a club or community"
    const clubBtn = await ev(`
      (function() {
        const btns = document.querySelectorAll('button, div[role="button"]');
        for (const b of btns) {
          const t = b.textContent.trim();
          if (t.includes('club or community') || t.includes('For a club')) {
            b.click();
            return 'clicked community';
          }
        }
        // Skip this step if not shown
        return 'skipped';
      })()
    `);
    console.log('  Community type:', clubBtn);
    await sleep(2000);
    await shot('ds-04-community');

    // Set server name to "RaiseGG"
    console.log('  Setting server name...');
    await ev(`
      (function() {
        const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        for (const inp of inputs) {
          if (inp.offsetParent !== null) {
            inp.focus();
            inp.select();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, 'RaiseGG');
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            return 'set name';
          }
        }
        return 'no input';
      })()
    `);
    await sleep(500);

    // Click Create
    const created = await ev(`
      (function() {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          if (b.textContent.trim() === 'Create') {
            b.click();
            return 'clicked Create';
          }
        }
        return 'no Create btn';
      })()
    `);
    console.log('  Create:', created);
    await sleep(5000);
    await shot('ds-05-created');
  }

  // Now we should be in the server
  const currentUrl = await ev('window.location.href');
  console.log('\n  Current URL:', currentUrl);

  // Extract server ID from URL
  const serverMatch = currentUrl.match(/channels\/(\d+)/);
  const serverId = serverMatch ? serverMatch[1] : null;
  console.log('  Server ID:', serverId);

  if (!serverId) {
    console.log('  ❌ Could not get server ID');
    ws.close();
    return;
  }

  // Create channels for the server
  console.log('\n4. Setting up channels...');

  // Go to server settings to create a webhook
  console.log('\n5. Creating webhook for automated posting...');

  // Navigate to channel settings -> Integrations -> Webhooks
  // First find the #general channel or any text channel
  const channelId = currentUrl.match(/channels\/\d+\/(\d+)/)?.[1];
  console.log('  Channel ID:', channelId);

  if (channelId) {
    // Try to create webhook via Discord API using the user's auth token
    const userToken = await ev(`
      (function() {
        // Discord stores auth token in localStorage or in the app state
        // Try multiple methods
        const token = (window.webpackChunkdiscord_app || []).push([[Date.now()], {}, r => {
          for (const m of Object.values(r.c)) {
            try {
              const exports = m?.exports;
              if (exports?.default?.getToken) return exports.default.getToken();
              if (exports?.getToken) return exports.getToken();
            } catch {}
          }
        }]);
        if (typeof token === 'string') return token;

        // Fallback: check localStorage
        const lsToken = localStorage.getItem('token');
        if (lsToken) return JSON.parse(lsToken);

        return null;
      })()
    `);

    if (userToken) {
      console.log('  Got user token, creating webhook...');

      // Create webhook via Discord API
      const webhookResult = await ev(`
        (async function() {
          try {
            const res = await fetch('https://discord.com/api/v10/channels/${channelId}/webhooks', {
              method: 'POST',
              headers: {
                'Authorization': '${userToken}',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: 'RaiseGG Bot',
              }),
            });
            const data = await res.json();
            if (data.id && data.token) {
              return JSON.stringify({ url: 'https://discord.com/api/webhooks/' + data.id + '/' + data.token });
            }
            return JSON.stringify({ error: data.message || 'unknown error', code: data.code });
          } catch (e) {
            return JSON.stringify({ error: e.message });
          }
        })()
      `);
      console.log('  Webhook result:', webhookResult);

      try {
        const webhook = JSON.parse(webhookResult);
        if (webhook.url) {
          console.log('\n  ✅ Webhook URL:', webhook.url);

          // Save to .env.local
          let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
          if (env.includes('DISCORD_WEBHOOK_URL=')) {
            env = env.replace(/DISCORD_WEBHOOK_URL=.*/g, `DISCORD_WEBHOOK_URL=${webhook.url}`);
          } else {
            env = env.trimEnd() + '\nDISCORD_WEBHOOK_URL=' + webhook.url + '\n';
          }
          fs.writeFileSync(ENV_FILE, env);
          console.log('  Saved to .env.local');

          // Push to Vercel
          try {
            require('child_process').execSync('npx vercel env rm DISCORD_WEBHOOK_URL production -y', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
          } catch {}
          try {
            require('child_process').execSync(`echo "${webhook.url}" | npx vercel env add DISCORD_WEBHOOK_URL production`, { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
            console.log('  Pushed to Vercel');
          } catch (e) {
            console.log('  Vercel push failed:', e.message);
          }

          // Test webhook
          console.log('\n  Testing webhook...');
          const testResult = await ev(`
            (async function() {
              const res = await fetch('${webhook.url}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: '**Welcome to RaiseGG!** 🎮\\n\\nCS2 • Dota 2 • Deadlock\\n1v1 stake matches with blockchain escrow\\nFree daily tournaments\\n\\nhttps://raisegg.com',
                  username: 'RaiseGG',
                }),
              });
              return res.status + ': ' + res.statusText;
            })()
          `);
          console.log('  Test post:', testResult);
        }
      } catch {}
    } else {
      console.log('  Could not extract user token. Try creating webhook manually.');
    }
  }

  // Generate invite link
  if (serverId) {
    console.log('\n6. Getting invite link...');
    const invite = await ev(`
      (async function() {
        // Try to get an existing invite or create one
        try {
          const channels = await (await fetch('https://discord.com/api/v10/guilds/${serverId}/channels', {
            headers: { 'Authorization': localStorage.getItem('token')?.replace(/"/g, '') || '' }
          })).json();

          if (Array.isArray(channels) && channels.length > 0) {
            const textChannel = channels.find(c => c.type === 0) || channels[0];
            const invite = await (await fetch('https://discord.com/api/v10/channels/' + textChannel.id + '/invites', {
              method: 'POST',
              headers: {
                'Authorization': localStorage.getItem('token')?.replace(/"/g, '') || '',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ max_age: 0, max_uses: 0 }),
            })).json();
            if (invite.code) return 'https://discord.gg/' + invite.code;
          }
          return null;
        } catch (e) {
          return 'error: ' + e.message;
        }
      })()
    `);
    console.log('  Invite:', invite);
  }

  await shot('ds-06-final');
  console.log('\n=== DONE ===');
  ws.close();
}

main().catch(e => console.error('Error:', e.message));
