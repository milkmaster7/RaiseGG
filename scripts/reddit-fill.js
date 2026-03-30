const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try { execSync('taskkill /f /im chrome.exe', { stdio: 'pipe' }); } catch {}
  await sleep(2000);

  const tmpDir = require('os').tmpdir();
  const profiles = fs.readdirSync(tmpDir).filter(f => f.startsWith('rgg-stealth-'));
  const profile = profiles.length > 0 ? path.join(tmpDir, profiles[profiles.length - 1]) : path.join(tmpDir, 'rgg-fill-' + Date.now());

  const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const USERNAME = 'RaiseGG_Official';
  const PASSWORD = 'RGG_x7k9m2p4v8n1';

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    defaultViewport: { width: 1200, height: 900 },
    userDataDir: profile,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.goto('https://www.reddit.com/register/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  console.log('On signup page. Filling email...');

  // Reddit uses custom inputs — click the Email area and type
  // The email field has placeholder "Email*"
  await page.click('input, [placeholder*="mail"], [aria-label*="mail"]').catch(() => {});

  // Try clicking text "Email*"
  const clicked = await page.evaluate(() => {
    // Find all input-like elements
    const inputs = document.querySelectorAll('input, faceplate-text-input, [contenteditable]');
    for (const inp of inputs) {
      const ph = inp.getAttribute('placeholder') || inp.getAttribute('aria-label') || '';
      if (ph.toLowerCase().includes('email') || ph.toLowerCase().includes('mail')) {
        inp.focus();
        inp.click();
        return 'found input: ' + ph;
      }
    }
    // Try shadow DOM
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if (el.shadowRoot) {
        const shadowInputs = el.shadowRoot.querySelectorAll('input');
        for (const si of shadowInputs) {
          const ph = si.getAttribute('placeholder') || si.getAttribute('type') || '';
          if (ph.toLowerCase().includes('email') || si.type === 'email') {
            si.focus();
            si.click();
            return 'found shadow input: ' + ph;
          }
        }
      }
    }
    return 'not found';
  });
  console.log('Email field: ' + clicked);

  // Type into whatever is focused
  await page.keyboard.type('raisegg.platform@proton.me', { delay: 50 });
  await sleep(1000);
  await page.screenshot({ path: path.join(__dirname, '..', 'reddit-email.png') });
  console.log('Email typed. Screenshot: reddit-email.png');

  // Press Enter or click Continue
  await sleep(500);
  const continueBtnClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, faceplate-button');
    for (const btn of buttons) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text === 'continue' && btn.offsetParent !== null) {
        btn.click();
        return true;
      }
    }
    // Try shadow DOM buttons
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if (el.shadowRoot) {
        const btns = el.shadowRoot.querySelectorAll('button');
        for (const b of btns) {
          if ((b.textContent || '').trim().toLowerCase() === 'continue') {
            b.click();
            return true;
          }
        }
      }
    }
    return false;
  });

  if (!continueBtnClicked) {
    await page.keyboard.press('Enter');
    console.log('Pressed Enter');
  } else {
    console.log('Clicked Continue');
  }

  await sleep(5000);
  await page.screenshot({ path: path.join(__dirname, '..', 'reddit-step2.png') });
  console.log('Step 2 screenshot saved');

  // Now fill username
  const step2State = await page.evaluate(() => {
    const inputs = [];
    document.querySelectorAll('input').forEach(i => {
      inputs.push({ name: i.name, type: i.type, placeholder: i.placeholder, visible: i.offsetParent !== null });
    });
    // Check shadow DOM
    document.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        el.shadowRoot.querySelectorAll('input').forEach(i => {
          inputs.push({ name: i.name, type: i.type, placeholder: i.placeholder, shadow: true, visible: i.offsetParent !== null });
        });
      }
    });
    return { url: location.href, inputs };
  });
  console.log('Step 2 state:', JSON.stringify(step2State, null, 2));

  // Fill username if visible
  for (const inp of step2State.inputs) {
    if (inp.name === 'username' || inp.placeholder?.toLowerCase().includes('username')) {
      if (inp.shadow) {
        await page.evaluate((name) => {
          document.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
              const i = el.shadowRoot.querySelector(`input[name="${name}"], input[placeholder*="sername"]`);
              if (i) { i.focus(); i.value = ''; }
            }
          });
        }, inp.name);
      } else {
        const el = await page.$(`input[name="${inp.name}"]`) || await page.$(`input[placeholder*="sername"]`);
        if (el) { await el.click({ clickCount: 3 }); await el.type(USERNAME, { delay: 50 }); }
      }
      console.log('Typed username: ' + USERNAME);
    }
    if (inp.name === 'password' || inp.type === 'password') {
      if (inp.shadow) {
        await page.evaluate(() => {
          document.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
              const i = el.shadowRoot.querySelector('input[type="password"]');
              if (i) { i.focus(); i.value = ''; }
            }
          });
        });
      } else {
        const el = await page.$('input[type="password"]') || await page.$(`input[name="${inp.name}"]`);
        if (el) { await el.click({ clickCount: 3 }); await el.type(PASSWORD, { delay: 50 }); }
      }
      console.log('Typed password');
    }
  }

  await sleep(1000);

  // Click signup button
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text.includes('sign up') || text === 'continue') {
        if (btn.offsetParent !== null) { btn.click(); return; }
      }
    }
  });
  console.log('Clicked signup');

  await sleep(5000);
  await page.screenshot({ path: path.join(__dirname, '..', 'reddit-step3.png') });
  console.log('Step 3 screenshot saved');

  // Wait for completion
  console.log('Waiting for signup to finish...');
  const start = Date.now();
  while (Date.now() - start < 300000) {
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
    console.log('All saved + pushed to Vercel!');
    try { execSync('node scripts/reddit-setup-subreddit.js', { cwd: dir, stdio: 'inherit' }); } catch {}
  }

  await new Promise(r => browser.on('disconnected', r));
}

main().catch(e => console.error(e.message));
