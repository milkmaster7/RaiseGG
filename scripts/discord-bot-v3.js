/**
 * Discord Bot Setup v3 — handles Developer Portal login modal
 * Uses existing Chrome on port 9222
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

  const newTab = await new Promise((res, rej) => {
    const req = http.request(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej);
    req.end();
  });

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
  return { send, nav, ev, shot, ws };
}

async function main() {
  console.log('=== Discord Bot Setup v3 ===\n');
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  const cdp = await connectCDP();

  // Step 1: Go to Discord Developer Portal
  console.log('1. Navigating to Developer Portal...');
  await cdp.nav('https://discord.com/developers/applications');
  await sleep(3000);
  await cdp.shot('dv3-01-initial');

  // Step 2: Handle the "Welcome to Developer Portal" modal
  // This modal has "Create Account" and "Log In" buttons
  // We need to click "Log In" to authenticate with existing Discord account
  console.log('\n2. Handling welcome modal...');

  const modalResult = await cdp.ev(`
    (function() {
      // Look for the "Log In" button in the welcome modal
      const btns = document.querySelectorAll('button, a[role="button"], div[role="button"]');
      for (const b of btns) {
        const text = b.textContent.trim();
        if (text === 'Log In' || text === 'Log in') {
          b.click();
          return 'clicked Log In';
        }
      }
      // Also check links
      const links = document.querySelectorAll('a');
      for (const l of links) {
        const text = l.textContent.trim();
        if (text === 'Log In' || text === 'Log in') {
          l.click();
          return 'clicked Log In link';
        }
      }
      // Maybe no modal (already logged in to dev portal)
      const newAppBtn = document.querySelector('button');
      const allBtns = Array.from(document.querySelectorAll('button, a')).map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 40);
      return 'no Log In found. Buttons: ' + allBtns.slice(0, 10).join(' | ');
    })()
  `);
  console.log('  ', modalResult);
  await sleep(5000);
  await cdp.shot('dv3-02-after-login-click');

  // Check if we got redirected to Discord login
  const afterUrl = await cdp.ev('window.location.href');
  console.log('  URL after click:', afterUrl);

  // If we're at Discord login page, wait for login
  if (afterUrl.includes('/login')) {
    console.log('  Need to authenticate. Waiting...');
    for (let i = 0; i < 30; i++) {
      await sleep(5000);
      const u = await cdp.ev('window.location.href');
      if (u.includes('/developers/applications')) {
        console.log('  ✅ Authenticated!');
        break;
      }
      if (i % 4 === 0) console.log(`  Waiting... (${i * 5}s)`);
    }
    await sleep(3000);
  }

  // Step 3: Check for any remaining modals (like "Start building")
  console.log('\n3. Dismissing tutorial modals...');
  for (let attempt = 0; attempt < 3; attempt++) {
    const dismissed = await cdp.ev(`
      (function() {
        // Try ESC key
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

        // Find and close "Start building" modal or similar overlays
        const overlays = document.querySelectorAll('[class*="modal"], [class*="overlay"], [role="dialog"]');
        for (const o of overlays) {
          // Find close/skip/cancel button inside
          const btns = o.querySelectorAll('button, [role="button"]');
          for (const b of btns) {
            const t = b.textContent.trim().toLowerCase();
            if (t === 'skip' || t === 'close' || t === 'cancel' || t === '×' || t === 'got it' || t === 'dismiss') {
              b.click();
              return 'dismissed: ' + t;
            }
          }
          // Try close icon
          const close = o.querySelector('[aria-label="Close"], [aria-label="close"], svg[class*="close"]');
          if (close) { close.click(); return 'closed via icon'; }
        }

        // Try clicking outside modals
        const backdrop = document.querySelector('[class*="backdrop"], [class*="Backdrop"]');
        if (backdrop) { backdrop.click(); return 'clicked backdrop'; }

        return 'no modals';
      })()
    `);
    console.log('  ', dismissed);
    if (dismissed === 'no modals') break;
    await sleep(1500);
  }
  await cdp.shot('dv3-03-clean');

  // Step 4: Check for existing RaiseGG app or click New Application
  console.log('\n4. Looking for apps...');
  const pageContent = await cdp.ev('document.body.innerText.substring(0, 500)');
  console.log('  Page content:', pageContent?.substring(0, 200));

  // Check URL
  const currentUrl = await cdp.ev('window.location.href');
  console.log('  URL:', currentUrl);

  // If not on applications page, navigate there
  if (!currentUrl.includes('/developers/applications')) {
    await cdp.nav('https://discord.com/developers/applications');
    await sleep(3000);
  }

  // Check for existing RaiseGG app
  const existing = await cdp.ev(`
    (function() {
      // Look for app cards/links containing "RaiseGG"
      const all = document.querySelectorAll('a, div, span');
      for (const el of all) {
        if (el.textContent.trim() === 'RaiseGG' && el.children.length <= 1) {
          // Click on it or its parent link
          const link = el.closest('a') || el;
          link.click();
          return 'found existing RaiseGG';
        }
      }
      return null;
    })()
  `);

  if (existing) {
    console.log('  Found existing RaiseGG app!');
    await sleep(3000);
  } else {
    // Click "New Application"
    console.log('  Creating new application...');
    const newApp = await cdp.ev(`
      (function() {
        const btns = document.querySelectorAll('button, a');
        for (const b of btns) {
          if (b.textContent.trim().includes('New Application')) {
            b.click();
            return 'clicked';
          }
        }
        return 'not found: ' + Array.from(btns).map(b=>b.textContent.trim()).filter(t=>t.length>0&&t.length<30).join(' | ');
      })()
    `);
    console.log('  New Application:', newApp);
    await sleep(3000);
    await cdp.shot('dv3-04-new-app-dialog');

    // Dismiss any "Start building" overlay that appears on top
    await cdp.ev(`
      (function() {
        // The "Start building" modal appears on top - find and close it
        const allBtns = document.querySelectorAll('button, [role="button"]');
        for (const b of allBtns) {
          const t = b.textContent.trim().toLowerCase();
          if (t === 'skip' || t === 'not now' || t === 'maybe later') {
            b.click();
            return 'dismissed start building';
          }
        }
        // Try to find the close X of the "Start building" overlay
        // It's typically the top-right of the modal
        const modals = document.querySelectorAll('[class*="modal"], [role="dialog"]');
        if (modals.length > 1) {
          // Multiple modals - close the top one (Start building)
          const topModal = modals[modals.length - 1];
          const closeBtn = topModal.querySelector('button[aria-label="Close"], [class*="close"]');
          if (closeBtn) { closeBtn.click(); return 'closed top modal'; }
          // Click backdrop/overlay behind it
        }
        return 'no overlay to dismiss';
      })()
    `);
    await sleep(1000);

    // Now fill the "Create an Application" form
    console.log('  Filling app name...');
    await cdp.ev(`
      (function() {
        const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        for (const inp of inputs) {
          if (inp.offsetParent !== null && !inp.value) {
            inp.focus();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, 'RaiseGG');
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            return 'filled';
          }
        }
        return 'no empty input found';
      })()
    `);
    await sleep(500);

    // Check ToS
    await cdp.ev(`
      (function() {
        const cbs = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
        for (const cb of cbs) { cb.click(); return 'clicked'; }
        const labels = document.querySelectorAll('label');
        for (const l of labels) {
          if (l.textContent.toLowerCase().includes('terms') || l.textContent.toLowerCase().includes('agree')) {
            l.click(); return 'clicked label';
          }
        }
        return 'no checkbox';
      })()
    `);
    await sleep(500);

    // Click Create (in the form, not the overlay)
    console.log('  Submitting...');
    const createResult = await cdp.ev(`
      (function() {
        // Find the Create button that's part of the "Create an Application" form
        // It should be near the Cancel button and the name input
        const btns = document.querySelectorAll('button');
        const candidates = [];
        for (const b of btns) {
          const t = b.textContent.trim();
          if (t === 'Create') {
            candidates.push(b);
          }
        }
        // If multiple "Create" buttons, prefer the one in the lower modal (create app form)
        // The create app form has Cancel + Create buttons
        if (candidates.length > 0) {
          // Click the last "Create" button (bottom-most, likely the form one)
          candidates[candidates.length - 1].click();
          return 'clicked Create (#' + candidates.length + ')';
        }
        return 'no Create button';
      })()
    `);
    console.log('  ', createResult);
    await sleep(6000);
    await cdp.shot('dv3-05-after-create');
  }

  // Get app ID
  let appId = null;
  const appUrl = await cdp.ev('window.location.href');
  console.log('  URL after create:', appUrl);

  const match = appUrl.match(/applications\/(\d+)/);
  if (match) appId = match[1];

  if (!appId) {
    appId = await cdp.ev(`
      (function() {
        const m = window.location.href.match(/applications\\/(\\d+)/);
        if (m) return m[1];
        // Search page text
        const text = document.body.innerText;
        const idM = text.match(/APPLICATION ID[\\s\\n]*(\\d{17,20})/i);
        if (idM) return idM[1];
        // Look for 17-20 digit numbers in specific containers
        const spans = document.querySelectorAll('span, div, input');
        for (const s of spans) {
          const v = (s.value || s.textContent || '').trim();
          if (v.match(/^\\d{17,20}$/) && s.children.length === 0) return v;
        }
        return null;
      })()
    `);
  }

  console.log('  App ID:', appId || 'NOT FOUND');

  if (!appId) {
    console.log('\n  ❌ Could not create/find app. The "Start building" overlay may be blocking.');
    console.log('  Check the screenshots for details.');
    await cdp.shot('dv3-06-stuck');

    // Last resort: get page HTML to debug
    const html = await cdp.ev('document.body.innerHTML.substring(0, 1000)');
    console.log('  Page HTML preview:', html?.substring(0, 300));

    cdp.ws.close();
    return;
  }

  // Step 5: Bot setup
  console.log('\n5. Setting up bot...');
  await cdp.nav(`https://discord.com/developers/applications/${appId}/bot`);
  await sleep(3000);
  await cdp.shot('dv3-07-bot');

  // Add bot if needed
  const addBot = await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('add bot')) { b.click(); return 'clicked'; }
      }
      return 'already exists';
    })()
  `);
  console.log('  Add bot:', addBot);
  if (addBot === 'clicked') {
    await sleep(2000);
    await cdp.ev(`
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

  // Reset token
  console.log('\n6. Getting token...');
  const reset = await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('reset token')) { b.click(); return 'clicked'; }
      }
      return 'no reset btn';
    })()
  `);
  console.log('  Reset:', reset);

  if (reset === 'clicked') {
    await sleep(2000);
    // Confirm
    await cdp.ev(`
      (function() {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t.includes('yes') || t === 'confirm' || t === 'reset token') { b.click(); return 'ok'; }
        }
      })()
    `);
    await sleep(4000);
    await cdp.shot('dv3-08-token');

    // Extract token
    const token = await cdp.ev(`
      (function() {
        const els = document.querySelectorAll('input, span, div, code, pre, p');
        for (const el of els) {
          const v = (el.value || el.textContent || '').trim();
          if (v.match(/^[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{4,}\\.[A-Za-z0-9_-]{20,}$/)) return v;
        }
        return null;
      })()
    `);

    if (token) {
      console.log('  ✅ Token obtained!');
      let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
      if (env.includes('DISCORD_BOT_TOKEN=')) {
        env = env.replace(/DISCORD_BOT_TOKEN=.*/g, `DISCORD_BOT_TOKEN=${token}`);
      } else {
        env = env.trimEnd() + '\\nDISCORD_BOT_TOKEN=' + token + '\\n';
      }
      fs.writeFileSync(ENV_FILE, env);
      console.log('  Saved to .env.local');
    } else {
      console.log('  ⚠️ Token not visible. May need MFA or manual copy.');
      // Try clicking Copy
      await cdp.ev(`
        (function() {
          const btns = document.querySelectorAll('button');
          for (const b of btns) {
            if (b.textContent.trim().toLowerCase() === 'copy') { b.click(); return 'copied'; }
          }
        })()
      `);
    }
  }

  // Enable intents
  console.log('\n7. Enabling intents...');
  await cdp.ev('window.scrollTo(0, 600)');
  await sleep(1000);

  const intents = await cdp.ev(`
    (function() {
      const results = [];
      const headings = document.querySelectorAll('h5, h4, label, span');
      for (const h of headings) {
        const t = h.textContent.trim().toLowerCase();
        if (t.includes('server members') || t.includes('message content') || t.includes('presence')) {
          const section = h.closest('[class*="card"], [class*="section"], [class*="row"]') || h.parentElement?.parentElement;
          if (section) {
            const sw = section.querySelector('[role="switch"], input[type="checkbox"]');
            if (sw) {
              const on = sw.getAttribute('aria-checked') === 'true' || sw.checked;
              if (!on) { sw.click(); results.push('enabled: ' + t.substring(0, 25)); }
              else results.push('on: ' + t.substring(0, 25));
            }
          }
        }
      }
      return results.length ? results.join('; ') : 'no intents found';
    })()
  `);
  console.log('  ', intents);

  // Save
  await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim().toLowerCase().includes('save')) { b.click(); return 'saved'; }
      }
    })()
  `);
  await sleep(2000);

  // Invite URL
  const perms = 19520;
  console.log('\n========================================');
  console.log(`  BOT INVITE: https://discord.com/oauth2/authorize?client_id=${appId}&permissions=${perms}&scope=bot`);
  console.log('========================================');

  await cdp.shot('dv3-09-final');
  console.log('\n=== DONE ===');
  cdp.ws.close();
}

main().catch(e => console.error('Error:', e.message));
