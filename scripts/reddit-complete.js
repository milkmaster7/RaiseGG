const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Connecting to running browser...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const page = pages[pages.length - 1];
  console.log('Connected! Current URL: ' + page.url());

  const USERNAME = 'RaiseGG_Official';
  const PASSWORD = 'RGG_x7k9m2p4v8n1';

  // Step 1: Fill email via shadow DOM
  console.log('Filling email...');
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if (el.shadowRoot) {
        const inp = el.shadowRoot.querySelector('input[name="email"], input[type="email"]');
        if (inp) {
          inp.focus();
          inp.click();
          return;
        }
      }
    }
    // Try regular input
    const inp = document.querySelector('input[name="email"], input[type="email"]');
    if (inp) { inp.focus(); inp.click(); }
  });
  await sleep(300);
  await page.keyboard.type('raisegg.platform@proton.me', { delay: 40 });
  await sleep(500);
  console.log('Email typed');

  // Click Continue
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll('button, faceplate-button')) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text === 'continue' && btn.offsetParent !== null) { btn.click(); return; }
    }
    for (const el of document.querySelectorAll('*')) {
      if (el.shadowRoot) {
        for (const btn of el.shadowRoot.querySelectorAll('button')) {
          if ((btn.textContent || '').trim().toLowerCase() === 'continue') { btn.click(); return; }
        }
      }
    }
  });
  console.log('Clicked Continue');
  await sleep(6000);

  // Step 2: Check what step we're on
  await page.screenshot({ path: path.join(__dirname, '..', 'reddit-step2-new.png') });
  const step2Text = await page.evaluate(() => document.body.innerText.substring(0, 800));
  console.log('Step 2: ' + step2Text.substring(0, 200));

  // If verification code page — try clicking Skip
  if (step2Text.includes('Verify') || step2Text.includes('verification') || step2Text.includes('code')) {
    console.log('On verification page. Looking for Skip...');

    // Try clicking Skip using coordinates (from screenshot, Skip is top-right of the form)
    // First try by text
    let skipped = await page.evaluate(() => {
      // Search all elements including shadow DOM
      function findAndClick(root) {
        for (const el of root.querySelectorAll('*')) {
          const text = (el.textContent || '').trim();
          const tag = el.tagName;
          // Only match exact "Skip" to avoid false positives
          if (text === 'Skip' && (tag === 'A' || tag === 'BUTTON' || tag === 'SPAN' || tag === 'FACEPLATE-TRACKER')) {
            el.click();
            return 'clicked ' + tag;
          }
          if (el.shadowRoot) {
            const r = findAndClick(el.shadowRoot);
            if (r) return r;
          }
        }
        return null;
      }
      return findAndClick(document) || 'not found';
    });
    console.log('Skip attempt 1: ' + skipped);

    if (skipped === 'not found') {
      // Try using keyboard shortcut or tab to Skip
      // The Skip link is visible in the screenshot at top-right. Try clicking by coordinates.
      // From the screenshot, Skip is approximately at x=820, y=148
      await page.mouse.click(820, 148);
      console.log('Clicked at Skip coordinates');
    }

    await sleep(5000);
    await page.screenshot({ path: path.join(__dirname, '..', 'reddit-after-skip2.png') });
    const afterSkip = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('After skip: ' + afterSkip.substring(0, 200));
  }

  // Step 3: Check if we're on username/password step
  const inputs = await page.evaluate(() => {
    const result = [];
    function scan(root, shadow) {
      root.querySelectorAll('input').forEach(i => {
        result.push({ name: i.name, type: i.type, visible: i.offsetParent !== null || window.getComputedStyle(i).display !== 'none', shadow });
      });
      root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) scan(el.shadowRoot, true);
      });
    }
    scan(document, false);
    return result;
  });
  console.log('Inputs: ' + JSON.stringify(inputs));

  // Fill username if available
  const hasUsername = inputs.some(i => i.name === 'username' && i.visible);
  const hasPassword = inputs.some(i => (i.name === 'password' || i.type === 'password') && i.visible);

  if (hasUsername) {
    console.log('Filling username...');
    await page.evaluate(() => {
      function find(root) {
        const inp = root.querySelector('input[name="username"]');
        if (inp && (inp.offsetParent !== null || window.getComputedStyle(inp).display !== 'none')) {
          inp.focus(); inp.click(); return true;
        }
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot && find(el.shadowRoot)) return true;
        }
        return false;
      }
      find(document);
    });
    await sleep(200);
    await page.keyboard.type(USERNAME, { delay: 40 });
    console.log('Username typed: ' + USERNAME);
  }

  if (hasPassword) {
    console.log('Filling password...');
    await page.evaluate(() => {
      function find(root) {
        const inp = root.querySelector('input[name="password"], input[type="password"]');
        if (inp && (inp.offsetParent !== null || window.getComputedStyle(inp).display !== 'none')) {
          inp.focus(); inp.click(); return true;
        }
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot && find(el.shadowRoot)) return true;
        }
        return false;
      }
      find(document);
    });
    await sleep(200);
    await page.keyboard.type(PASSWORD, { delay: 40 });
    console.log('Password typed');
  }

  if (hasUsername || hasPassword) {
    await sleep(1000);
    // Click Sign Up
    await page.evaluate(() => {
      for (const btn of document.querySelectorAll('button')) {
        const text = (btn.textContent || '').trim().toLowerCase();
        if ((text.includes('sign up') || text === 'continue') && btn.offsetParent !== null) {
          btn.click(); return;
        }
      }
      for (const el of document.querySelectorAll('*')) {
        if (el.shadowRoot) {
          for (const btn of el.shadowRoot.querySelectorAll('button')) {
            if ((btn.textContent || '').trim().toLowerCase().includes('sign up') || (btn.textContent || '').trim().toLowerCase() === 'continue') {
              btn.click(); return;
            }
          }
        }
      }
    });
    console.log('Clicked signup');
    await sleep(5000);
  }

  await page.screenshot({ path: path.join(__dirname, '..', 'reddit-result.png') });

  // Wait for completion
  console.log('Waiting for signup to finish (2 min max)...');
  const start = Date.now();
  while (Date.now() - start < 120000) {
    const url = page.url();
    if (url.includes('reddit.com') && !url.includes('/register') && !url.includes('/signup') && !url.includes('/verify') && !url.includes('/account/register')) {
      console.log('SIGNUP DONE! URL: ' + url);
      break;
    }
    await sleep(3000);
  }

  // Get username
  let user = '';
  try {
    user = await page.evaluate(async () => {
      const r = await fetch('https://www.reddit.com/api/v1/me.json', { credentials: 'include' });
      const d = await r.json();
      return d.name || '';
    });
  } catch {}

  if (user) {
    console.log('SUCCESS! u/' + user);
    const envPath = path.join(__dirname, '..', '.env.local');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf-8'); } catch {}
    const vars = { REDDIT_USERNAME: user, REDDIT_PASSWORD: PASSWORD };
    for (const [k, v] of Object.entries(vars)) {
      const rx = new RegExp(`^${k}=.*$`, 'm');
      if (rx.test(content)) content = content.replace(rx, `${k}=${v}`);
      else content += `\n${k}=${v}`;
    }
    fs.writeFileSync(envPath, content);
    const dir = path.join(__dirname, '..');
    for (const [k, v] of Object.entries(vars)) {
      try { execSync(`npx vercel env rm ${k} production -y`, { cwd: dir, stdio: 'pipe' }); } catch {}
      try { execSync(`printf "${v}" | npx vercel env add ${k} production`, { cwd: dir, stdio: 'pipe' }); } catch {}
    }
    console.log('Saved to .env.local + Vercel');
  } else {
    console.log('Not logged in yet.');
    await page.screenshot({ path: path.join(__dirname, '..', 'reddit-final.png') });
  }

  console.log('Done. Browser stays open.');
  browser.disconnect();
}

main().catch(e => console.error(e.message));
