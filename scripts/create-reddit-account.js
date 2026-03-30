const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(require('os').tmpdir(), 'raisegg-chrome-profile');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  Reddit Auto-Setup for RaiseGG');
  console.log('========================================');
  console.log('');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    userDataDir: TEMP_PROFILE,
    args: ['--start-maximized', '--no-first-run', '--no-default-browser-check'],
  });

  const page = await browser.newPage();

  try {
    console.log('Opening Reddit signup...');
    await page.goto('https://www.reddit.com/register', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Click "Continue with Google"
    console.log('Looking for Google SSO...');
    const clicked = await page.evaluate(() => {
      const all = document.querySelectorAll('button, a, div[role="button"]');
      for (const el of all) {
        const text = (el.textContent || '').toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        if (text.includes('google') || ariaLabel.includes('google')) {
          el.click();
          return 'google';
        }
      }
      return null;
    });

    if (clicked) {
      console.log('Clicked Google SSO!');
      console.log('');
      console.log('A Google login window should appear.');
      console.log('Log into Google there — Reddit account will be created automatically.');
      console.log('');
    } else {
      console.log('No Google button found. Reddit may have changed their UI.');
      console.log('Please sign up manually in the browser window.');
      console.log('');
    }

    console.log('Waiting for signup to complete...');

    // Wait for redirect away from register page (10 min timeout)
    const startTime = Date.now();
    let done = false;
    while (Date.now() - startTime < 600000) {
      try {
        const url = page.url();
        // Signup done when we're on reddit.com but NOT on register/signup pages
        if (url.includes('reddit.com') && !url.includes('/register') && !url.includes('/signup') && !url.includes('/account/register') && !url.includes('accounts.google')) {
          done = true;
          break;
        }
      } catch {}
      await sleep(3000);
    }

    if (!done) {
      console.log('Timed out. Complete signup in the browser, then close it.');
      // Wait for browser to close
      await new Promise(resolve => browser.on('disconnected', resolve));
    }

    // Get username
    console.log('Getting username...');
    await sleep(2000);
    let username = '';
    try {
      username = await page.evaluate(async () => {
        try {
          const r = await fetch('https://www.reddit.com/api/v1/me.json', { credentials: 'include' });
          const d = await r.json();
          return d.name || '';
        } catch { return ''; }
      });
    } catch {}

    if (username) {
      console.log('Reddit account: u/' + username);

      // We need the OAuth token for API access. Since we logged in via Google,
      // we don't have a password. But we can use the session cookies for now.
      // The reddit-poster uses password grant which won't work with Google SSO.
      // So we need to set a password on the account.

      console.log('');
      console.log('Setting a password on the account...');
      await page.goto('https://www.reddit.com/settings', { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(2000);

      // Save username to env
      const envPath = path.join(__dirname, '..', '.env.local');
      let content = '';
      try { content = fs.readFileSync(envPath, 'utf-8'); } catch {}

      const setEnv = (key, val) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${val}`);
        } else {
          content += `\n${key}=${val}`;
        }
      };

      setEnv('REDDIT_USERNAME', username);
      fs.writeFileSync(envPath, content);
      console.log('Username saved to .env.local');

      // Push to Vercel
      const projectDir = path.join(__dirname, '..');
      try {
        try { execSync(`npx vercel env rm REDDIT_USERNAME production -y`, { cwd: projectDir, stdio: 'pipe' }); } catch {}
        execSync(`printf "${username}" | npx vercel env add REDDIT_USERNAME production`, { cwd: projectDir, stdio: 'pipe' });
        console.log('Pushed REDDIT_USERNAME to Vercel');
      } catch {}

      console.log('');
      console.log('========================================');
      console.log('  Account created: u/' + username);
      console.log('');
      console.log('  NEXT: Set a password in Reddit settings');
      console.log('  so the auto-poster can log in via API.');
      console.log('  Go to Settings > Account > Change Password');
      console.log('========================================');
    } else {
      console.log('Could not detect username.');
    }

    try { await browser.close(); } catch {}

  } catch (err) {
    console.error('Error:', err.message);
    try { await browser.close(); } catch {}
  }
}

main().catch(console.error);
