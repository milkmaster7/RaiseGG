/**
 * Click "Create blank app" link in the Start building overlay
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

  const tab = pages.find(p => p.type === 'page' && p.url.includes('discord.com'));
  if (!tab) { console.log('No Discord tab'); return; }

  const ws = new WebSocket(tab.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 1; const pending = new Map();
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  await new Promise(r => ws.on('open', r));

  const ev = async expr => {
    const r = await new Promise((res, rej) => {
      const i = id++; pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 30000);
    });
    return r?.result?.result?.value;
  };
  const shot = async name => {
    try {
      const r = await new Promise((res, rej) => {
        const i = id++; pending.set(i, res);
        ws.send(JSON.stringify({ id: i, method: 'Page.captureScreenshot', params: { format: 'png', quality: 70 } }));
        setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 10000);
      });
      if (r?.result?.data) fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64'));
      console.log(`📸 ${name}`);
    } catch {}
  };

  // First go to applications page
  await new Promise((res, rej) => {
    const i = id++; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method: 'Page.navigate', params: { url: 'https://discord.com/developers/applications' } }));
    setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 30000);
  });
  await sleep(4000);

  // Check if on login page
  const url = await ev('window.location.href');
  if (url.includes('/login')) {
    console.log('❌ On login page. Cannot proceed without Discord credentials.');
    ws.close();
    return;
  }

  await shot('dba-01');

  // Look for all clickable text on page
  const allText = await ev(`
    (function() {
      const clickable = [];
      const els = document.querySelectorAll('button, a, [role="button"], [class*="click"]');
      for (const el of els) {
        const text = el.textContent.trim();
        if (text && text.length < 60) clickable.push(text);
      }
      return clickable.join(' | ');
    })()
  `);
  console.log('Clickable elements:', allText);

  // Try "Create blank app" or similar
  const result = await ev(`
    (function() {
      const els = document.querySelectorAll('a, button, span, div');
      for (const el of els) {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes('create blank') || text === 'create blank app') {
          el.click();
          return 'clicked: ' + el.textContent.trim();
        }
      }
      // Try "Skip" or close the overlay
      for (const el of els) {
        const text = el.textContent.trim().toLowerCase();
        if (text === 'skip' || text === 'not now') {
          el.click();
          return 'clicked: ' + el.textContent.trim();
        }
      }
      return 'not found';
    })()
  `);
  console.log('Action:', result);
  await sleep(3000);
  await shot('dba-02');

  // Try the form behind the overlay — remove overlay first
  console.log('\nRemoving all overlays...');
  await ev(`
    (function() {
      // Remove the "Start building" modal entirely
      const modals = document.querySelectorAll('[class*="modal"], [role="dialog"], [class*="overlay"]');
      for (const m of modals) {
        const text = m.innerText || '';
        if (text.includes('Start building') || text.includes('Integrate Discord')) {
          m.style.display = 'none';
          m.style.visibility = 'hidden';
          m.style.pointerEvents = 'none';
        }
      }
      // Remove backdrops
      const bgs = document.querySelectorAll('[class*="backdrop"], [class*="Backdrop"]');
      for (const b of bgs) {
        b.style.display = 'none';
        b.style.pointerEvents = 'none';
      }
      // Enable pointer events on body
      document.body.style.pointerEvents = 'auto';
      // Re-enable overflow
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    })()
  `);
  await sleep(500);
  await shot('dba-03-clean');

  // Now click New Application on the clean page
  const newApp = await ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim() === 'New Application') {
          b.click();
          return 'clicked New Application';
        }
      }
      return 'not found';
    })()
  `);
  console.log('New App:', newApp);
  await sleep(3000);

  // Hide any new overlay
  await ev(`
    (function() {
      const modals = document.querySelectorAll('[class*="modal"], [role="dialog"]');
      for (const m of modals) {
        if ((m.innerText || '').includes('Start building')) {
          m.style.display = 'none';
          m.style.pointerEvents = 'none';
        }
      }
      const bgs = document.querySelectorAll('[class*="backdrop"]');
      for (const b of bgs) { b.style.display = 'none'; b.style.pointerEvents = 'none'; }
    })()
  `);
  await sleep(500);
  await shot('dba-04-create-form');

  // Check for the create form
  const formState = await ev(`
    (function() {
      const inputs = document.querySelectorAll('input');
      const visible = [];
      for (const inp of inputs) {
        if (inp.offsetParent !== null) {
          visible.push(inp.type + ':' + inp.name + ':' + inp.placeholder);
        }
      }
      return 'visible inputs: ' + visible.join(', ');
    })()
  `);
  console.log('Form:', formState);

  // Fill and submit
  await ev(`
    (function() {
      const inputs = document.querySelectorAll('input');
      for (const inp of inputs) {
        if (inp.offsetParent !== null && inp.type === 'text') {
          inp.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(inp, 'RaiseGG');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (inp.type === 'checkbox' && !inp.checked) {
          inp.click();
        }
      }
    })()
  `);
  await sleep(500);

  // Click the Create button (not the Start building overlay one)
  const createClicked = await ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      // Find Create buttons, prefer the one in the "Create a new app" form
      const creates = Array.from(btns).filter(b => b.textContent.trim() === 'Create');
      if (creates.length === 0) return 'no Create buttons';
      // Click each one
      for (const c of creates) {
        c.click();
      }
      return 'clicked ' + creates.length + ' Create buttons';
    })()
  `);
  console.log('Create:', createClicked);
  await sleep(6000);
  await shot('dba-05-result');

  const finalUrl = await ev('window.location.href');
  console.log('URL:', finalUrl);

  const m = finalUrl.match(/applications\/(\d+)/);
  if (m) {
    const appId = m[1];
    console.log('✅ App created! ID:', appId);

    // Navigate to bot
    await new Promise((res, rej) => {
      const i = id++; pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method: 'Page.navigate', params: { url: `https://discord.com/developers/applications/${appId}/bot` } }));
      setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 30000);
    });
    await sleep(4000);
    await shot('dba-06-bot');

    // Hide overlays again
    await ev(`
      (function() {
        const modals = document.querySelectorAll('[class*="modal"], [role="dialog"], [class*="backdrop"]');
        for (const m of modals) { m.style.display = 'none'; m.style.pointerEvents = 'none'; }
      })()
    `);
    await sleep(500);

    // Check for Add Bot or Reset Token
    const botAction = await ev(`
      (function() {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t.includes('reset token')) return 'has bot';
          if (t.includes('add bot')) { b.click(); return 'adding bot'; }
        }
        return 'unknown';
      })()
    `);
    console.log('Bot:', botAction);

    if (botAction === 'adding bot') {
      await sleep(2000);
      await ev(`(function() { const btns = document.querySelectorAll('button'); for (const b of btns) { if (b.textContent.trim().toLowerCase().includes('yes')) { b.click(); break; } } })()`);
      await sleep(3000);
    }

    // Reset token
    await ev(`(function() { const btns = document.querySelectorAll('button'); for (const b of btns) { if (b.textContent.trim().toLowerCase().includes('reset token')) { b.click(); break; } } })()`);
    await sleep(2000);
    await ev(`(function() { const btns = document.querySelectorAll('button'); for (const b of btns) { const t = b.textContent.trim().toLowerCase(); if (t.includes('yes') || t === 'confirm') { b.click(); break; } } })()`);
    await sleep(4000);
    await shot('dba-07-token');

    const token = await ev(`
      (function() {
        const els = document.querySelectorAll('input, span, div, code');
        for (const el of els) {
          const v = (el.value || el.textContent || '').trim();
          if (v.match(/^[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{4,}\\.[A-Za-z0-9_-]{20,}$/)) return v;
        }
        return null;
      })()
    `);

    if (token) {
      console.log('✅ Got token!');
      let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
      if (env.includes('DISCORD_BOT_TOKEN=')) env = env.replace(/DISCORD_BOT_TOKEN=.*/g, `DISCORD_BOT_TOKEN=${token}`);
      else env = env.trimEnd() + '\nDISCORD_BOT_TOKEN=' + token + '\n';
      fs.writeFileSync(ENV_FILE, env);
      console.log('Saved to .env.local');
    } else {
      console.log('⚠️ Token not visible');
    }

    console.log('\nInvite URL: https://discord.com/oauth2/authorize?client_id=' + appId + '&permissions=19520&scope=bot');
  } else {
    console.log('App creation did not redirect. Body:', await ev('document.body.innerText.substring(0, 200)'));
  }

  ws.close();
}

main().catch(e => console.error('Error:', e.message));
