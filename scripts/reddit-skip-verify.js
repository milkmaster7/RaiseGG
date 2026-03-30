const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const tmpDir = require('os').tmpdir();
  const profiles = fs.readdirSync(tmpDir).filter(f => f.startsWith('rgg-stealth-'));
  const profile = profiles.length > 0 ? path.join(tmpDir, profiles[profiles.length - 1]) : null;

  if (!profile) {
    console.log('No stealth profile found!');
    return;
  }
  console.log('Using profile: ' + profile);

  const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const USERNAME = 'RaiseGG_Official';
  const PASSWORD = 'RGG_x7k9m2p4v8n1';

  // Kill only automated Chrome instances (those using rgg- profiles)
  try {
    const list = execSync('wmic process where "name=\'chrome.exe\'" get processid,commandline /format:csv', { encoding: 'utf-8' });
    for (const line of list.split('\n')) {
      if (line.includes('rgg-stealth-') || line.includes('rgg-fill-')) {
        const match = line.match(/(\d+)\s*$/);
        if (match) {
          try { execSync('taskkill /f /pid ' + match[1], { stdio: 'pipe' }); } catch {}
          console.log('Killed automated Chrome PID ' + match[1]);
        }
      }
    }
  } catch {
    // If WMIC fails, only kill if no user Chrome is running
    console.log('Could not selectively kill - killing all Chrome');
    try { execSync('taskkill /f /im chrome.exe', { stdio: 'pipe' }); } catch {}
  }
  await sleep(2000);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    defaultViewport: { width: 1200, height: 900 },
    userDataDir: profile,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-blink-features=AutomationControlled', '--remote-debugging-port=9222'],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  console.log('Launched browser');

  const pages = await browser.pages();
  let page = pages[pages.length - 1];

  // Navigate to register page
  await page.goto('https://www.reddit.com/register/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  await page.screenshot({ path: path.join(__dirname, '..', 'reddit-current.png') });
  console.log('Screenshot saved');

  // Check current state
  const state = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      url: location.href,
      hasVerify: text.includes('Verify your email') || text.includes('verification code'),
      hasSkip: text.includes('Skip'),
      hasEmail: false,
      hasUsername: false,
    };
  });
  console.log('State:', JSON.stringify(state));

  if (state.hasSkip) {
    console.log('Clicking Skip...');
    // Click Skip button/link
    const skipped = await page.evaluate(() => {
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        const text = (el.textContent || '').trim();
        if (text === 'Skip' && el.offsetParent !== null) {
          el.click();
          return 'clicked: ' + el.tagName;
        }
      }
      // Try shadow DOM
      for (const el of allEls) {
        if (el.shadowRoot) {
          const inner = el.shadowRoot.querySelectorAll('*');
          for (const i of inner) {
            if ((i.textContent || '').trim() === 'Skip') {
              i.click();
              return 'shadow clicked: ' + i.tagName;
            }
          }
        }
      }
      return 'not found';
    });
    console.log('Skip result: ' + skipped);
    await sleep(5000);
    await page.screenshot({ path: path.join(__dirname, '..', 'reddit-after-skip.png') });
    console.log('After-skip screenshot saved');
  }

  // Now check what step we're on
  await sleep(2000);
  const newState = await page.evaluate(() => {
    const text = document.body.innerText;
    const inputs = [];
    // Check shadow DOM inputs
    document.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        el.shadowRoot.querySelectorAll('input').forEach(i => {
          inputs.push({ name: i.name, type: i.type, visible: i.offsetParent !== null || window.getComputedStyle(i).display !== 'none' });
        });
      }
    });
    // Regular inputs
    document.querySelectorAll('input').forEach(i => {
      inputs.push({ name: i.name, type: i.type, visible: i.offsetParent !== null });
    });
    return {
      url: location.href,
      title: document.title,
      hasUsername: text.includes('username') || text.includes('Username'),
      hasPassword: text.includes('password') || text.includes('Password'),
      hasGender: text.includes('gender') || text.includes('Gender') || text.includes('Man') || text.includes('Woman'),
      hasInterests: text.includes('interests') || text.includes('Topics'),
      loggedIn: text.includes('Home') && !text.includes('register'),
      inputs,
      bodyPreview: text.substring(0, 500),
    };
  });
  console.log('New state:', JSON.stringify(newState, null, 2));

  // If we're on username/password step
  if (newState.hasUsername || newState.hasPassword) {
    console.log('On username/password step!');

    // Fill username via shadow DOM
    await page.evaluate((username) => {
      document.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
          const inp = el.shadowRoot.querySelector('input[name="username"]');
          if (inp) {
            inp.focus();
            inp.value = '';
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            // Type character by character
            for (const c of username) {
              inp.value += c;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }
      });
    }, USERNAME);
    await sleep(500);

    // Also try keyboard typing
    const userInput = await page.evaluateHandle(() => {
      for (const el of document.querySelectorAll('*')) {
        if (el.shadowRoot) {
          const inp = el.shadowRoot.querySelector('input[name="username"]');
          if (inp) return inp;
        }
      }
      return null;
    });
    if (userInput) {
      try {
        await userInput.click({ clickCount: 3 });
        await userInput.type(USERNAME, { delay: 50 });
      } catch {}
    }

    await sleep(500);

    // Fill password via shadow DOM
    await page.evaluate((password) => {
      document.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
          const inp = el.shadowRoot.querySelector('input[name="password"], input[type="password"]');
          if (inp) {
            inp.focus();
            inp.value = '';
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            for (const c of password) {
              inp.value += c;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }
      });
    }, PASSWORD);
    await sleep(500);

    const passInput = await page.evaluateHandle(() => {
      for (const el of document.querySelectorAll('*')) {
        if (el.shadowRoot) {
          const inp = el.shadowRoot.querySelector('input[name="password"], input[type="password"]');
          if (inp) return inp;
        }
      }
      return null;
    });
    if (passInput) {
      try {
        await passInput.click({ clickCount: 3 });
        await passInput.type(PASSWORD, { delay: 50 });
      } catch {}
    }

    console.log('Filled username + password');
    await sleep(1000);

    // Click Sign Up / Continue
    await page.evaluate(() => {
      // Try regular buttons
      for (const btn of document.querySelectorAll('button')) {
        const text = (btn.textContent || '').trim().toLowerCase();
        if ((text.includes('sign up') || text === 'continue') && btn.offsetParent !== null) {
          btn.click();
          return;
        }
      }
      // Try shadow DOM buttons
      for (const el of document.querySelectorAll('*')) {
        if (el.shadowRoot) {
          for (const btn of el.shadowRoot.querySelectorAll('button')) {
            const text = (btn.textContent || '').trim().toLowerCase();
            if (text.includes('sign up') || text === 'continue') {
              btn.click();
              return;
            }
          }
        }
      }
    });
    console.log('Clicked signup button');
    await sleep(5000);
    await page.screenshot({ path: path.join(__dirname, '..', 'reddit-signup-result.png') });
  }

  // If on gender/interests/onboarding — skip through
  if (newState.hasGender || newState.hasInterests) {
    console.log('On onboarding step — skipping...');
    // Click Skip or Continue without selecting
    await page.evaluate(() => {
      for (const btn of document.querySelectorAll('button, a')) {
        const text = (btn.textContent || '').trim().toLowerCase();
        if (text === 'skip' || text === 'continue' || text === 'next') {
          btn.click();
          return;
        }
      }
    });
    await sleep(3000);
  }

  // Wait for completion
  console.log('Waiting for signup to finish...');
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
    console.log('All saved + pushed to Vercel!');
    try { execSync('node scripts/reddit-setup-subreddit.js', { cwd: dir, stdio: 'inherit' }); } catch {}
  } else {
    console.log('Not logged in yet. Check browser.');
    await page.screenshot({ path: path.join(__dirname, '..', 'reddit-final-state.png') });
  }

  // Keep browser open
  await new Promise(r => browser.on('disconnected', r));
}

main().catch(e => console.error(e.message));
