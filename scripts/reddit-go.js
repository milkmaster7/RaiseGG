const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE = path.join(require('os').tmpdir(), 'rgg-reddit-' + Date.now());

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    defaultViewport: { width: 1200, height: 900 },
    userDataDir: PROFILE,
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  const page = await browser.newPage();
  await page.goto('https://www.reddit.com/register/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  // Click "Continue with Google" — use XPath text match
  console.log('Clicking Continue with Google...');
  try {
    // Method 1: find by visible text
    const els = await page.$$('button, a, div[role="button"]');
    for (const el of els) {
      const text = await page.evaluate(e => e.textContent || '', el);
      if (text.toLowerCase().includes('continue with google') || text.toLowerCase().includes('google')) {
        await el.click();
        console.log('Clicked Google button!');
        break;
      }
    }
  } catch (e) {
    console.log('Click failed:', e.message);
  }

  await sleep(5000);

  // Check if Google auth popup opened
  const pages = await browser.pages();
  console.log('Open tabs: ' + pages.length);

  if (pages.length > 2) {
    console.log('Google popup detected, waiting for login...');
  } else {
    // Take screenshot to see state
    await page.screenshot({ path: path.join(__dirname, '..', 'reddit-state.png') });
    console.log('Screenshot saved to reddit-state.png');
  }

  // Now wait for the user to complete Google login and Reddit onboarding
  console.log('');
  console.log('Waiting for Reddit signup to finish...');
  console.log('(auto-detecting completion, max 10 min)');

  const start = Date.now();
  while (Date.now() - start < 600000) {
    try {
      const url = page.url();
      if (url && url.includes('reddit.com') &&
          !url.includes('/register') && !url.includes('/signup') &&
          !url.includes('/account') && !url.includes('accounts.google')) {
        console.log('Signup complete! URL: ' + url);
        break;
      }
    } catch {}
    await sleep(3000);
  }

  // Get username
  await sleep(2000);
  let username = '';
  try {
    username = await page.evaluate(async () => {
      const r = await fetch('https://www.reddit.com/api/v1/me.json', { credentials: 'include' });
      const d = await r.json();
      return d.name || '';
    });
  } catch {}

  if (username) {
    console.log('SUCCESS! Reddit username: u/' + username);

    // Save to env
    const envPath = path.join(__dirname, '..', '.env.local');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf-8'); } catch {}

    const set = (k, v) => {
      const rx = new RegExp(`^${k}=.*$`, 'm');
      if (rx.test(content)) content = content.replace(rx, `${k}=${v}`);
      else content += `\n${k}=${v}`;
    };
    set('REDDIT_USERNAME', username);
    fs.writeFileSync(envPath, content);

    // Push to Vercel
    const dir = path.join(__dirname, '..');
    try { execSync(`npx vercel env rm REDDIT_USERNAME production -y`, { cwd: dir, stdio: 'pipe' }); } catch {}
    try { execSync(`printf "${username}" | npx vercel env add REDDIT_USERNAME production`, { cwd: dir, stdio: 'pipe' }); } catch {}
    console.log('Pushed to Vercel!');

    // Now navigate to settings to set a password (needed for API access)
    console.log('');
    console.log('Now setting a password for API access...');
    await page.goto('https://www.reddit.com/settings/account', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(__dirname, '..', 'reddit-settings.png') });
    console.log('Settings screenshot saved. Need to set password manually for API posting.');
    console.log('');
    console.log('DONE! u/' + username + ' is ready.');
  } else {
    console.log('Could not detect username yet. Check the browser.');
  }

  // Don't close browser - let user see it
  console.log('Browser stays open. Close it when ready.');
  await new Promise(r => browser.on('disconnected', r));
}

main().catch(e => console.error('Error:', e.message));
