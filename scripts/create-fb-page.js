/**
 * Creates a Facebook Page via CDP Chrome
 * Usage: node scripts/create-fb-page.js [page-name] [bio]
 */

const puppeteer = require('puppeteer-core');

const PAGE_NAME = process.argv[2] || 'RaiseGG';
const PAGE_BIO = process.argv[3] || 'Competitive gaming for real stakes. 1v1 CS2, Dota 2 & Deadlock. Win USDC prizes. raisegg.gg';
const CATEGORY = 'Gaming';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`Creating Facebook Page: ${PAGE_NAME}`);
  console.log(`Bio: ${PAGE_BIO}`);
  console.log(`Category: ${CATEGORY}\n`);

  // Connect with high timeouts (FB is extremely heavy)
  const browser = await puppeteer.connect({
    browserWSEndpoint: await getBrowserWS(),
    protocolTimeout: 180000,
  });

  // Get the target page directly via CDP to avoid browser.pages() hanging
  const targets = await browser.targets();
  let page = null;

  // Look for existing creation page
  for (const target of targets) {
    if (target.url().includes('pages/creation') && target.type() === 'page') {
      page = await target.page();
      console.log('Found existing creation page');
      break;
    }
  }

  if (!page) {
    // Find any regular page tab
    for (const target of targets) {
      if (target.type() === 'page' && !target.url().includes('fbsbx') && !target.url().includes('static_resources')) {
        page = await target.page();
        break;
      }
    }
    if (!page) {
      page = await browser.newPage();
    }
    console.log('Navigating to FB page creation...');
    await page.goto('https://www.facebook.com/pages/creation/', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    }).catch(e => console.log('Nav warning:', e.message.substring(0, 60)));
  }

  // Wait for React hydration
  console.log('Waiting for page to load...');
  await sleep(8000);

  // Check URL
  const url = page.url();
  console.log('URL:', url);

  if (url.includes('login') || url.includes('checkpoint')) {
    console.log('ERROR: Not logged in');
    browser.disconnect();
    return;
  }

  // Use CDP session directly to avoid puppeteer overhead
  const client = await page.target().createCDPSession();

  // Check form state
  const formState = await cdpEval(client, `
    JSON.stringify({
      nameValue: document.querySelector('input[type="text"]:not([aria-label*="Search"])')?.value || '',
      hasCat: !!document.querySelector('input[aria-label="Category (required)"]'),
      hasBio: !!document.querySelector('textarea'),
      bodySnippet: document.body?.innerText?.substring(0, 150) || ''
    })
  `);

  if (formState) {
    const state = JSON.parse(formState);
    console.log('Form state:', state);

    if (!state.hasCat) {
      console.log('ERROR: Form not loaded. Body:', state.bodySnippet);
      browser.disconnect();
      return;
    }
  }

  // 1. Set page name
  console.log('\n1. Setting name:', PAGE_NAME);
  await cdpEval(client, `
    (function() {
      const inp = document.querySelector('input[type="text"]:not([aria-label*="Search"])');
      if (!inp) return 'no input';
      inp.focus();
      inp.click();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '${PAGE_NAME}');
      inp.dispatchEvent(new Event('input', {bubbles: true}));
      inp.dispatchEvent(new Event('change', {bubbles: true}));
      inp.dispatchEvent(new Event('blur', {bubbles: true}));
      return inp.value;
    })()
  `).then(v => console.log('  Result:', v));
  await sleep(1500);

  // 2. Set category
  console.log('2. Setting category:', CATEGORY);
  await cdpEval(client, `document.querySelector('input[aria-label="Category (required)"]')?.focus()`);
  await sleep(300);

  // Type category using Input.insertText which is more reliable
  await client.send('Input.insertText', { text: CATEGORY }).catch(() => {});
  await sleep(2500);

  // Select first dropdown option
  await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 40, key: 'ArrowDown' });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 40, key: 'ArrowDown' });
  await sleep(300);
  await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, key: 'Enter' });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter' });
  console.log('  Category selected');
  await sleep(1500);

  // 3. Set bio
  console.log('3. Setting bio');
  await cdpEval(client, `
    (function() {
      const ta = document.querySelector('textarea');
      if (!ta) return 'no textarea';
      ta.focus();
      ta.click();
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, '${PAGE_BIO.replace(/'/g, "\\'")}');
      ta.dispatchEvent(new Event('input', {bubbles: true}));
      ta.dispatchEvent(new Event('change', {bubbles: true}));
      return ta.value.substring(0, 50) + '...';
    })()
  `).then(v => console.log('  Result:', v));
  await sleep(1500);

  // Verify form
  const verify = await cdpEval(client, `
    JSON.stringify({
      name: document.querySelector('input[type="text"]:not([aria-label*="Search"])')?.value,
      bio: document.querySelector('textarea')?.value?.substring(0, 40)
    })
  `);
  console.log('\nForm verification:', verify);

  // 4. Click Create Page
  console.log('\n4. Clicking Create Page...');
  const clickResult = await cdpEval(client, `
    (function() {
      const btns = document.querySelectorAll('[role="button"]');
      for (const b of btns) {
        if (b.textContent?.trim() === 'Create Page') {
          b.click();
          return 'clicked';
        }
      }
      return 'button not found';
    })()
  `);
  console.log('  Result:', clickResult);

  // Wait for creation
  console.log('Waiting for page creation...');
  await sleep(15000);

  const finalUrl = await cdpEval(client, 'window.location.href');
  console.log('\nFinal URL:', finalUrl);

  const finalText = await cdpEval(client, 'document.body?.innerText?.substring(0, 300) || ""');
  console.log('Page text:', finalText?.substring(0, 200));

  if (finalUrl && !finalUrl.includes('pages/creation')) {
    console.log('\n✓ PAGE CREATED SUCCESSFULLY!');
    console.log('URL:', finalUrl);
  } else {
    // Check for errors
    const errors = await cdpEval(client, `
      (function() {
        const text = document.body?.innerText || '';
        const lines = text.split('\\n').filter(l => l.includes('error') || l.includes('Error') || l.includes('required') || l.includes('can\\'t'));
        return lines.slice(0, 5).join(' | ');
      })()
    `);
    console.log('\nPossible errors:', errors || 'none detected');
    console.log('Still on creation page — may need manual intervention');
  }

  browser.disconnect();
}

async function cdpEval(client, expression) {
  try {
    const result = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    return result.result?.value;
  } catch (e) {
    console.log('  Eval error:', e.message.substring(0, 80));
    return null;
  }
}

async function getBrowserWS() {
  return new Promise((resolve, reject) => {
    const http = require('http');
    http.get('http://localhost:9222/json/version', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d).webSocketDebuggerUrl));
    }).on('error', reject);
  });
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
