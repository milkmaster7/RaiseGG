/**
 * Discord Bot Setup v2 — uses existing Chrome on port 9222 (user's main browser)
 * Creates a new tab, navigates to Discord Dev Portal, creates app + bot, gets token
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9222;
const SHOTS = path.join(__dirname, '..', 'screenshots');
const ENV_FILE = path.join(__dirname, '..', '.env.local');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function connectCDP() {
  try { require('ws'); } catch { require('child_process').execSync('npm install ws', { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); }
  const WebSocket = require('ws');

  // Create a new tab via PUT
  const newTab = await new Promise((res, rej) => {
    const req = http.request(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej);
    req.end();
  });

  console.log('  New tab created:', newTab.id);

  const ws = new WebSocket(newTab.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 1; const pending = new Map();
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  await new Promise(r => ws.on('open', r));

  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = id++; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { pending.delete(i); rej(new Error('timeout: ' + method)); }, 30000);
  });
  const nav = async url => { await send('Page.navigate', { url }); await sleep(4000); };
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); return r?.result?.result?.value; };
  const shot = async name => {
    try {
      const r = await send('Page.captureScreenshot', { format: 'png', quality: 70 });
      if (r?.result?.data) fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64'));
      console.log(`  📸 ${name}`);
    } catch {}
  };
  return { send, nav, ev, shot, ws, tabId: newTab.id };
}

async function main() {
  console.log('=== Discord Bot Setup v2 (using main Chrome) ===\n');

  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  const cdp = await connectCDP();

  // Navigate to Discord Developer Portal
  console.log('1. Going to Discord Developer Portal...');
  await cdp.nav('https://discord.com/developers/applications');
  await sleep(3000);
  await cdp.shot('discord-v2-01-portal');

  // Check if logged in
  const url = await cdp.ev('window.location.href');
  console.log('  URL:', url);

  const needsLogin = url.includes('/login');
  if (needsLogin) {
    console.log('  ❌ Not logged into Discord in main browser.');
    console.log('  Waiting 2 minutes for you to log in...');
    for (let i = 0; i < 24; i++) {
      await sleep(5000);
      const u = await cdp.ev('window.location.href');
      if (!u.includes('/login')) { console.log('  ✅ Logged in!'); break; }
      if (i % 6 === 0) console.log(`  Still waiting... (${Math.floor(i * 5 / 60)}m ${(i * 5) % 60}s)`);
    }
  } else {
    console.log('  ✅ Already logged in to Discord!');
  }

  // Dismiss any welcome modals
  await sleep(2000);
  console.log('\n2. Dismissing any modals...');
  await cdp.ev(`
    (function() {
      // Press Escape to close modals
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      // Also try clicking "Skip" or close buttons
      const btns = document.querySelectorAll('button, [role="button"]');
      for (const b of btns) {
        const t = b.textContent.trim().toLowerCase();
        if (t === 'skip' || t === 'close' || t === 'cancel' || t === 'dismiss' || t === '×' || t === 'x') {
          b.click();
          return 'dismissed: ' + t;
        }
      }
      // Close button with aria-label
      const close = document.querySelector('[aria-label="Close"], [aria-label="close"]');
      if (close) { close.click(); return 'closed via aria'; }
      return 'no modal found';
    })()
  `);
  await sleep(1000);

  // Make sure we're on applications page
  const currentUrl = await cdp.ev('window.location.href');
  if (!currentUrl.includes('/developers/applications')) {
    await cdp.nav('https://discord.com/developers/applications');
    await sleep(3000);
  }

  // Check if RaiseGG app already exists
  console.log('\n3. Checking for existing RaiseGG app...');
  const existingApp = await cdp.ev(`
    (function() {
      const cards = document.querySelectorAll('a[href*="/applications/"]');
      for (const card of cards) {
        if (card.textContent.includes('RaiseGG')) {
          return card.getAttribute('href');
        }
      }
      // Also check divs/spans
      const all = document.querySelectorAll('[class*="app"], [class*="card"]');
      for (const el of all) {
        if (el.textContent.includes('RaiseGG')) {
          const link = el.querySelector('a[href*="/applications/"]') || el.closest('a[href*="/applications/"]');
          if (link) return link.getAttribute('href');
        }
      }
      return null;
    })()
  `);

  let appId = null;

  if (existingApp) {
    console.log('  Found existing RaiseGG app:', existingApp);
    const match = existingApp.match(/applications\/(\d+)/);
    if (match) appId = match[1];
    await cdp.nav('https://discord.com/developers' + existingApp);
    await sleep(2000);
  } else {
    // Create new application
    console.log('  No existing app. Creating new one...');
    await cdp.shot('discord-v2-02-apps-list');

    // Click "New Application"
    const clicked = await cdp.ev(`
      (function() {
        const btns = document.querySelectorAll('button, a, div[role="button"]');
        for (const b of btns) {
          if (b.textContent.trim().toLowerCase().includes('new application')) {
            b.click();
            return 'clicked New Application';
          }
        }
        return 'not found: ' + Array.from(btns).map(b=>b.textContent.trim()).filter(t=>t.length>0&&t.length<30).slice(0,10).join('|');
      })()
    `);
    console.log('  ', clicked);
    await sleep(2000);
    await cdp.shot('discord-v2-03-new-app-modal');

    // Fill app name
    console.log('\n4. Filling app name...');
    await cdp.ev(`
      (function() {
        const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        for (const inp of inputs) {
          if (inp.offsetParent !== null) {
            inp.focus();
            // Use native input setter to trigger React state update
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(inp, 'RaiseGG');
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            return 'filled';
          }
        }
        return 'no input';
      })()
    `);
    await sleep(500);

    // Check ToS checkbox
    console.log('  Accepting ToS...');
    await cdp.ev(`
      (function() {
        const cbs = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
        for (const cb of cbs) {
          if (!cb.checked && cb.getAttribute('aria-checked') !== 'true') {
            cb.click();
            return 'checked';
          }
        }
        // Try clicking label with terms text
        const labels = document.querySelectorAll('label');
        for (const l of labels) {
          if (l.textContent.toLowerCase().includes('terms') || l.textContent.toLowerCase().includes('agree')) {
            l.click();
            return 'clicked label';
          }
        }
        return 'no checkbox';
      })()
    `);
    await sleep(500);

    // Click Create
    console.log('  Clicking Create...');
    const createResult = await cdp.ev(`
      (function() {
        const btns = document.querySelectorAll('button, div[role="button"]');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t === 'create' || t === 'create application') {
            b.click();
            return 'created';
          }
        }
        return 'no create button';
      })()
    `);
    console.log('  ', createResult);
    await sleep(5000);
    await cdp.shot('discord-v2-04-app-created');

    // Get app ID from URL
    const newUrl = await cdp.ev('window.location.href');
    const match = newUrl.match(/applications\/(\d+)/);
    if (match) appId = match[1];
    console.log('  App ID:', appId || 'not found in URL');
  }

  if (!appId) {
    // Try harder to find app ID
    appId = await cdp.ev(`
      (function() {
        const m = window.location.href.match(/applications\\/(\\d+)/);
        if (m) return m[1];
        const text = document.body.innerText;
        const idM = text.match(/APPLICATION ID[\\s\\n]*(\\d{17,20})/i);
        if (idM) return idM[1];
        return null;
      })()
    `);
  }

  if (!appId) {
    console.log('  ❌ Could not get Application ID. Check screenshots.');
    await cdp.shot('discord-v2-05-no-id');
    cdp.ws.close();
    return;
  }

  console.log('\n  ✅ App ID:', appId);

  // Navigate to Bot page
  console.log('\n5. Setting up Bot...');
  await cdp.nav(`https://discord.com/developers/applications/${appId}/bot`);
  await sleep(3000);
  await cdp.shot('discord-v2-06-bot-page');

  // Check if "Add Bot" button exists (might need to create bot first)
  const addBotResult = await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('button, div[role="button"]');
      for (const b of btns) {
        const t = b.textContent.trim().toLowerCase();
        if (t.includes('add bot')) {
          b.click();
          return 'clicked add bot';
        }
      }
      return 'bot already exists or no button';
    })()
  `);
  console.log('  ', addBotResult);
  await sleep(2000);

  // Confirm "Yes, do it!" if prompted
  if (addBotResult.includes('clicked')) {
    await cdp.ev(`
      (function() {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t.includes('yes') || t === 'confirm') { b.click(); return 'confirmed'; }
        }
        return 'no confirm';
      })()
    `);
    await sleep(3000);
  }

  // Reset token to get a new one
  console.log('\n6. Getting bot token...');
  const resetResult = await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('button, div[role="button"]');
      for (const b of btns) {
        const t = b.textContent.trim().toLowerCase();
        if (t.includes('reset token') || t.includes('regenerate')) {
          b.click();
          return 'clicked reset';
        }
      }
      return 'no reset button';
    })()
  `);
  console.log('  ', resetResult);
  await sleep(2000);

  if (resetResult.includes('clicked')) {
    // Confirm reset
    await cdp.ev(`
      (function() {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t.includes('yes') || t === 'confirm' || t === 'reset token') { b.click(); return 'confirmed'; }
        }
        return 'no confirm';
      })()
    `);
    await sleep(3000);
    await cdp.shot('discord-v2-07-token-reset');

    // Try to extract token
    const token = await cdp.ev(`
      (function() {
        // Look for token-like strings in inputs and spans
        const els = document.querySelectorAll('input, span, div, code, pre');
        for (const el of els) {
          const val = (el.value || el.textContent || '').trim();
          if (val.match(/^[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{4,}\\.[A-Za-z0-9_-]{20,}$/)) {
            return val;
          }
        }
        // Click copy button and check clipboard
        const copyBtns = document.querySelectorAll('button');
        for (const b of copyBtns) {
          if (b.textContent.trim().toLowerCase() === 'copy') {
            b.click();
            return 'COPY_CLICKED';
          }
        }
        return null;
      })()
    `);

    if (token && token !== 'COPY_CLICKED') {
      console.log('  ✅ Token obtained!');
      // Save to .env.local
      let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
      if (env.includes('DISCORD_BOT_TOKEN=')) {
        env = env.replace(/DISCORD_BOT_TOKEN=.*/g, `DISCORD_BOT_TOKEN=${token}`);
      } else {
        env = env.trimEnd() + `\nDISCORD_BOT_TOKEN=${token}\n`;
      }
      fs.writeFileSync(ENV_FILE, env);
      console.log('  Saved to .env.local');

      // Push to Vercel
      try {
        require('child_process').execSync('npx vercel env rm DISCORD_BOT_TOKEN production -y', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
      } catch {}
      try {
        require('child_process').execSync(`echo ${token} | npx vercel env add DISCORD_BOT_TOKEN production`, { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
        console.log('  Pushed to Vercel');
      } catch (e) {
        console.log('  Vercel push failed:', e.message);
      }
    } else {
      console.log('  ⚠️ Token may require MFA. Check browser window.');
      await cdp.shot('discord-v2-08-mfa-prompt');
    }
  }

  // Enable intents
  console.log('\n7. Enabling Privileged Intents...');
  await cdp.ev('window.scrollTo(0, 500)');
  await sleep(1000);

  const intents = await cdp.ev(`
    (function() {
      const results = [];
      const labels = document.querySelectorAll('h5, label, span');
      for (const el of labels) {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes('server members intent') || text.includes('message content intent') || text.includes('presence intent')) {
          const container = el.closest('[class*="card"], [class*="row"], [class*="section"]') || el.parentElement.parentElement;
          if (container) {
            const toggle = container.querySelector('[role="switch"], input[type="checkbox"], [class*="switch"]');
            if (toggle) {
              const on = toggle.getAttribute('aria-checked') === 'true' || toggle.checked;
              if (!on) { toggle.click(); results.push('enabled: ' + text.substring(0, 30)); }
              else results.push('already on: ' + text.substring(0, 30));
            }
          }
        }
      }
      return results.length ? results.join('; ') : 'no intents found';
    })()
  `);
  console.log('  ', intents);

  // Save changes
  await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('save')) { b.click(); return 'saved'; }
      }
      return 'no save';
    })()
  `);
  await sleep(2000);

  // Generate invite URL
  const perms = 2048 | 1024 | 16384 | 64; // 19520
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${appId}&permissions=${perms}&scope=bot`;

  console.log('\n========================================');
  console.log('  BOT INVITE URL:');
  console.log(`  ${inviteUrl}`);
  console.log('========================================');

  await cdp.shot('discord-v2-09-final');
  console.log('\n=== DONE ===');
  cdp.ws.close();
}

main().catch(e => console.error('Error:', e.message));
