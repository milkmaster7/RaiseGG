/**
 * Steam Group Creation for RaiseGG
 *
 * Launches Chrome on port 9225 with a temp profile,
 * navigates to Steam group creation page, handles login if needed,
 * fills group details, and submits.
 *
 * Uses CDP approach with ws module.
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9225;
const PROFILE_DIR = path.join(require('os').tmpdir(), 'rgg-steam-profile');

const GROUP_NAME = 'RaiseGG';
const GROUP_URL = 'RaiseGG';
const GROUP_HEADLINE = 'Competitive stake matches in CS2, Dota 2 & Deadlock';
const GROUP_SUMMARY = 'Official Steam group for RaiseGG \u2014 the competitive gaming platform with blockchain escrow. Play 1v1 matches for USDC, join free daily tournaments ($5 prize), and climb the city leaderboard. Anti-cheat servers, instant crypto payouts. raisegg.com';

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
      setTimeout(() => { pending.delete(id); reject(new Error('timeout')); }, 30000);
    });
  }

  async function navigate(url) {
    await send('Page.navigate', { url });
    await sleep(3000);
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    return result?.result?.result?.value;
  }

  async function screenshot(name) {
    try {
      const result = await send('Page.captureScreenshot', { format: 'png', quality: 80 });
      if (result?.result?.data) {
        const dir = path.join(__dirname, '..', 'screenshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(result.result.data, 'base64'));
        console.log(`  Screenshot: ${name}.png`);
      }
    } catch { }
  }

  return { send, navigate, evaluate, screenshot, ws };
}

async function main() {
  console.log('=== Steam Group Creation for RaiseGG ===\n');

  // Ensure ws module
  try {
    require('ws');
  } catch {
    console.log('Installing ws...');
    execSync('npm install ws', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  }

  // Launch Chrome
  console.log('Launching Chrome on port ' + DEBUG_PORT + '...');
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=' + PROFILE_DIR,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900',
    'https://steamcommunity.com/actions/GroupCreate',
  ], { detached: true, stdio: 'ignore' });
  chrome.unref();

  console.log('Waiting for Chrome to start...');
  await sleep(5000);

  // Connect
  let pages;
  for (let i = 0; i < 10; i++) {
    try {
      pages = await getPages();
      if (pages.length > 0) break;
    } catch { }
    await sleep(2000);
  }

  if (!pages || pages.length === 0) {
    console.log('ERROR: Could not connect to Chrome');
    return;
  }

  const page = pages.find(p => p.type === 'page' && p.url.includes('steam'));
  if (!page) {
    console.log('ERROR: No Steam tab found');
    console.log('Pages:', pages.map(p => p.url));
    return;
  }

  const cdp = await connectToPage(page.webSocketDebuggerUrl);
  console.log('Connected to Chrome!\n');

  await sleep(3000);
  await cdp.screenshot('steam-01-initial');

  // Check if we need to log in
  const currentUrl = await cdp.evaluate('window.location.href');
  console.log('Current URL:', currentUrl);

  const needsLogin = await cdp.evaluate(`
    window.location.href.includes('/login') ||
    !!document.querySelector('input[name="username"]') ||
    !!document.querySelector('#login_btn_signin') ||
    !!document.querySelector('[class*="newlogindialog"]')
  `);

  if (needsLogin || currentUrl.includes('/login')) {
    console.log('\nNot logged into Steam.');
    console.log('Please log into Steam in the Chrome window.');
    console.log('Waiting up to 3 minutes...\n');

    let loggedIn = false;
    for (let i = 0; i < 36; i++) {
      await sleep(5000);
      const url = await cdp.evaluate('window.location.href');
      const stillLogin = await cdp.evaluate(`
        window.location.href.includes('/login') ||
        !!document.querySelector('input[name="username"]') ||
        !!document.querySelector('#login_btn_signin') ||
        !!document.querySelector('[class*="newlogindialog"]')
      `);
      if (!stillLogin && !url.includes('/login')) {
        loggedIn = true;
        break;
      }
      if (i % 6 === 0) console.log(`  Still waiting... (${Math.round((i * 5) / 60)}m elapsed)`);
    }

    if (!loggedIn) {
      console.log('Timed out waiting for login. Please log in and run again.');
      return;
    }
    console.log('Logged in!\n');
    await cdp.screenshot('steam-02-logged-in');

    // Navigate to group creation
    console.log('Navigating to group creation page...');
    await cdp.navigate('https://steamcommunity.com/actions/GroupCreate');
    await sleep(3000);
  } else {
    console.log('Already logged into Steam!\n');
  }

  await cdp.screenshot('steam-03-create-page');

  // Fill in group name
  console.log('Filling in group details...');

  const filledName = await cdp.evaluate(`
    (function() {
      var inp = document.querySelector('#groupName') || document.querySelector('input[name="groupName"]');
      if (!inp) {
        // Try by label text
        var labels = document.querySelectorAll('label');
        for (var l of labels) {
          if (/group name/i.test(l.textContent)) {
            var target = document.getElementById(l.htmlFor) || l.querySelector('input');
            if (target) { inp = target; break; }
          }
        }
      }
      if (!inp) {
        // Try first text input
        var inputs = document.querySelectorAll('input[type="text"]');
        if (inputs.length > 0) inp = inputs[0];
      }
      if (!inp) return 'no group name input found';
      inp.focus();
      inp.value = ${JSON.stringify(GROUP_NAME)};
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return 'filled';
    })()
  `);
  console.log('  Group Name:', filledName);
  await sleep(500);

  // Fill in group URL / abbreviation
  const filledUrl = await cdp.evaluate(`
    (function() {
      var inp = document.querySelector('#groupURL') || document.querySelector('input[name="groupURL"]')
        || document.querySelector('#abbreviation') || document.querySelector('input[name="abbreviation"]');
      if (!inp) {
        var inputs = document.querySelectorAll('input[type="text"]');
        if (inputs.length >= 2) inp = inputs[1];
      }
      if (!inp) return 'no group URL input found';
      inp.focus();
      inp.value = ${JSON.stringify(GROUP_URL)};
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return 'filled';
    })()
  `);
  console.log('  Group URL:', filledUrl);
  await sleep(500);

  // Fill in headline
  const filledHeadline = await cdp.evaluate(`
    (function() {
      var inp = document.querySelector('#headline') || document.querySelector('input[name="headline"]');
      if (!inp) {
        var inputs = document.querySelectorAll('input[type="text"]');
        if (inputs.length >= 3) inp = inputs[2];
      }
      if (!inp) return 'no headline input found';
      inp.focus();
      inp.value = ${JSON.stringify(GROUP_HEADLINE)};
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return 'filled';
    })()
  `);
  console.log('  Headline:', filledHeadline);
  await sleep(500);

  // Fill in summary
  const filledSummary = await cdp.evaluate(`
    (function() {
      var ta = document.querySelector('#summary') || document.querySelector('textarea[name="summary"]');
      if (!ta) {
        var textareas = document.querySelectorAll('textarea');
        if (textareas.length > 0) ta = textareas[0];
      }
      if (!ta) return 'no summary textarea found';
      ta.focus();
      ta.value = ${JSON.stringify(GROUP_SUMMARY)};
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return 'filled';
    })()
  `);
  console.log('  Summary:', filledSummary);
  await sleep(500);

  // Set language to English
  const setLanguage = await cdp.evaluate(`
    (function() {
      var sel = document.querySelector('#language') || document.querySelector('select[name="language"]');
      if (!sel) {
        var selects = document.querySelectorAll('select');
        for (var s of selects) {
          for (var opt of s.options) {
            if (/english/i.test(opt.text)) { sel = s; break; }
          }
          if (sel) break;
        }
      }
      if (!sel) return 'no language select found';
      // Find English option
      for (var i = 0; i < sel.options.length; i++) {
        if (/english/i.test(sel.options[i].text)) {
          sel.selectedIndex = i;
          sel.value = sel.options[i].value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return 'set to English';
        }
      }
      return 'English option not found';
    })()
  `);
  console.log('  Language:', setLanguage);
  await sleep(500);

  // Set group type to Public
  const setPublic = await cdp.evaluate(`
    (function() {
      // Look for radio button or select for group type
      var radios = document.querySelectorAll('input[type="radio"]');
      for (var r of radios) {
        var label = r.parentElement ? r.parentElement.textContent : '';
        if (/public/i.test(label) || /public/i.test(r.value)) {
          r.checked = true;
          r.click();
          r.dispatchEvent(new Event('change', { bubbles: true }));
          return 'set public via radio';
        }
      }

      // Try select
      var selects = document.querySelectorAll('select');
      for (var s of selects) {
        for (var i = 0; i < s.options.length; i++) {
          if (/public/i.test(s.options[i].text)) {
            s.selectedIndex = i;
            s.value = s.options[i].value;
            s.dispatchEvent(new Event('change', { bubbles: true }));
            return 'set public via select';
          }
        }
      }

      // Look for type selector by name
      var typeSelect = document.querySelector('#type') || document.querySelector('select[name="type"]');
      if (typeSelect) {
        for (var i = 0; i < typeSelect.options.length; i++) {
          if (/public/i.test(typeSelect.options[i].text)) {
            typeSelect.selectedIndex = i;
            typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            return 'set public via type select';
          }
        }
      }

      return 'no group type control found (may default to public)';
    })()
  `);
  console.log('  Group Type:', setPublic);
  await sleep(1000);

  await cdp.screenshot('steam-04-filled-form');

  // Click Create Group
  console.log('\nLooking for Create button...');
  const clickedCreate = await cdp.evaluate(`
    (function() {
      // Look for submit button
      var btn = document.querySelector('input[type="submit"]');
      if (btn && /create/i.test(btn.value)) {
        btn.click();
        return 'clicked submit: ' + btn.value;
      }

      // Look for button with "create" text
      var buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn, .btn_green_steamui');
      for (var b of buttons) {
        var text = (b.value || b.textContent || '').trim();
        if (/create/i.test(text)) {
          b.click();
          return 'clicked: ' + text;
        }
      }

      // Try any clickable element with "create" text
      var all = document.querySelectorAll('a, div[onclick], span[onclick]');
      for (var el of all) {
        if (/create.*group|create/i.test(el.textContent.trim()) && el.textContent.trim().length < 30) {
          el.click();
          return 'clicked element: ' + el.textContent.trim();
        }
      }

      // Last resort: submit the form
      var form = document.querySelector('form');
      if (form) { form.submit(); return 'submitted form'; }

      return 'no create button found';
    })()
  `);
  console.log('  Result:', clickedCreate);

  await sleep(5000);
  await cdp.screenshot('steam-05-after-create');

  const finalUrl = await cdp.evaluate('window.location.href');
  console.log('\nFinal URL:', finalUrl);

  if (finalUrl.includes('/groups/') || finalUrl.includes('RaiseGG')) {
    console.log('\nGroup creation appears successful!');
  } else {
    console.log('\nCheck the Chrome window for the result.');
  }

  console.log('\nBrowser left open. Script finished.');
}

main().catch(e => console.error('Error:', e.message));
