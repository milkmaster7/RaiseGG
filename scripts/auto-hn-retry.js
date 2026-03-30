/**
 * HN account creation + Show HN post — retry with correct form handling
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9224;
const PROFILE = path.join(require('os').tmpdir(), 'rgg-hn-2');
const SHOTS = path.join(__dirname, '..', 'screenshots');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function connectCDP() {
  try { require('ws'); } catch { require('child_process').execSync('npm install ws', { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); }
  const WebSocket = require('ws');
  let pages;
  for (let i = 0; i < 15; i++) {
    try {
      pages = await new Promise((res, rej) => {
        http.get(`http://127.0.0.1:${PORT}/json`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error', rej);
      });
      if (pages.length > 0) break;
    } catch {} await sleep(2000);
  }
  const page = pages.find(p => p.type === 'page') || pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 1; const pending = new Map();
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  await new Promise(r => ws.on('open', r));
  const send = (method, params={}) => new Promise((res,rej) => { const i=id++; pending.set(i,res); ws.send(JSON.stringify({id:i,method,params})); setTimeout(()=>{pending.delete(i);rej(new Error('timeout'))},30000); });
  const nav = async url => { await send('Page.navigate',{url}); await sleep(3000); };
  const ev = async expr => { const r = await send('Runtime.evaluate',{expression:expr,returnByValue:true}); return r?.result?.result?.value; };
  const shot = async name => { try { const r = await send('Page.captureScreenshot',{format:'png',quality:70}); if(r?.result?.data) fs.writeFileSync(path.join(SHOTS,`${name}.png`),Buffer.from(r.result.data,'base64')); console.log(`  📸 ${name}`); } catch {} };
  return { send, nav, ev, shot, ws };
}

async function main() {
  console.log('=== HN Account + Show HN Post ===\n');

  // Use unique username
  const username = 'raisegg_gg';
  const password = 'RGG_hn_x7k9m2p4v8';

  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--window-size=1280,900',
    'https://news.ycombinator.com/login'
  ], { detached: true, stdio: 'ignore' });
  chrome.unref();
  await sleep(5000);

  const cdp = await connectCDP();

  // Go directly to the create account URL with params
  // HN's create form is at /login with creating=t parameter
  console.log('Creating account...');
  await cdp.nav('https://news.ycombinator.com/login?creating=t');
  await sleep(2000);
  await cdp.shot('hn-r01');

  // The page has TWO forms - login form and create form
  // We need to fill and submit the CREATE form (second one)
  const result = await cdp.ev(`
    (function() {
      const forms = document.querySelectorAll('form');
      // The create account form is the second form on the page
      for (const form of forms) {
        const hiddenInput = form.querySelector('input[name="creating"]');
        if (hiddenInput || form.querySelector('input[value="create account"]')) {
          // This is the create form
          const acctInput = form.querySelector('input[name="acct"]');
          const pwInput = form.querySelector('input[name="pw"]');
          if (acctInput) acctInput.value = '${username}';
          if (pwInput) pwInput.value = '${password}';
          return 'found create form';
        }
      }
      // Fallback: fill all inputs but only click create
      const allInputs = document.querySelectorAll('input');
      let filled = 0;
      for (const inp of allInputs) {
        if (inp.name === 'acct' && !inp.value) { inp.value = '${username}'; filled++; }
        if (inp.name === 'pw' && !inp.value) { inp.value = '${password}'; filled++; }
      }
      return 'fallback filled: ' + filled;
    })()
  `);
  console.log('  Fill result:', result);
  await cdp.shot('hn-r02');

  // Click the "create account" submit button specifically
  const submitResult = await cdp.ev(`
    (function() {
      const buttons = document.querySelectorAll('input[type="submit"]');
      for (const btn of buttons) {
        if (btn.value === 'create account') {
          // Make sure the form fields are filled
          const form = btn.closest('form');
          if (form) {
            const acct = form.querySelector('input[name="acct"]');
            const pw = form.querySelector('input[name="pw"]');
            if (acct && !acct.value) acct.value = '${username}';
            if (pw && !pw.value) pw.value = '${password}';
          }
          btn.click();
          return 'clicked create account';
        }
      }
      return 'no create button found';
    })()
  `);
  console.log('  Submit:', submitResult);
  await sleep(4000);
  await cdp.shot('hn-r03');

  const afterUrl = await cdp.ev('window.location.href');
  const bodyText = await cdp.ev('document.body.innerText.substring(0, 200)');
  console.log('  URL:', afterUrl);
  console.log('  Body:', bodyText);

  // Check if logged in
  const loggedIn = await cdp.ev(`
    !!document.querySelector('a[href*="logout"]') ||
    document.body.innerHTML.includes('logout')
  `);
  console.log('  Logged in:', loggedIn);

  if (loggedIn) {
    console.log('\n  ✅ Account created! Posting Show HN...');
    await cdp.nav('https://news.ycombinator.com/submit');
    await sleep(2000);

    await cdp.ev(`
      (function() {
        const title = document.querySelector('input[name="title"]');
        const url = document.querySelector('input[name="url"]');
        if (title) title.value = 'Show HN: RaiseGG \\u2013 Play CS2/Dota 2 1v1 for USDC with Solana escrow';
        if (url) url.value = 'https://raisegg.com';
      })()
    `);
    await cdp.shot('hn-r04');

    await cdp.ev(`
      (function() {
        const btn = document.querySelector('input[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(4000);
    await cdp.shot('hn-r05');
    const finalUrl = await cdp.ev('window.location.href');
    console.log('  Posted! URL:', finalUrl);
  } else {
    // Username might be taken too
    console.log('  Account creation may have failed. Trying with alternate username...');
    await cdp.nav('https://news.ycombinator.com/login?creating=t');
    await sleep(2000);

    const altUser = 'raisegg_platform';
    await cdp.ev(`
      (function() {
        const buttons = document.querySelectorAll('input[type="submit"]');
        for (const btn of buttons) {
          if (btn.value === 'create account') {
            const form = btn.closest('form');
            if (form) {
              const acct = form.querySelector('input[name="acct"]');
              const pw = form.querySelector('input[name="pw"]');
              if (acct) acct.value = '${altUser}';
              if (pw) pw.value = '${password}';
            }
            btn.click();
            return 'clicked';
          }
        }
      })()
    `);
    await sleep(4000);
    await cdp.shot('hn-r06');

    const loggedIn2 = await cdp.ev(`document.body.innerHTML.includes('logout')`);
    console.log('  Alt account logged in:', loggedIn2);

    if (loggedIn2) {
      console.log('  Posting Show HN...');
      await cdp.nav('https://news.ycombinator.com/submit');
      await sleep(2000);
      await cdp.ev(`
        (function() {
          const title = document.querySelector('input[name="title"]');
          const url = document.querySelector('input[name="url"]');
          if (title) title.value = 'Show HN: RaiseGG \\u2013 Play CS2/Dota 2 1v1 for USDC with Solana escrow';
          if (url) url.value = 'https://raisegg.com';
          const btn = document.querySelector('input[type="submit"]');
          if (btn) btn.click();
        })()
      `);
      await sleep(4000);
      await cdp.shot('hn-r07');
      console.log('  Final URL:', await cdp.ev('window.location.href'));
    }
  }

  console.log('\n=== DONE ===');
  cdp.ws.close();
}

main().catch(e => console.error('Error:', e.message));
