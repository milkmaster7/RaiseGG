/**
 * Hacker News "Show HN" Submission for RaiseGG
 *
 * Launches Chrome on port 9224 with a temp profile,
 * navigates to HN submit page, handles login if needed,
 * fills title + URL, and submits.
 *
 * Uses CDP approach with ws module.
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9224;
const PROFILE_DIR = path.join(require('os').tmpdir(), 'rgg-hn-profile');

const HN_TITLE = 'Show HN: RaiseGG \u2013 Play CS2/Dota 2 1v1 for USDC with Solana escrow';
const HN_URL = 'https://raisegg.com';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getPages() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${DEBUG_PORT}/json`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
    }).on('error', reject);
  });
}

async function connectToPage(wsUrl) {
  const WebSocket = require('ws');
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
  let msgId = 1;
  const pending = new Map();

  ws.on('message', data => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  await new Promise(r => ws.on('open', r));

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { pending.delete(id); reject(new Error('timeout')); }, 30000);
    });
  }

  async function navigate(url) {
    await send('Page.navigate', { url });
    await sleep(3000);
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    return result?.result?.result?.value;
  }

  async function screenshot(name) {
    try {
      const result = await send('Page.captureScreenshot', { format: 'png', quality: 80 });
      if (result?.result?.data) {
        const dir = path.join(__dirname, '..', 'screenshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(result.result.data, 'base64'));
        console.log(`  Screenshot: ${name}.png`);
      }
    } catch { }
  }

  return { send, navigate, evaluate, screenshot, ws };
}

async function main() {
  console.log('=== Hacker News Submit for RaiseGG ===\n');

  // Ensure ws module
  try {
    require('ws');
  } catch {
    console.log('Installing ws...');
    execSync('npm install ws', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  }

  // Launch Chrome
  console.log('Launching Chrome on port ' + DEBUG_PORT + '...');
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=' + PROFILE_DIR,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900',
    'https://news.ycombinator.com/submit',
  ], { detached: true, stdio: 'ignore' });
  chrome.unref();

  console.log('Waiting for Chrome to start...');
  await sleep(5000);

  // Connect
  let pages;
  for (let i = 0; i < 10; i++) {
    try {
      pages = await getPages();
      if (pages.length > 0) break;
    } catch { }
    await sleep(2000);
  }

  if (!pages || pages.length === 0) {
    console.log('ERROR: Could not connect to Chrome');
    return;
  }

  const page = pages.find(p => p.type === 'page' && p.url.includes('ycombinator'));
  if (!page) {
    console.log('ERROR: No HN tab found');
    console.log('Pages:', pages.map(p => p.url));
    return;
  }

  const cdp = await connectToPage(page.webSocketDebuggerUrl);
  console.log('Connected to Chrome!\n');

  await sleep(3000);
  await cdp.screenshot('hn-01-initial');

  // Check if we're on submit page or got redirected to login
  const currentUrl = await cdp.evaluate('window.location.href');
  console.log('Current URL:', currentUrl);

  // Check if logged in by looking for submit form
  const hasSubmitForm = await cdp.evaluate(`
    !!document.querySelector('input[name="t"]') || !!document.querySelector('form[action="r"]')
  `);

  const hasLoginForm = await cdp.evaluate(`
    !!document.querySelector('input[name="acct"]') || window.location.href.includes('/login')
  `);

  if (!hasSubmitForm && (hasLoginForm || currentUrl.includes('/login'))) {
    console.log('\nNot logged in. Navigating to login page...');
    await cdp.navigate('https://news.ycombinator.com/login');
    await sleep(2000);
    await cdp.screenshot('hn-02-login-page');

    console.log('Please log into Hacker News in the Chrome window.');
    console.log('Waiting up to 3 minutes...\n');

    let loggedIn = false;
    for (let i = 0; i < 36; i++) {
      await sleep(5000);
      const url = await cdp.evaluate('window.location.href');
      const stillLogin = await cdp.evaluate(`
        !!document.querySelector('input[name="acct"]') || window.location.href.includes('/login')
      `);
      if (!stillLogin) {
        loggedIn = true;
        break;
      }
      if (i % 6 === 0) console.log(`  Still waiting... (${Math.round((i * 5) / 60)}m elapsed)`);
    }

    if (!loggedIn) {
      console.log('Timed out waiting for login. Please log in and run again.');
      return;
    }
    console.log('Logged in!\n');
    await cdp.screenshot('hn-03-logged-in');

    // Navigate to submit page
    console.log('Navigating to submit page...');
    await cdp.navigate('https://news.ycombinator.com/submit');
    await sleep(3000);
  } else {
    console.log('Already logged in!\n');
  }

  await cdp.screenshot('hn-04-submit-page');

  // Fill in the title
  console.log('Filling in submission...');
  const filledTitle = await cdp.evaluate(`
    (function() {
      var inp = document.querySelector('input[name="title"]');
      if (!inp) return 'no title input found';
      inp.focus();
      inp.value = '';
      document.execCommand('selectAll');
      document.execCommand('insertText', false, ${JSON.stringify(HN_TITLE)});
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return 'filled';
    })()
  `);
  console.log('  Title:', filledTitle);
  await sleep(500);

  // Fill in the URL
  const filledUrl = await cdp.evaluate(`
    (function() {
      var inp = document.querySelector('input[name="url"]');
      if (!inp) return 'no url input found';
      inp.focus();
      inp.value = '';
      document.execCommand('selectAll');
      document.execCommand('insertText', false, ${JSON.stringify(HN_URL)});
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return 'filled';
    })()
  `);
  console.log('  URL:', filledUrl);
  await sleep(1000);

  await cdp.screenshot('hn-05-filled-form');

  // Click submit
  console.log('\nSubmitting...');
  const submitted = await cdp.evaluate(`
    (function() {
      // Look for the submit button
      var btn = document.querySelector('input[type="submit"]');
      if (btn) { btn.click(); return 'clicked submit button'; }

      // Fallback: look for button with submit text
      var buttons = document.querySelectorAll('button, input[type="button"]');
      for (var b of buttons) {
        if (/submit/i.test(b.value || b.textContent)) {
          b.click();
          return 'clicked: ' + (b.value || b.textContent).trim();
        }
      }

      // Fallback: submit the form directly
      var form = document.querySelector('form');
      if (form) { form.submit(); return 'submitted form'; }

      return 'no submit button found';
    })()
  `);
  console.log('  Result:', submitted);

  await sleep(5000);
  await cdp.screenshot('hn-06-after-submit');

  const finalUrl = await cdp.evaluate('window.location.href');
  console.log('\nFinal URL:', finalUrl);

  if (finalUrl.includes('/newest') || finalUrl.includes('/item')) {
    console.log('\nSubmission appears successful!');
  } else {
    console.log('\nCheck the Chrome window for the result.');
  }

  console.log('\nBrowser left open. Script finished.');
}

main().catch(e => console.error('Error:', e.message));
