/**
 * Force-create Discord app by clicking through the overlay
 * The dev portal is accessible but has a "Welcome" modal on top
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 9222;
const SHOTS = path.join(__dirname, '..', 'screenshots');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const pages = await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${PORT}/json`, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  // Find the first discord developer tab
  const tab = pages.find(p => p.type === 'page' && p.url.includes('discord.com/developers'));
  if (!tab) { console.log('No Discord tab'); return; }

  const ws = new WebSocket(tab.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 1; const pending = new Map();
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  await new Promise(r => ws.on('open', r));

  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = id++; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 30000);
  });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); return r?.result?.result?.value; };
  const shot = async name => {
    try {
      const r = await send('Page.captureScreenshot', { format: 'png', quality: 70 });
      if (r?.result?.data) fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64'));
      console.log(`📸 ${name}`);
    } catch {}
  };

  // First, go back to applications page (may have been redirected to login)
  await send('Page.navigate', { url: 'https://discord.com/developers/applications' });
  await sleep(4000);

  const url = await ev('window.location.href');
  console.log('URL:', url);

  if (url.includes('/login')) {
    console.log('On login page. Going back...');
    await send('Page.navigate', { url: 'https://discord.com/developers/applications' });
    await sleep(4000);
  }

  await shot('dfc-01');

  // Try to remove the modal overlay via DOM manipulation
  console.log('\nRemoving modal overlay...');
  const removeResult = await ev(`
    (function() {
      // Find and remove all modal/overlay/backdrop elements
      const modals = document.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="backdrop"], [class*="Modal"], [class*="Overlay"], [class*="Backdrop"]');
      let removed = 0;
      for (const m of modals) {
        // Don't remove the "Create Application" modal if it appears later
        if (!m.innerHTML.includes('Create an Application') && !m.innerHTML.includes('create account')) {
          m.remove();
          removed++;
        }
      }
      // Also remove any fixed/absolute positioned overlays
      const all = document.querySelectorAll('div');
      for (const d of all) {
        const style = window.getComputedStyle(d);
        if ((style.position === 'fixed' || style.position === 'absolute') &&
            style.zIndex > 100 &&
            d.innerHTML.includes('Welcome')) {
          d.remove();
          removed++;
        }
      }
      return 'removed ' + removed + ' elements';
    })()
  `);
  console.log(removeResult);
  await sleep(1000);
  await shot('dfc-02-clean');

  // Now try clicking "New Application"
  const newApp = await ev(`
    (function() {
      const btns = document.querySelectorAll('button, a');
      for (const b of btns) {
        if (b.textContent.trim().includes('New Application')) {
          // Force click even if covered
          b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return 'force-clicked New Application';
        }
      }
      return 'not found';
    })()
  `);
  console.log(newApp);
  await sleep(3000);
  await shot('dfc-03-after-new');

  // Check what's on screen now
  const bodyText = await ev('document.body.innerText.substring(0, 500)');
  console.log('Body:', bodyText?.substring(0, 300));

  // Fill name if input is visible
  const filled = await ev(`
    (function() {
      const inputs = document.querySelectorAll('input');
      for (const inp of inputs) {
        if (inp.offsetParent !== null && inp.type !== 'hidden' && inp.type !== 'checkbox') {
          inp.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(inp, 'RaiseGG');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          return 'filled: ' + (inp.name || inp.type || 'unknown');
        }
      }
      return 'no visible input';
    })()
  `);
  console.log('Input:', filled);

  // Check ToS
  await ev(`
    (function() {
      const cbs = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
      for (const cb of cbs) {
        if (!cb.checked) cb.click();
      }
    })()
  `);
  await sleep(500);

  // Click Create
  const createResult = await ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim() === 'Create') {
          b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return 'clicked Create';
        }
      }
      return 'no Create';
    })()
  `);
  console.log('Create:', createResult);
  await sleep(6000);
  await shot('dfc-04-result');

  const finalUrl = await ev('window.location.href');
  console.log('Final URL:', finalUrl);

  const m = finalUrl.match(/applications\/(\d+)/);
  if (m) {
    console.log('✅ App ID:', m[1]);
    console.log('Now navigate to Bot section and get token');
  } else {
    console.log('URL did not change to app page');
    const finalBody = await ev('document.body.innerText.substring(0, 300)');
    console.log('Body:', finalBody);
  }

  ws.close();
}

main().catch(e => console.error('Error:', e.message));
