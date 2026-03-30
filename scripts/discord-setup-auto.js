/**
 * Create Discord server + webhook using existing logged-in tab
 * Uses Chrome CDP on port 9222 — connects to existing Discord tab
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const SHOTS = path.join(__dirname, '..', 'screenshots');
const ENV_FILE = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const pages = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const tab = pages.find(p => p.url.includes('discord.com/channels'));
  if (!tab) {
    console.log('No logged-in Discord tab. Tabs:', pages.map(p => p.url).join(', '));
    return;
  }
  console.log('Found tab:', tab.url);

  const ws = new WebSocket(tab.webSocketDebuggerUrl, { perMessageDeflate: false });
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
    setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 30000);
  });

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r && r.result && r.result.result ? r.result.result.value : undefined;
  };

  const shot = async (name) => {
    try {
      const r = await send('Page.captureScreenshot', { format: 'png', quality: 70 });
      if (r && r.result && r.result.data) {
        fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.result.data, 'base64'));
      }
    } catch (e) {}
  };

  // Step 1: Check for existing RaiseGG server
  console.log('\n1. Checking servers...');
  const servers = await ev(`
    (function() {
      var list = document.querySelectorAll('[data-list-item-id*="guildsnav"]');
      var names = [];
      list.forEach(function(s) { names.push(s.getAttribute('aria-label') || s.textContent.trim()); });
      return names.join(' | ');
    })()
  `);
  console.log('  Servers:', servers);

  if (servers && servers.includes('RaiseGG')) {
    console.log('  RaiseGG already exists! Clicking on it...');
    await ev(`
      (function() {
        var list = document.querySelectorAll('[data-list-item-id*="guildsnav"]');
        for (var i = 0; i < list.length; i++) {
          if ((list[i].getAttribute('aria-label') || '').includes('RaiseGG')) {
            list[i].click(); return 'clicked';
          }
        }
      })()
    `);
    await sleep(3000);
  } else {
    // Create server
    console.log('\n2. Creating RaiseGG server...');

    // Click + button
    var addBtn = await ev(`
      (function() {
        var btn = document.querySelector('[data-list-item-id="guildsnav___create-join-button"]');
        if (btn) { btn.click(); return 'clicked'; }
        var btn2 = document.querySelector('[aria-label="Add a Server"]');
        if (btn2) { btn2.click(); return 'clicked2'; }
        return 'not found';
      })()
    `);
    console.log('  Add server:', addBtn);
    await sleep(2000);
    await shot('dc-02-add');

    // Click Create My Own
    var createOwn = await ev(`
      (function() {
        var els = document.querySelectorAll('button, div[role="button"]');
        for (var i = 0; i < els.length; i++) {
          if (els[i].textContent.trim().includes('Create My Own')) { els[i].click(); return 'clicked'; }
        }
        return 'not found';
      })()
    `);
    console.log('  Create My Own:', createOwn);
    await sleep(2000);

    // Select community type
    var club = await ev(`
      (function() {
        var els = document.querySelectorAll('button, div[role="button"]');
        for (var i = 0; i < els.length; i++) {
          var t = els[i].textContent.trim();
          if (t.includes('club or community') || t.includes('For a club')) { els[i].click(); return 'clicked'; }
        }
        return 'skipped';
      })()
    `);
    console.log('  Community:', club);
    await sleep(2000);

    // Set name
    await ev(`
      (function() {
        var inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        for (var i = 0; i < inputs.length; i++) {
          var inp = inputs[i];
          if (inp.offsetParent !== null) {
            inp.focus(); inp.select();
            var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, 'RaiseGG');
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            return 'set';
          }
        }
        return 'no input';
      })()
    `);
    await sleep(500);

    // Click Create
    var created = await ev(`
      (function() {
        var btns = document.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].textContent.trim() === 'Create') { btns[i].click(); return 'clicked'; }
        }
        return 'not found';
      })()
    `);
    console.log('  Create:', created);
    await sleep(5000);
    await shot('dc-03-created');
  }

  // Get current URL
  var currentUrl = await ev('window.location.href');
  console.log('\n  URL:', currentUrl);

  var serverMatch = currentUrl.match(/channels\/(\d+)/);
  var serverId = serverMatch ? serverMatch[1] : null;
  var channelMatch = currentUrl.match(/channels\/\d+\/(\d+)/);
  var channelId = channelMatch ? channelMatch[1] : null;
  console.log('  Server ID:', serverId, 'Channel ID:', channelId);

  if (!channelId) {
    console.log('  No channel found');
    ws.close();
    return;
  }

  // Get user token
  console.log('\n3. Getting token...');
  var userToken = await ev(`
    (function() {
      try {
        var token = null;
        (window.webpackChunkdiscord_app || []).push([[Date.now()], {}, function(r) {
          var keys = Object.keys(r.c);
          for (var i = 0; i < keys.length; i++) {
            try {
              var m = r.c[keys[i]];
              if (m && m.exports && m.exports.default && m.exports.default.getToken) {
                token = m.exports.default.getToken();
                return;
              }
              if (m && m.exports && m.exports.getToken) {
                token = m.exports.getToken();
                return;
              }
            } catch(e) {}
          }
        }]);
        return token;
      } catch(e) { return null; }
    })()
  `);

  if (!userToken) {
    console.log('  Could not get token');
    ws.close();
    return;
  }
  console.log('  Token length:', userToken.length);

  // Create webhook
  console.log('\n4. Creating webhook...');
  var webhookResult = await ev(`
    (async function() {
      try {
        var res = await fetch("https://discord.com/api/v10/channels/${channelId}/webhooks", {
          method: "POST",
          headers: { "Authorization": "${userToken}", "Content-Type": "application/json" },
          body: JSON.stringify({ name: "RaiseGG Bot" }),
        });
        var data = await res.json();
        if (data.id && data.token) {
          return JSON.stringify({ url: "https://discord.com/api/webhooks/" + data.id + "/" + data.token });
        }
        return JSON.stringify({ error: data.message || JSON.stringify(data) });
      } catch(e) { return JSON.stringify({ error: e.message }); }
    })()
  `);
  console.log('  Result:', webhookResult);

  try {
    var wh = JSON.parse(webhookResult);
    if (wh.url) {
      console.log('\n  WEBHOOK URL:', wh.url);

      // Save to .env.local
      var env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
      if (env.includes('DISCORD_WEBHOOK_URL=')) {
        env = env.replace(/DISCORD_WEBHOOK_URL=.*/g, 'DISCORD_WEBHOOK_URL=' + wh.url);
      } else {
        env = env.trimEnd() + '\nDISCORD_WEBHOOK_URL=' + wh.url + '\n';
      }
      fs.writeFileSync(ENV_FILE, env);
      console.log('  Saved to .env.local');

      // Test webhook
      console.log('\n5. Testing webhook...');
      var testResult = await ev(`
        (async function() {
          var res = await fetch("${wh.url}", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: "**Welcome to RaiseGG!**\\n\\nCS2 / Dota 2 / Deadlock\\n1v1 stake matches with blockchain escrow\\nFree daily tournaments\\n\\nhttps://raisegg.com",
              username: "RaiseGG",
            }),
          });
          return res.status + ": " + res.statusText;
        })()
      `);
      console.log('  Test post:', testResult);
    }
  } catch(e) {
    console.log('  Parse error:', e.message);
  }

  // Create invite
  if (serverId) {
    console.log('\n6. Creating invite...');
    var invite = await ev(`
      (async function() {
        try {
          var res = await fetch("https://discord.com/api/v10/channels/${channelId}/invites", {
            method: "POST",
            headers: { "Authorization": "${userToken}", "Content-Type": "application/json" },
            body: JSON.stringify({ max_age: 0, max_uses: 0 }),
          });
          var data = await res.json();
          return data.code ? "https://discord.gg/" + data.code : JSON.stringify(data);
        } catch(e) { return e.message; }
      })()
    `);
    console.log('  Invite:', invite);
  }

  await shot('dc-04-done');
  console.log('\n=== DISCORD DONE ===');
  ws.close();
}

main().catch(e => console.error('Error:', e.message));
