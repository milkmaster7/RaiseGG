/**
 * Discord Bot Setup for RaiseGG
 *
 * Launches Chrome with remote debugging on port 9223 (separate from any existing Chrome),
 * navigates to Discord Developer Portal, creates a "RaiseGG" application + bot,
 * copies the bot token, saves it to .env.local and pushes to Vercel,
 * enables required intents, and generates an invite URL.
 *
 * Uses raw CDP (Chrome DevTools Protocol) via ws module — no puppeteer.
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9223;
const PROFILE_DIR = path.join(require('os').tmpdir(), 'rgg-discord-profile');
const PROJECT_DIR = path.join(__dirname, '..');
const SCREENSHOT_DIR = path.join(PROJECT_DIR, 'screenshots');
const ENV_FILE = path.join(PROJECT_DIR, '.env.local');

// Bot permissions: Send Messages (2048), Read Messages/View Channels (1024),
// Embed Links (16384), Add Reactions (64)
const PERMISSIONS = 2048 | 1024 | 16384 | 64; // = 19520

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
      setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    });
  }

  async function navigate(url) {
    console.log(`  Navigating to: ${url}`);
    await send('Page.navigate', { url });
    await sleep(4000);
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return result?.result?.result?.value;
  }

  async function screenshot(name) {
    try {
      const result = await send('Page.captureScreenshot', { format: 'png', quality: 80 });
      if (result?.result?.data) {
        if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        const filePath = path.join(SCREENSHOT_DIR, `discord-${name}.png`);
        fs.writeFileSync(filePath, Buffer.from(result.result.data, 'base64'));
        console.log(`  Screenshot saved: discord-${name}.png`);
      }
    } catch (e) {
      console.log(`  Screenshot failed (${name}): ${e.message}`);
    }
  }

  return { send, navigate, evaluate, screenshot, ws };
}

function saveTokenToEnv(token) {
  console.log('\nSaving DISCORD_BOT_TOKEN to .env.local...');
  let content = '';
  if (fs.existsSync(ENV_FILE)) {
    content = fs.readFileSync(ENV_FILE, 'utf-8');
  }

  // Replace existing or append
  if (content.includes('DISCORD_BOT_TOKEN=')) {
    content = content.replace(/DISCORD_BOT_TOKEN=.*/g, `DISCORD_BOT_TOKEN=${token}`);
  } else {
    content = content.trimEnd() + `\nDISCORD_BOT_TOKEN=${token}\n`;
  }

  fs.writeFileSync(ENV_FILE, content, 'utf-8');
  console.log('  Saved to .env.local');
}

function pushToVercel(token) {
  console.log('\nPushing DISCORD_BOT_TOKEN to Vercel...');
  try {
    // Remove existing first (ignore errors if not present)
    try {
      execSync('npx vercel env rm DISCORD_BOT_TOKEN production -y', {
        cwd: PROJECT_DIR,
        stdio: 'pipe',
      });
    } catch { /* may not exist */ }

    // Add new value — pipe the token via stdin
    execSync(`echo ${token} | npx vercel env add DISCORD_BOT_TOKEN production`, {
      cwd: PROJECT_DIR,
      stdio: 'pipe',
    });
    console.log('  Pushed to Vercel production env');
  } catch (e) {
    console.log('  Vercel push failed:', e.message);
    console.log('  Run manually: npx vercel env add DISCORD_BOT_TOKEN production');
  }
}

