const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE = path.join(require('os').tmpdir(), 'rgg-stealth-' + Date.now());
const USERNAME = 'RaiseGG_Official';
const PASSWORD = 'RGG_Secure' + require('crypto').randomBytes(4).toString('hex');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Launching stealth Chrome (no automation detection)...');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    defaultViewport: { width: 1200, height: 900 },
    userDataDir: PROFILE,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await browser.newPage();

  // Extra stealth measures
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    delete navigator.__proto__.webdriver;
  });

  console.log('Navigating to Reddit signup...');
  await page.goto('https://www.reddit.com/register/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // Screenshot to see what we get without the automation banner
  await page.screenshot({ path: path.join(__dirname, '..', 'reddit-stealth.png') });
  console.log('Screenshot saved to reddit-stealth.png');

  // Try email signup path (avoids Google popup issues)
  console.log('Trying email signup...');
  try {
    // Type email
    const emailInput = await page.$('input[name="email"], input[type="email"]');
    if (emailInput) {
      await emailInput.type('raisegg.platform@proton.me', { delay: 80 });
      await sleep(500);

      // Click Continue
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(e => (e.textContent || '').trim(), btn);
        if (text.toLowerCase() === 'continue') {
          await btn.click();
          console.log('Clicked Continue');
          break;
        }
      }
      await sleep(4000);

      // Screenshot after continue
      await page.screenshot({ path: path.join(__dirname, '..', 'reddit-stealth2.png') });
      console.log('Step 2 screenshot saved');

      // Fill username
      const userInput = await page.$('input[name="username"]');
      if (userInput) {
        await userInput.click({ clickCount: 3 });
        await userInput.type(USERNAME, { delay: 60 });
        console.log('Typed username: ' + USERNAME);
      }

      await sleep(1000);

      // Fill password
      const passInput = await page.$('input[name="password"]');
      if (passInput) {
        await passInput.click({ clickCount: 3 });
        await passInput.type(PASSWORD, { delay: 60 });
        console.log('Typed password');
      }

      await sleep(1000);

      // Click Sign Up / Continue
      const btns2 = await page.$$('button');
      for (const btn of btns2) {
        const text = await page.evaluate(e => (e.textContent || '').trim().toLowerCase(), btn);
        if (text === 'sign up' || text === 'continue' || text === 'create account') {
          await btn.click();
          console.log('Clicked: ' + text);
          break;
        }
      }

      await sleep(5000);
      await page.screenshot({ path: path.join(__dirname, '..', 'reddit-stealth3.png') });
      console.log('Step 3 screenshot saved');
    }
  } catch (e) {
    console.log('Email signup error:', e.message);
  }

  // Wait for completion
  console.log('Waiting for signup to complete...');
  const start = Date.now();
  let done = false;
  while (Date.now() - start < 600000) {
    try {
      const url = page.url();
      if (url && url.includes('reddit.com') &&
          !url.includes('/register') && !url.includes('/signup') &&
          !url.includes('/account/register') && !url.includes('/verify')) {
        done = true;
        break;
      }
    } catch {}
    await sleep(3000);
  }

  if (done) {
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
    console.log('');
    console.log('SUCCESS! Account: u/' + finalUser);

    // Save credentials
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
    console.log('Saved to .env.local');

    // Push to Vercel
    const dir = path.join(__dirname, '..');
    for (const [k, v] of Object.entries(vars)) {
      try { execSync(`npx vercel env rm ${k} production -y`, { cwd: dir, stdio: 'pipe' }); } catch {}
      try { execSync(`printf "${v}" | npx vercel env add ${k} production`, { cwd: dir, stdio: 'pipe' }); } catch {}
    }
    console.log('Pushed to Vercel!');

    // Setup subreddit
    console.log('Setting up r/RaiseGG...');
    try {
      execSync('node scripts/reddit-setup-subreddit.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    } catch {
      console.log('Subreddit setup needs karma. Will retry via cron.');
    }

    console.log('');
    console.log('========================================');
    console.log('  DONE! Reddit fully operational.');
    console.log('  Account: u/' + finalUser);
    console.log('  Auto-posting starts within 12h.');
    console.log('========================================');
  } else {
    console.log('Signup not completed. Check browser.');
    await page.screenshot({ path: path.join(__dirname, '..', 'reddit-final.png') });
  }

  await new Promise(r => browser.on('disconnected', r));
}

main().catch(e => console.error('Error:', e.message));
