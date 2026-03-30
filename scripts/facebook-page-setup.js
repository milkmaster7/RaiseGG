/**
 * Facebook Page Setup for RaiseGG
 *
 * Launches Chrome with remote debugging, navigates to Facebook,
 * creates a RaiseGG gaming page, and extracts the Page ID + access token.
 *
 * Uses existing Facebook login session from user's browser profile.
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9222;
// Use a separate profile so we don't mess with user's main Chrome
const PROFILE_DIR = path.join(require('os').tmpdir(), 'rgg-fb-profile');

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
  console.log('=== Facebook Page Setup for RaiseGG ===\n');

  // Check if puppeteer's ws module is available
  try {
    require('ws');
  } catch {
    console.log('Installing ws...');
    execSync('npm install ws', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  }

  // Launch Chrome with debugging
  console.log('Launching Chrome...');

  // Use the user's default profile so we get their Facebook login
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=' + PROFILE_DIR,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900',
    'https://www.facebook.com',
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

  const page = pages.find(p => p.type === 'page' && p.url.includes('facebook'));
  if (!page) {
    console.log('ERROR: No Facebook tab found');
    console.log('Pages:', pages.map(p => p.url));
    return;
  }

  const cdp = await connectToPage(page.webSocketDebuggerUrl);
  console.log('Connected to Chrome!\n');

  await sleep(3000);
  await cdp.screenshot('01-initial');

  // Check if logged in
  const url = await cdp.evaluate('window.location.href');
  console.log('Current URL:', url);

  const isLoggedIn = await cdp.evaluate(`
    !document.querySelector('input[name="email"]') &&
    !window.location.href.includes('/login')
  `);

  if (!isLoggedIn) {
    console.log('\n⚠️  Not logged into Facebook.');
    console.log('Please log into Facebook in the Chrome window that just opened.');
    console.log('Waiting for login...');

    // Wait for login (check every 5 seconds for up to 5 minutes)
    let loggedIn = false;
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const currentUrl = await cdp.evaluate('window.location.href');
      const hasLoginForm = await cdp.evaluate('!!document.querySelector("input[name=\\"email\\"]")');
      if (!hasLoginForm && !currentUrl.includes('/login')) {
        loggedIn = true;
        break;
      }
    }

    if (!loggedIn) {
      console.log('Timed out waiting for login. Please log in and run again.');
      return;
    }
    console.log('Logged in!\n');
  } else {
    console.log('Already logged into Facebook!\n');
  }

  await cdp.screenshot('02-logged-in');

  // Navigate to page creation
  console.log('Navigating to Page creation...');
  await cdp.navigate('https://www.facebook.com/pages/create');
  await sleep(3000);
  await cdp.screenshot('03-create-page');

  // Fill in Page Name
  console.log('Filling page details...');

  // Try to fill the Page Name field
  const filledName = await cdp.evaluate(`
    (function() {
      // Look for Page name input
      const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
      for (const inp of inputs) {
        const label = inp.getAttribute('aria-label') || inp.getAttribute('placeholder') || '';
        if (/page name|name/i.test(label)) {
          inp.focus();
          inp.value = '';
          document.execCommand('selectAll');
          document.execCommand('insertText', false, 'RaiseGG');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return 'filled name: ' + label;
        }
      }
      // Try first visible text input
      for (const inp of inputs) {
        if (inp.offsetParent !== null) {
          inp.focus();
          document.execCommand('selectAll');
          document.execCommand('insertText', false, 'RaiseGG');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          return 'filled first input';
        }
      }
      return 'no input found';
    })()
  `);
  console.log('  Name:', filledName);
  await sleep(1000);

  // Fill Category
  const filledCategory = await cdp.evaluate(`
    (function() {
      const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
      for (const inp of inputs) {
        const label = inp.getAttribute('aria-label') || inp.getAttribute('placeholder') || '';
        if (/category|categor/i.test(label)) {
          inp.focus();
          inp.value = '';
          document.execCommand('selectAll');
          document.execCommand('insertText', false, 'Gaming');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          return 'filled category';
        }
      }
      // Try second visible input
      const visible = Array.from(inputs).filter(i => i.offsetParent !== null);
      if (visible.length >= 2) {
        visible[1].focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, 'Gaming');
        visible[1].dispatchEvent(new Event('input', { bubbles: true }));
        return 'filled second input';
      }
      return 'no category input found';
    })()
  `);
  console.log('  Category:', filledCategory);
  await sleep(2000);

  // Select "Gaming" from dropdown if it appears
  await cdp.evaluate(`
    (function() {
      const items = document.querySelectorAll('[role="option"], [role="listbox"] li, ul li');
      for (const item of items) {
        if (/gaming/i.test(item.textContent)) {
          item.click();
          return 'clicked gaming';
        }
      }
      // Try any clickable with "Gaming" text
      const all = document.querySelectorAll('div, span, li');
      for (const el of all) {
        if (el.textContent.trim() === 'Gaming' || el.textContent.trim() === 'Gaming Video Creator') {
          el.click();
          return 'clicked: ' + el.textContent.trim();
        }
      }
      return 'no dropdown';
    })()
  `);
  await sleep(1000);

  // Fill Bio/Description
  const filledBio = await cdp.evaluate(`
    (function() {
      const textareas = document.querySelectorAll('textarea');
      const bio = 'RaiseGG — Free esports staking platform. Play CS2, Dota 2 & Deadlock 1v1 matches for USDC prizes. Blockchain escrow on Solana. Free daily tournaments. raisegg.com';
      for (const ta of textareas) {
        ta.focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, bio);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return 'filled bio';
      }
      // Try third input
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).filter(i => i.offsetParent !== null);
      if (inputs.length >= 3) {
        inputs[2].focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, bio);
        return 'filled third input as bio';
      }
      return 'no bio field';
    })()
  `);
  console.log('  Bio:', filledBio);
  await sleep(1000);

  await cdp.screenshot('04-filled-form');

  // Look for Create Page button
  console.log('\nLooking for Create Page button...');
  const clickedCreate = await cdp.evaluate(`
    (function() {
      const buttons = document.querySelectorAll('div[role="button"], button, [aria-label*="Create"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'create page' || text === 'create') {
          btn.click();
          return 'clicked: ' + btn.textContent.trim();
        }
      }
      return 'no create button found - buttons: ' + Array.from(buttons).map(b => b.textContent.trim()).filter(t => t.length < 30).slice(0, 10).join(', ');
    })()
  `);
  console.log('  Create:', clickedCreate);

  await sleep(5000);
  await cdp.screenshot('05-after-create');

  // Check if page was created
  const newUrl = await cdp.evaluate('window.location.href');
  console.log('\nCurrent URL after create:', newUrl);

  // Try to extract Page ID
  const pageId = await cdp.evaluate(`
    (function() {
      // Check URL for page ID
      const match = window.location.href.match(/facebook\\.com\\/(\\d+)|page_id=(\\d+)|pages\\/[^/]+\\/(\\d+)/);
      if (match) return match[1] || match[2] || match[3];

      // Check meta tags
      const meta = document.querySelector('meta[property="al:android:url"]');
      if (meta) {
        const m = meta.content.match(/(\\d{10,})/);
        if (m) return m[1];
      }
      return null;
    })()
  `);

  if (pageId) {
    console.log('\n✅ Page created! Page ID:', pageId);
  } else {
    console.log('\nPage ID not found yet. May need manual steps.');
    console.log('Check the Chrome window for the page creation status.');
  }

  // Now get a Page Access Token
  console.log('\n--- Getting Page Access Token ---');
  console.log('Navigating to Graph API Explorer...');
  await cdp.navigate('https://developers.facebook.com/tools/explorer/');
  await sleep(5000);
  await cdp.screenshot('06-graph-explorer');

  const explorerUrl = await cdp.evaluate('window.location.href');
  console.log('Explorer URL:', explorerUrl);

  // Log current state for manual follow-up
  console.log('\n=== NEXT STEPS ===');
  console.log('1. If the page was created, note the Page ID from the URL');
  console.log('2. Go to developers.facebook.com and create a Business App');
  console.log('3. In Graph API Explorer:');
  console.log('   - Select your app');
  console.log('   - Add permission: pages_manage_posts');
  console.log('   - Generate token and select the RaiseGG page');
  console.log('   - Exchange for long-lived token');
  console.log('4. Run: node scripts/facebook-auth-server.js');
  console.log('   - Enter Page ID and token');
  console.log('   - It will test, save, and push to Vercel');

  // Keep browser open for manual interaction
  console.log('\nBrowser left open for you to complete setup.');
  console.log('Script finished.');
}

main().catch(e => console.error('Error:', e.message));