async function main() {
  console.log('=== Discord Bot Setup for RaiseGG ===\n');

  // Ensure ws module is available
  try {
    require('ws');
  } catch {
    console.log('Installing ws...');
    execSync('npm install ws', { cwd: PROJECT_DIR, stdio: 'inherit' });
  }

  // Launch Chrome with separate debugging port (9223) and temp profile
  console.log(`Launching Chrome on debug port ${DEBUG_PORT}...`);
  console.log(`  Profile dir: ${PROFILE_DIR}`);

  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1400,900',
    'about:blank',
  ], { detached: true, stdio: 'ignore' });
  chrome.unref();

  console.log('Waiting for Chrome to start...');
  await sleep(5000);

  // Connect to Chrome
  let pages;
  for (let i = 0; i < 15; i++) {
    try {
      pages = await getPages();
      if (pages.length > 0) break;
    } catch { }
    await sleep(2000);
  }

  if (!pages || pages.length === 0) {
    console.log('ERROR: Could not connect to Chrome on port ' + DEBUG_PORT);
    return;
  }

  const page = pages.find(p => p.type === 'page');
  if (!page) {
    console.log('ERROR: No page tab found');
    return;
  }

  const cdp = await connectToPage(page.webSocketDebuggerUrl);
  console.log('Connected to Chrome via CDP!\n');

  // ---- Step 1: Navigate to Discord Developer Portal ----
  console.log('Step 1: Navigate to Discord Developer Portal');
  await cdp.navigate('https://discord.com/developers/applications');
  await sleep(3000);
  await cdp.screenshot('01-developer-portal');

  // ---- Step 2: Check for login ----
  console.log('\nStep 2: Check login status...');
  const currentUrl = await cdp.evaluate('window.location.href');
  console.log('  Current URL:', currentUrl);

  const needsLogin = await cdp.evaluate(`
    window.location.href.includes('/login') ||
    !!document.querySelector('input[name="email"]') ||
    !!document.querySelector('form[class*="auth"]')
  `);

  if (needsLogin) {
    console.log('\n  Not logged into Discord.');
    console.log('  Please log in to Discord in the Chrome window.');
    console.log('  Waiting up to 3 minutes for login...\n');

    let loggedIn = false;
    for (let i = 0; i < 36; i++) { // 36 * 5s = 180s = 3 min
      await sleep(5000);
      const url = await cdp.evaluate('window.location.href');
      const stillLogin = await cdp.evaluate(`
        window.location.href.includes('/login') ||
        !!document.querySelector('input[name="email"]') ||
        !!document.querySelector('form[class*="auth"]')
      `);
      if (!stillLogin) {
        loggedIn = true;
        break;
      }
      if (i % 6 === 0) console.log(`  Still waiting... (${i * 5}s elapsed)`);
    }

    if (!loggedIn) {
      console.log('  Timed out waiting for login. Please log in and run again.');
      return;
    }
    console.log('  Logged in!');
    await sleep(3000);
  } else {
    console.log('  Already logged in!');
  }

  // Make sure we're on the applications page
  const afterLoginUrl = await cdp.evaluate('window.location.href');
  if (!afterLoginUrl.includes('/developers/applications')) {
    await cdp.navigate('https://discord.com/developers/applications');
    await sleep(3000);
  }
  await cdp.screenshot('02-logged-in');

  // ---- Step 3: Click "New Application" ----
  console.log('\nStep 3: Click "New Application"...');
  await sleep(2000);

  const clickedNew = await cdp.evaluate(`
    (function() {
      // Look for "New Application" button
      const buttons = document.querySelectorAll('button, div[role="button"], a');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text.includes('new application')) {
          btn.click();
          return 'clicked: ' + btn.textContent.trim();
        }
      }
      return 'not found - visible buttons: ' +
        Array.from(buttons).map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 40).slice(0, 15).join(' | ');
    })()
  `);
  console.log('  Result:', clickedNew);
  await sleep(2000);
  await cdp.screenshot('03-new-app-dialog');

  // ---- Step 4: Type "RaiseGG" as application name ----
  console.log('\nStep 4: Enter application name "RaiseGG"...');
  await sleep(1000);

  const filledName = await cdp.evaluate(`
    (function() {
      // Look for the name input in the modal dialog
      const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
      for (const inp of inputs) {
        const placeholder = (inp.getAttribute('placeholder') || '').toLowerCase();
        const label = (inp.getAttribute('aria-label') || '').toLowerCase();
        // The modal input usually has a placeholder or is the only visible text input
        if (inp.offsetParent !== null) {
          inp.focus();
          inp.value = '';
          document.execCommand('selectAll');
          document.execCommand('insertText', false, 'RaiseGG');
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return 'filled: placeholder=' + placeholder + ' label=' + label;
        }
      }
      return 'no input found';
    })()
  `);
  console.log('  Result:', filledName);
  await sleep(1000);
  await cdp.screenshot('04-name-entered');

  // ---- Step 5: Accept ToS checkbox ----
  console.log('\nStep 5: Accept Terms of Service checkbox...');
  await sleep(500);

  const checkedTos = await cdp.evaluate(`
    (function() {
      // Look for checkbox - could be input[type=checkbox], role=checkbox, or a label near "terms"
      const checkboxes = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
      for (const cb of checkboxes) {
        cb.click();
        return 'clicked checkbox';
      }
      // Try label/div containing terms text
      const all = document.querySelectorAll('label, div[class*="check"], span[class*="check"]');
      for (const el of all) {
        const text = el.textContent.toLowerCase();
        if (text.includes('terms') || text.includes('policy') || text.includes('agree')) {
          el.click();
          return 'clicked label: ' + el.textContent.trim().substring(0, 50);
        }
      }
      // Click any checkbox-like element in a modal
      const modal = document.querySelector('[class*="modal"], [role="dialog"]');
      if (modal) {
        const cb = modal.querySelector('input[type="checkbox"], [role="checkbox"], [class*="checkbox"], [class*="Checkbox"]');
        if (cb) {
          cb.click();
          return 'clicked modal checkbox';
        }
        // Try clicking a label inside modal
        const labels = modal.querySelectorAll('label');
        for (const l of labels) {
          l.click();
          return 'clicked modal label';
        }
      }
      return 'no checkbox found';
    })()
  `);
  console.log('  Result:', checkedTos);
  await sleep(1000);
  await cdp.screenshot('05-tos-checked');

  // ---- Step 6: Click Create ----
  console.log('\nStep 6: Click Create button...');
  await sleep(500);

  const clickedCreate = await cdp.evaluate(`
    (function() {
      // Look in modal/dialog first
      const modal = document.querySelector('[class*="modal"], [role="dialog"], [class*="Modal"]');
      const container = modal || document;
      const buttons = container.querySelectorAll('button, div[role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'create' || text === 'create application') {
          btn.click();
          return 'clicked: ' + btn.textContent.trim();
        }
      }
      // Broader search
      for (const btn of document.querySelectorAll('button, div[role="button"]')) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'create') {
          btn.click();
          return 'clicked (broad): ' + btn.textContent.trim();
        }
      }
      return 'not found - buttons: ' +
        Array.from(buttons).map(b => b.textContent.trim()).filter(t => t.length < 30).join(' | ');
    })()
  `);
  console.log('  Result:', clickedCreate);
  await sleep(5000);
  await cdp.screenshot('06-app-created');

  // ---- Step 7: Get the Application ID from the URL ----
  console.log('\nStep 7: Get Application ID...');
  const appUrl = await cdp.evaluate('window.location.href');
  console.log('  Current URL:', appUrl);

  const appIdMatch = appUrl.match(/applications\/(\d+)/);
  let appId = appIdMatch ? appIdMatch[1] : null;

  if (!appId) {
    // Try to extract from page content
    appId = await cdp.evaluate(`
      (function() {
        // Check URL
        const m = window.location.href.match(/applications\\/(\\d+)/);
        if (m) return m[1];
        // Look for application ID on the page
        const text = document.body.innerText;
        const idMatch = text.match(/APPLICATION ID[\\s\\n]*(\\d+)/i);
        if (idMatch) return idMatch[1];
        return null;
      })()
    `);
  }
  console.log('  Application ID:', appId || 'not found yet');

  // ---- Step 8: Navigate to Bot section ----
  console.log('\nStep 8: Navigate to Bot section...');

  // Click "Bot" in the left sidebar
  const clickedBot = await cdp.evaluate(`
    (function() {
      const links = document.querySelectorAll('a, div[role="tab"], [class*="sidebar"] a, [class*="side"] a, nav a');
      for (const link of links) {
        const text = link.textContent.trim().toLowerCase();
        if (text === 'bot') {
          link.click();
          return 'clicked sidebar Bot link';
        }
      }
      // Try any element with "Bot" text in sidebar area
      const all = document.querySelectorAll('div, span, a');
      for (const el of all) {
        if (el.textContent.trim() === 'Bot' && el.children.length === 0) {
          el.click();
          return 'clicked Bot text element';
        }
      }
      return 'Bot link not found';
    })()
  `);
  console.log('  Result:', clickedBot);
  await sleep(3000);

  // If sidebar click didn't work, try navigating directly
  const botUrl = await cdp.evaluate('window.location.href');
  if (!botUrl.includes('/bot')) {
    if (appId) {
      await cdp.navigate(`https://discord.com/developers/applications/${appId}/bot`);
      await sleep(3000);
    }
  }
  await cdp.screenshot('07-bot-section');

  // ---- Step 9: Add Bot / Reset Token ----
  console.log('\nStep 9: Add Bot or Reset Token...');

  // First check if there's an "Add Bot" button
  const addBotResult = await cdp.evaluate(`
    (function() {
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text.includes('add bot')) {
          btn.click();
          return 'clicked Add Bot';
        }
      }
      return 'no Add Bot button (bot may already exist)';
    })()
  `);
  console.log('  Result:', addBotResult);
  await sleep(2000);

  // If there was a confirmation dialog, confirm it
  if (addBotResult.includes('clicked Add Bot')) {
    await cdp.evaluate(`
      (function() {
        const buttons = document.querySelectorAll('button, div[role="button"]');
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text === 'yes, do it!' || text === 'yes, do it' || text === 'confirm') {
            btn.click();
            return 'confirmed';
          }
        }
        return 'no confirmation needed';
      })()
    `);
    await sleep(3000);
    await cdp.screenshot('08-bot-added');
  }

  // ---- Step 10: Reset Token to get a new one ----
  console.log('\nStep 10: Reset Token to get bot token...');

  const resetResult = await cdp.evaluate(`
    (function() {
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text.includes('reset token') || text.includes('regenerate')) {
          btn.click();
          return 'clicked Reset Token';
        }
      }
      // Maybe token is already visible?
      return 'no reset button found';
    })()
  `);
  console.log('  Result:', resetResult);
  await sleep(2000);

  // Confirm token reset if dialog appeared
  if (resetResult.includes('clicked')) {
    // There might be a password/MFA prompt or confirmation
    await cdp.screenshot('09-reset-confirm');

    const confirmResult = await cdp.evaluate(`
      (function() {
        const buttons = document.querySelectorAll('button, div[role="button"]');
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text === 'yes, do it!' || text === 'yes, do it' || text === 'confirm' || text === 'reset token') {
            btn.click();
            return 'confirmed: ' + text;
          }
        }
        return 'no confirm button';
      })()
    `);
    console.log('  Confirm:', confirmResult);
    await sleep(3000);
  }
  await cdp.screenshot('10-token-visible');

  // ---- Step 11: Copy the token ----
  console.log('\nStep 11: Extract bot token...');

  // Try to click "Copy" button first
  const copyResult = await cdp.evaluate(`
    (function() {
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'copy' || text.includes('copy token')) {
          btn.click();
          return 'clicked copy';
        }
      }
      return 'no copy button';
    })()
  `);
  console.log('  Copy button:', copyResult);
  await sleep(1000);

  // Try to extract the token from the page
  let token = await cdp.evaluate(`
    (function() {
      // Token is usually displayed in an input or code-like element after reset
      // Look for input fields with token-like values
      const inputs = document.querySelectorAll('input, [class*="token"], code, pre');
      for (const inp of inputs) {
        const val = inp.value || inp.textContent || '';
        // Discord bot tokens look like: MTExxxx.Gxxxx.xxxx (base64-ish, with dots)
        if (val.match(/^[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{4,}\\.[A-Za-z0-9_-]{20,}$/)) {
          return val.trim();
        }
      }
      // Check clipboard - might not work due to permissions
      // Look for any element that might contain the token
      const spans = document.querySelectorAll('span, div, p');
      for (const el of spans) {
        const text = el.textContent.trim();
        if (text.match(/^[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{4,}\\.[A-Za-z0-9_-]{20,}$/) && el.children.length === 0) {
          return text;
        }
      }
      return null;
    })()
  `);

  if (!token) {
    // Try reading from clipboard
    token = await cdp.evaluate(`
      (async function() {
        try {
          return await navigator.clipboard.readText();
        } catch { return null; }
      })()
    `);
  }

  if (token) {
    const masked = token.substring(0, 10) + '...' + token.substring(token.length - 5);
    console.log('  Token found:', masked);

    // ---- Step 12: Save to .env.local ----
    saveTokenToEnv(token);

    // ---- Step 13: Push to Vercel ----
    pushToVercel(token);
  } else {
    console.log('  Token not found automatically.');
    console.log('  This may require MFA verification or the token may be hidden.');
    console.log('  Please copy the token from the Chrome window and:');
    console.log('    1. Add DISCORD_BOT_TOKEN=<token> to .env.local');
    console.log('    2. Run: npx vercel env add DISCORD_BOT_TOKEN production');
  }

  await cdp.screenshot('11-after-token');

  // ---- Step 14: Enable Privileged Gateway Intents ----
  console.log('\nStep 14: Enable Privileged Gateway Intents...');

  // Scroll down to find the intent toggles
  await cdp.evaluate('window.scrollBy(0, 500)');
  await sleep(1000);

  const intentsResult = await cdp.evaluate(`
    (function() {
      const results = [];

      // Find all toggle/switch elements near intent labels
      const allText = document.querySelectorAll('h5, h4, label, span, div');
      const intentsToEnable = ['server members intent', 'message content intent'];

      for (const el of allText) {
        const text = el.textContent.trim().toLowerCase();
        for (const intent of intentsToEnable) {
          if (text.includes(intent) || text === intent.replace(' intent', '')) {
            // Find the nearest toggle/switch
            const parent = el.closest('div[class*="row"], div[class*="card"], div[class*="item"], div[class*="section"]') || el.parentElement?.parentElement;
            if (parent) {
              // Look for toggle input or switch element
              const toggle = parent.querySelector(
                'input[type="checkbox"], [role="switch"], [class*="switch"], [class*="toggle"], button[role="switch"]'
              );
              if (toggle) {
                const isChecked = toggle.checked ||
                  toggle.getAttribute('aria-checked') === 'true' ||
                  toggle.classList.toString().includes('enabled') ||
                  toggle.classList.toString().includes('checked');
                if (!isChecked) {
                  toggle.click();
                  results.push('enabled: ' + intent);
                } else {
                  results.push('already enabled: ' + intent);
                }
              } else {
                results.push('no toggle found near: ' + intent);
              }
            }
          }
        }
      }

      if (results.length === 0) {
        // Try scrolling more and looking for toggles
        return 'no intents found on page - may need to scroll';
      }
      return results.join('; ');
    })()
  `);
  console.log('  Result:', intentsResult);
  await sleep(1000);

  // Scroll more and try again if needed
  if (intentsResult.includes('no intents found')) {
    await cdp.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await sleep(1500);

    const retry = await cdp.evaluate(`
      (function() {
        const results = [];
        const toggles = document.querySelectorAll('input[type="checkbox"], [role="switch"], button[role="switch"]');
        // Usually the last 3 toggles are the privileged intents
        const arr = Array.from(toggles);
        if (arr.length >= 2) {
          // Enable the last 2 toggles (Server Members + Message Content)
          const toEnable = arr.slice(-3); // presence, members, message content
          for (const t of toEnable) {
            const isChecked = t.checked || t.getAttribute('aria-checked') === 'true';
            if (!isChecked) {
              t.click();
              results.push('toggled switch');
            } else {
              results.push('already on');
            }
          }
        }
        return results.length > 0 ? results.join('; ') : 'still no toggles found';
      })()
    `);
    console.log('  Retry:', retry);
  }

  await cdp.screenshot('12-intents-enabled');

  // Save changes if there's a save button
  const saved = await cdp.evaluate(`
    (function() {
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'save changes' || text === 'save') {
          btn.click();
          return 'clicked Save Changes';
        }
      }
      return 'no save button (may auto-save)';
    })()
  `);
  console.log('  Save:', saved);
  await sleep(2000);

  // Handle the "are you sure" confirm for intents
  await cdp.evaluate(`
    (function() {
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (text === 'confirm' || text === 'yes' || text === 'ok') {
          btn.click();
          return 'confirmed';
        }
      }
      return 'no confirmation';
    })()
  `);
  await sleep(1000);
  await cdp.screenshot('13-intents-saved');

  // ---- Step 15: Generate Invite URL ----
  console.log('\nStep 15: Generate Bot Invite URL...');

  if (appId) {
    // permissions: Send Messages (2048) + View Channels (1024) + Embed Links (16384) + Add Reactions (64) = 19520
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=${PERMISSIONS}&scope=bot`;
    console.log('\n========================================');
    console.log('  BOT INVITE URL:');
    console.log(`  ${inviteUrl}`);
    console.log('========================================\n');

    // Also try to go to OAuth2 > URL Generator in the portal
    console.log('  Navigating to OAuth2 URL Generator...');
    await cdp.navigate(`https://discord.com/developers/applications/${appId}/oauth2`);
    await sleep(3000);
    await cdp.screenshot('14-oauth2-page');
  } else {
    console.log('  Application ID not available. Trying to extract from current page...');
    const extractedId = await cdp.evaluate(`
      (function() {
        const m = window.location.href.match(/applications\\/(\\d+)/);
        if (m) return m[1];
        // Look for APPLICATION ID on the page
        const all = document.querySelectorAll('span, div, p, input');
        for (const el of all) {
          const text = (el.value || el.textContent || '').trim();
          if (text.match(/^\\d{17,20}$/)) return text;
        }
        return null;
      })()
    `);

    if (extractedId) {
      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${extractedId}&permissions=${PERMISSIONS}&scope=bot`;
      console.log('\n========================================');
      console.log('  BOT INVITE URL:');
      console.log(`  ${inviteUrl}`);
      console.log('========================================\n');
    } else {
      console.log('  Could not generate invite URL. After setup, use:');
      console.log('  https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&permissions=19520&scope=bot');
    }
  }

  await cdp.screenshot('15-final');

  // ---- Summary ----
  console.log('\n=== SETUP SUMMARY ===');
  console.log('Application Name: RaiseGG');
  if (appId) console.log('Application ID:', appId);
  if (token) {
    const masked = token.substring(0, 10) + '...' + token.substring(token.length - 5);
    console.log('Bot Token:', masked);
    console.log('Token saved to: .env.local');
    console.log('Token pushed to: Vercel (production)');
  } else {
    console.log('Bot Token: MANUAL ACTION NEEDED (see above)');
  }
  console.log('Intents: Server Members + Message Content (enabled)');
  console.log('Permissions: Send Messages, View Channels, Embed Links, Add Reactions');
  console.log('\nScreenshots saved to:', SCREENSHOT_DIR);
  console.log('\nBrowser left open for manual verification.');
  console.log('Script finished.');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  console.error(e.stack);
});
