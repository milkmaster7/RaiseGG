/**
 * Discord Bot Setup — connects to existing Discord Developer Portal tab
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
  // Get pages
  const pages = await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${PORT}/json`, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  // Find Discord developer portal tab
  const discordTab = pages.find(p => p.type === 'page' && p.url.includes('discord.com'));
  if (!discordTab) { console.log('No Discord tab found'); return; }

  console.log('Using tab:', discordTab.url);

  const ws = new WebSocket(discordTab.webSocketDebuggerUrl, { perMessageDeflate: false });
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

  // Check current state
  const url = await ev('window.location.href');
  const bodyText = await ev('document.body.innerText.substring(0, 500)');
  console.log('URL:', url);
  console.log('Body:', bodyText?.substring(0, 200));
  await shot('df-01-current');

  // Check if we're on the login page
  if (url.includes('/login') || bodyText?.includes('Email or Phone Number')) {
    console.log('\n❌ Not logged in to Discord Developer Portal.');
    console.log('The login page is open in Chrome. Please log in there.');
    console.log('Once logged in, run this script again.');
    ws.close();
    return;
  }

  // Check if there's a "Welcome" modal
  if (bodyText?.includes('Welcome to the Developer Portal') || bodyText?.includes('Create Account')) {
    console.log('\nDev Portal welcome modal detected. Clicking Log In...');
    await ev(`
      (function() {
        const btns = document.querySelectorAll('button, a');
        for (const b of btns) {
          if (b.textContent.trim() === 'Log In' || b.textContent.trim() === 'Log in') {
            b.click(); return 'clicked';
          }
        }
        return 'not found';
      })()
    `);
    await sleep(5000);
    const newUrl = await ev('window.location.href');
    console.log('After Log In click URL:', newUrl);
    if (newUrl.includes('/login')) {
      console.log('❌ Need to log in at the Discord login page in Chrome.');
      ws.close();
      return;
    }
  }

  // We should be on the applications page now
  console.log('\n✅ On Developer Portal!');

  // Dismiss any "Start building" overlay
  for (let i = 0; i < 3; i++) {
    const dismissed = await ev(`
      (function() {
        // Try escape key
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
        // Look for overlay/modal close
        const all = document.querySelectorAll('[role="dialog"] button, [class*="modal"] button');
        for (const b of all) {
          const t = b.textContent.trim().toLowerCase();
          if (['skip', 'close', 'cancel', 'dismiss', 'got it', 'not now', '×'].includes(t)) {
            b.click(); return 'closed: ' + t;
          }
        }
        // Try aria-label close
        const close = document.querySelector('[aria-label="Close"]');
        if (close) { close.click(); return 'closed via aria'; }
        return 'none';
      })()
    `);
    console.log('Modal check:', dismissed);
    if (dismissed === 'none') break;
    await sleep(1000);
  }

  // Now check for existing RaiseGG app
  console.log('\nChecking for existing apps...');
  await nav('https://discord.com/developers/applications');
  await sleep(3000);
  await shot('df-02-apps');

  const appsList = await ev(`
    (function() {
      const apps = [];
      const links = document.querySelectorAll('a[href*="/applications/"]');
      for (const l of links) {
        const name = l.textContent.trim();
        const href = l.getAttribute('href');
        if (name && href && !apps.find(a => a.href === href)) {
          apps.push({ name: name.substring(0, 50), href });
        }
      }
      return JSON.stringify(apps);
    })()
  `);
  console.log('Apps found:', appsList);

  let appId = null;
  try {
    const apps = JSON.parse(appsList || '[]');
    const raisegg = apps.find(a => a.name.includes('RaiseGG'));
    if (raisegg) {
      const m = raisegg.href.match(/applications\/(\d+)/);
      if (m) appId = m[1];
      console.log('Found RaiseGG app:', appId);
    }
  } catch {}

  if (!appId) {
    // Create new app
    console.log('\nCreating new application...');
    await ev(`
      (function() {
        const btns = document.querySelectorAll('button, a');
        for (const b of btns) {
          if (b.textContent.trim().includes('New Application')) { b.click(); return 'clicked'; }
        }
        return 'not found';
      })()
    `);
    await sleep(3000);
    await shot('df-03-new-modal');

    // Check what's showing
    const modalContent = await ev('document.body.innerText.substring(0, 800)');
    console.log('Modal content:', modalContent?.substring(0, 300));

    // Dismiss overlapping "Start building" if needed
    await ev(`
      (function() {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      })()
    `);
    await sleep(1000);

    // Fill name
    const fillResult = await ev(`
      (function() {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
          if (inp.offsetParent !== null && inp.type !== 'hidden' && inp.type !== 'checkbox') {
            inp.focus();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, 'RaiseGG');
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            return 'filled: ' + inp.name + ' / ' + inp.placeholder;
          }
        }
        return 'no input found';
      })()
    `);
    console.log('Fill:', fillResult);

    // Check ToS
    await ev(`
      (function() {
        const cbs = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
        for (const cb of cbs) { cb.click(); }
      })()
    `);
    await sleep(500);

    // Click Create
    await ev(`
      (function() {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          if (b.textContent.trim() === 'Create') { b.click(); return 'clicked'; }
        }
      })()
    `);
    await sleep(6000);
    await shot('df-04-created');

    const newUrl = await ev('window.location.href');
    const m = newUrl.match(/applications\/(\d+)/);
    if (m) appId = m[1];

    if (!appId) {
      appId = await ev(`
        (function() {
          const m = window.location.href.match(/applications\\/(\\d+)/);
          if (m) return m[1];
          const text = document.body.innerText;
          const idM = text.match(/APPLICATION ID[\\s\\n]*(\\d{17,20})/i);
          return idM ? idM[1] : null;
        })()
      `);
    }
  }

  if (!appId) {
    console.log('\n❌ Could not create app. Check screenshots.');
    ws.close();
    return;
  }

  console.log('\n✅ App ID:', appId);

  // Go to Bot page
  console.log('\nSetting up bot...');
  await nav(`https://discord.com/developers/applications/${appId}/bot`);
  await sleep(3000);
  await shot('df-05-bot');

  // Add bot if needed
  const botResult = await ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('add bot')) { b.click(); return 'add bot clicked'; }
        if (b.textContent.trim().toLowerCase().includes('reset token')) return 'bot exists - has reset button';
      }
      return 'unknown state';
    })()
  `);
  console.log('Bot status:', botResult);

  if (botResult.includes('add bot')) {
    await sleep(2000);
    await ev(`
      (function() {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t.includes('yes') || t === 'confirm') { b.click(); return 'confirmed'; }
        }
      })()
    `);
    await sleep(3000);
  }

  // Get token
  console.log('\nGetting token...');
  await ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('reset token')) { b.click(); return 'clicked'; }
      }
    })()
  `);
  await sleep(2000);

  // Confirm
  await ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        const t = b.textContent.trim().toLowerCase();
        if (t.includes('yes') || t === 'confirm') { b.click(); return 'ok'; }
      }
    })()
  `);
  await sleep(4000);
  await shot('df-06-token');

  // Extract token
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
    console.log('✅ Token obtained!');
    let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
    if (env.includes('DISCORD_BOT_TOKEN=')) {
      env = env.replace(/DISCORD_BOT_TOKEN=.*/g, `DISCORD_BOT_TOKEN=${token}`);
    } else {
      env = env.trimEnd() + '\nDISCORD_BOT_TOKEN=' + token + '\n';
    }
    fs.writeFileSync(ENV_FILE, env);
    console.log('Saved to .env.local');
  } else {
    console.log('⚠️ Token not visible - may need MFA or manual copy');
  }

  // Enable intents
  console.log('\nEnabling intents...');
  await ev('window.scrollTo(0, 800)');
  await sleep(1000);
  const intents = await ev(`
    (function() {
      const r = [];
      const hs = document.querySelectorAll('h5, label, span');
      for (const h of hs) {
        const t = h.textContent.trim().toLowerCase();
        if (t.includes('server members') || t.includes('message content') || t.includes('presence')) {
          const sec = h.closest('[class*="card"], [class*="section"]') || h.parentElement?.parentElement;
          if (sec) {
            const sw = sec.querySelector('[role="switch"], input[type="checkbox"]');
            if (sw) {
              const on = sw.getAttribute('aria-checked') === 'true' || sw.checked;
              if (!on) { sw.click(); r.push('on: ' + t.substring(0, 25)); }
              else r.push('already: ' + t.substring(0, 25));
            }
          }
        }
      }
      return r.length ? r.join('; ') : 'none found';
    })()
  `);
  console.log('Intents:', intents);

  // Save
  await ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('save')) { b.click(); return 'saved'; }
      }
    })()
  `);
  await sleep(2000);

  // Print invite URL
  const perms = 19520;
  console.log('\n========================================');
  console.log(`BOT INVITE: https://discord.com/oauth2/authorize?client_id=${appId}&permissions=${perms}&scope=bot`);
  console.log('========================================');

  await shot('df-07-final');
  console.log('\nDONE');
  ws.close();
}

main().catch(e => console.error('Error:', e.message));
