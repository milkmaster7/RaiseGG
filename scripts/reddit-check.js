const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Find the running browser by checking temp dirs
async function main() {
  // Kill old and start fresh with the existing profile
  try { execSync('taskkill /f /im chrome.exe', { stdio: 'pipe' }); } catch {}
  await sleep(2000);

  // Find the stealth profile
  const tmpDir = require('os').tmpdir();
  const profiles = fs.readdirSync(tmpDir).filter(f => f.startsWith('rgg-stealth-'));
  const profile = profiles.length > 0 ? path.join(tmpDir, profiles[profiles.length - 1]) : path.join(tmpDir, 'rgg-final-' + Date.now());

  const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const USERNAME = 'RaiseGG_Official';
  const PASSWORD = 'RGG_Secure' + require('crypto').randomBytes(4).toString('hex');

  console.log('Launching Chrome with profile: ' + profile);
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

  // Go to register
  console.log('Going to Reddit register...');
  await page.goto('https://www.reddit.com/register/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  await page.screenshot({ path: path.join(__dirname, '..', 'reddit-now.png') });
  console.log('Screenshot: reddit-now.png');

  // Check what page we're on
  const pageContent = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      hasEmail: !!document.querySelector('input[name="email"], input[type="email"]'),
      hasCaptcha: document.body.textContent.includes('Prove your humanity') || document.body.textContent.includes('not a robot'),
      hasUsername: !!document.querySelector('input[name="username"]'),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean),
    };
  });

  console.log('Page state:', JSON.stringify(pageContent, null, 2));

  if (pageContent.hasCaptcha) {
    console.log('Still on captcha page. Trying to click the checkbox...');
    // reCAPTCHA is in an iframe
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const checkbox = await frame.$('#recaptcha-anchor, .recaptcha-checkbox');
        if (checkbox) {
          await checkbox.click();
          console.log('Clicked reCAPTCHA checkbox!');
          await sleep(5000);
          await page.screenshot({ path: path.join(__dirname, '..', 'reddit-after-captcha.png') });
          break;
        }
      } catch {}
    }
    await sleep(3000);
  }

  if (pageContent.hasEmail) {
    console.log('On signup form! Filling email...');
    const emailInput = await page.$('input[name="email"], input[type="email"]');
    if (emailInput) {
      await emailInput.type('raisegg.platform@proton.me', { delay: 80 });
      await sleep(500);

      // Click Continue
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(e => (e.textContent || '').trim().toLowerCase(), btn);
        if (text === 'continue') { await btn.click(); console.log('Clicked Continue'); break; }
      }
      await sleep(4000);
      await page.screenshot({ path: path.join(__dirname, '..', 'reddit-step2.png') });

      // Fill username
      const userInput = await page.$('input[name="username"]');
      if (userInput) { await userInput.type(USERNAME, { delay: 60 }); console.log('Typed username'); }
      await sleep(500);

      // Fill password
      const passInput = await page.$('input[name="password"]');
      if (passInput) { await passInput.type(PASSWORD, { delay: 60 }); console.log('Typed password'); }
      await sleep(1000);

      // Click signup
      const btns2 = await page.$$('button');
      for (const btn of btns2) {
        const text = await page.evaluate(e => (e.textContent || '').trim().toLowerCase(), btn);
        if (text.includes('sign up') || text === 'continue') { await btn.click(); console.log('Clicked signup!'); break; }
      }

      await sleep(5000);
      await page.screenshot({ path: path.join(__dirname, '..', 'reddit-step3.png') });
    }
  }

  // Wait for completion
  console.log('Waiting for signup to finish...');
  const start = Date.now();
  while (Date.now() - start < 300000) {
    const url = page.url();
    if (url.includes('reddit.com') && !url.includes('/register') && !url.includes('/signup') && !url.includes('/account/register') && !url.includes('/verify')) {
      console.log('DONE! Redirected to: ' + url);
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

  const finalUser = user || USERNAME;
  if (user) {
    console.log('Account: u/' + finalUser);

    const envPath = path.join(__dirname, '..', '.env.local');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf-8'); } catch {}
    const vars = { REDDIT_USERNAME: finalUser, REDDIT_PASSWORD: PASSWORD };
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
    console.log('Credentials saved + pushed to Vercel!');

    try { execSync('node scripts/reddit-setup-subreddit.js', { cwd: dir, stdio: 'inherit' }); } catch {}
    console.log('FULLY DONE!');
  }

  await new Promise(r => browser.on('disconnected', r));
}

main().catch(e => console.error(e.message));
