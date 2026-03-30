const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(require('os').tmpdir(), 'raisegg-chrome-profile');
const SCREENSHOT_PATH = path.join(__dirname, '..', 'reddit-signup-screenshot.png');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
  }).catch(() => null);

  let page;
  let ownBrowser;

  if (browser) {
    const pages = await browser.pages();
    page = pages[pages.length - 1];
    console.log('Connected to existing browser');
  } else {
    // Launch fresh
    ownBrowser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: false,
      defaultViewport: null,
      userDataDir: TEMP_PROFILE,
      args: ['--start-maximized', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9222'],
    });
    page = await ownBrowser.newPage();
    await page.goto('https://www.reddit.com/register', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);
    console.log('Launched new browser');
  }

  // Take screenshot
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  console.log('Screenshot saved to: ' + SCREENSHOT_PATH);

  // Try EVERY possible way to find and click Google button
  const result = await page.evaluate(() => {
    const info = { buttons: [], links: [], iframes: [], allText: '' };

    // Log all clickable elements
    document.querySelectorAll('button, a, [role="button"], input[type="submit"]').forEach(el => {
      const text = (el.textContent || '').trim().substring(0, 80);
      const href = el.getAttribute('href') || '';
      const cls = el.className || '';
      const id = el.id || '';
      if (text) info.buttons.push({ text, href, cls: cls.substring(0, 50), id, tag: el.tagName });
    });

    // Check for iframes (Reddit sometimes uses iframes for auth)
    document.querySelectorAll('iframe').forEach(f => {
      info.iframes.push(f.src || f.id || 'unknown');
    });

    // Try clicking anything with "google" in it
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      const text = (el.textContent || '').toLowerCase();
      const cls = (el.className || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const src = (el.getAttribute('src') || '').toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

      if (text.includes('google') || cls.includes('google') || id.includes('google') ||
          src.includes('google') || href.includes('google') || ariaLabel.includes('google')) {
        // Found something Google-related - click the nearest clickable parent
        let target = el;
        while (target && !['BUTTON', 'A'].includes(target.tagName)) {
          target = target.parentElement;
        }
        if (target) {
          target.click();
          return { clicked: true, what: target.textContent?.substring(0, 50), buttons: info.buttons };
        } else {
          el.click();
          return { clicked: true, what: 'direct: ' + el.textContent?.substring(0, 50), buttons: info.buttons };
        }
      }
    }

    // Also try Apple, or any SSO
    for (const el of allEls) {
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('continue with') || text.includes('sign up with')) {
        let target = el;
        while (target && !['BUTTON', 'A'].includes(target.tagName)) target = target.parentElement;
        if (target) {
          info.buttons.push({ text: 'FOUND SSO: ' + target.textContent?.substring(0, 50), tag: target.tagName });
        }
      }
    }

    return { clicked: false, buttons: info.buttons, iframes: info.iframes };
  });

  console.log('Page analysis:', JSON.stringify(result, null, 2));

  if (result.clicked) {
    console.log('Clicked: ' + result.what);
    await sleep(5000);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log('Post-click screenshot saved');
  }
}

main().catch(e => console.error(e.message));
