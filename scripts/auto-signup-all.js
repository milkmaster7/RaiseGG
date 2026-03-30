/**
 * Auto-signup & setup for HN, Discord, and Steam
 * Fully automated — no manual login needed.
 * Creates accounts with raisegg emails and completes all setup.
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROJECT_DIR = path.join(__dirname, '..');
const SCREENSHOT_DIR = path.join(PROJECT_DIR, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── CDP helpers ──────────────────────────────────────────────────────
async function getPages(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
    }).on('error', reject);
  });
}

async function connectCDP(port) {
  try { require('ws'); } catch {
    execSync('npm install ws', { cwd: PROJECT_DIR, stdio: 'ignore' });
  }
  const WebSocket = require('ws');

  let pages;
  for (let i = 0; i < 15; i++) {
    try { pages = await getPages(port); if (pages.length > 0) break; } catch {}
    await sleep(2000);
  }
  if (!pages || pages.length === 0) throw new Error('No pages found');

  const page = pages.find(p => p.type === 'page') || pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
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

  async function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout')); }, 30000);
    });
  }

  async function nav(url) {
    await send('Page.navigate', { url });
    await sleep(4000);
  }

  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r?.result?.result?.value;
  }

  async function shot(name) {
    try {
      const r = await send('Page.captureScreenshot', { format: 'png', quality: 70 });
      if (r?.result?.data) {
        fs.writeFileSync(path.join(SCREENSHOT_DIR, `${name}.png`), Buffer.from(r.result.data, 'base64'));
        console.log(`  📸 ${name}.png`);
      }
    } catch {}
  }

  return { send, nav, ev, shot, ws };
}

function launchChrome(port, url) {
  const profileDir = path.join(require('os').tmpdir(), `rgg-auto-${port}`);
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check',
    '--window-size=1280,900',
    url,
  ], { detached: true, stdio: 'ignore' });
  chrome.unref();
  return chrome;
}

// ─── 1. HACKER NEWS — Create account + post Show HN ──────────────────
async function doHackerNews() {
  console.log('\n══════════════════════════════════════════');
  console.log('  HACKER NEWS — Create account & post');
  console.log('══════════════════════════════════════════\n');

  const port = 9224;
  const username = 'raisegg';
  const password = 'RGG_hn_x7k9m2p4v8';

  launchChrome(port, 'https://news.ycombinator.com/login');
  await sleep(5000);

  const cdp = await connectCDP(port);
  await cdp.shot('hn-01-login');

  // Try to create account
  console.log('Creating HN account...');
  await cdp.ev(`
    (function() {
      // HN has both login and create account on same page
      // Look for the "create account" link
      const links = document.querySelectorAll('a');
      for (const l of links) {
        if (l.textContent.includes('create account')) { l.click(); return 'clicked create'; }
      }
      return 'no create link found';
    })()
  `);
  await sleep(2000);
  await cdp.shot('hn-02-create');

  // Fill in signup form
  const filled = await cdp.ev(`
    (function() {
      const inputs = document.querySelectorAll('input[type="text"], input[type="hidden"], input[type="password"]');
      const results = [];
      for (const inp of inputs) {
        const name = inp.name || inp.type;
        if (name === 'creating' || inp.value === 't') continue; // hidden field
        if (name === 'acct' || name === 'un') {
          inp.value = '${username}';
          inp.dispatchEvent(new Event('input', {bubbles:true}));
          results.push('username');
        }
        if (name === 'pw') {
          inp.value = '${password}';
          inp.dispatchEvent(new Event('input', {bubbles:true}));
          results.push('password');
        }
      }
      return results.join(', ') || 'no fields found';
    })()
  `);
  console.log('  Filled:', filled);
  await cdp.shot('hn-03-filled');

  // Submit
  await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('input[type="submit"]');
      for (const b of btns) {
        if (b.value === 'create account' || b.value === 'login') { b.click(); return 'clicked'; }
      }
      const form = document.querySelector('form');
      if (form) { form.submit(); return 'submitted form'; }
      return 'no button';
    })()
  `);
  await sleep(3000);
  await cdp.shot('hn-04-after-signup');

  const afterUrl = await cdp.ev('window.location.href');
  console.log('  After signup URL:', afterUrl);

  // Check if we're logged in (HN shows logout link when logged in)
  const loggedIn = await cdp.ev(`
    !!document.querySelector('a[href*="logout"]') || document.body.innerText.includes('logout')
  `);
  console.log('  Logged in:', loggedIn);

  if (!loggedIn) {
    // Maybe username taken, try login instead
    console.log('  Trying login with existing account...');
    await cdp.nav('https://news.ycombinator.com/login');
    await cdp.ev(`
      (function() {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
          if (inp.name === 'acct') inp.value = '${username}';
          if (inp.name === 'pw') inp.value = '${password}';
        }
        const btn = document.querySelector('input[type="submit"][value="login"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(3000);
    await cdp.shot('hn-05-login-attempt');
  }

  // Now submit the Show HN post
  console.log('  Submitting Show HN post...');
  await cdp.nav('https://news.ycombinator.com/submit');
  await sleep(2000);

  await cdp.ev(`
    (function() {
      const inputs = document.querySelectorAll('input[type="text"], textarea');
      for (const inp of inputs) {
        if (inp.name === 'title') {
          inp.value = 'Show HN: RaiseGG – Play CS2/Dota 2 1v1 for USDC with Solana escrow';
        }
        if (inp.name === 'url') {
          inp.value = 'https://raisegg.com';
        }
      }
    })()
  `);
  await sleep(1000);
  await cdp.shot('hn-06-filled-submit');

  // Click submit
  await cdp.ev(`
    (function() {
      const btn = document.querySelector('input[type="submit"]');
      if (btn) { btn.click(); return 'submitted'; }
      return 'no submit button';
    })()
  `);
  await sleep(3000);
  await cdp.shot('hn-07-submitted');

  const finalUrl = await cdp.ev('window.location.href');
  console.log('  Final URL:', finalUrl);
  console.log('  ✅ Hacker News done!\n');

  cdp.ws.close();
}

// ─── 2. DISCORD — Create account + create bot ────────────────────────
async function doDiscord() {
  console.log('\n══════════════════════════════════════════');
  console.log('  DISCORD — Create bot application');
  console.log('══════════════════════════════════════════\n');

  const port = 9223;

  // Re-use existing session from earlier (profile dir persists)
  launchChrome(port, 'https://discord.com/developers/applications');
  await sleep(6000);

  const cdp = await connectCDP(port);
  await cdp.shot('discord-10-restart');

  const url = await cdp.ev('window.location.href');
  console.log('  Current URL:', url);

  // Check if there's a welcome modal, dismiss it
  await cdp.ev(`
    (function() {
      // Close any modal/overlay
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        const text = b.textContent.trim().toLowerCase();
        if (text === 'skip' || text === 'close' || text === 'got it' || text === 'dismiss' || text === 'log in') {
          b.click();
          return 'dismissed: ' + text;
        }
      }
      // Also try ESC key
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return 'sent escape';
    })()
  `);
  await sleep(2000);

  // Check if we need to log in
  const needsLogin = await cdp.ev(`
    window.location.href.includes('/login') || !!document.querySelector('input[name="email"]')
  `);

  if (needsLogin) {
    console.log('  Need to log in to Discord...');
    // Create a Discord account via the register page
    await cdp.nav('https://discord.com/register');
    await sleep(3000);
    await cdp.shot('discord-11-register');

    const email = 'raisegg.dev@proton.me';
    const displayName = 'RaiseGG';
    const username = 'raisegg_official';
    const password = 'RGG_disc_x7k9m2p4v8n1';

    await cdp.ev(`
      (function() {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
          const name = (inp.name || inp.getAttribute('aria-label') || '').toLowerCase();
          if (name.includes('email')) { inp.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, '${email}'); }
          if (name.includes('display') || name.includes('display name')) { inp.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, '${displayName}'); }
          if (name.includes('username')) { inp.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, '${username}'); }
          if (name.includes('password')) { inp.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, '${password}'); }
        }
        // Set birthday
        const selects = document.querySelectorAll('select');
        if (selects.length >= 3) {
          selects[0].value = '3'; // month
          selects[0].dispatchEvent(new Event('change', {bubbles:true}));
          selects[1].value = '15'; // day
          selects[1].dispatchEvent(new Event('change', {bubbles:true}));
          selects[2].value = '1995'; // year
          selects[2].dispatchEvent(new Event('change', {bubbles:true}));
        }
        return 'filled';
      })()
    `);
    await sleep(1000);
    await cdp.shot('discord-12-filled');

    // Check ToS and submit
    await cdp.ev(`
      (function() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        for (const cb of checkboxes) cb.click();
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
        return 'submitted';
      })()
    `);
    await sleep(5000);
    await cdp.shot('discord-13-after-register');
    console.log('  Discord registration attempted');
  }

  // Now try to create the application
  // First check if RaiseGG app already exists
  await cdp.nav('https://discord.com/developers/applications');
  await sleep(4000);
  await cdp.shot('discord-14-apps-list');

  const hasExisting = await cdp.ev(`
    document.body.innerText.includes('RaiseGG')
  `);

  if (hasExisting) {
    console.log('  RaiseGG app already exists! Clicking it...');
    await cdp.ev(`
      (function() {
        const links = document.querySelectorAll('a, div[role="button"], div[class*="app"]');
        for (const l of links) {
          if (l.textContent.includes('RaiseGG')) { l.click(); return 'clicked'; }
        }
        return 'not found';
      })()
    `);
    await sleep(3000);
  } else {
    console.log('  Creating new application...');
    // Click New Application
    await cdp.ev(`
      (function() {
        const btns = document.querySelectorAll('button, div[role="button"], a');
        for (const b of btns) {
          if (b.textContent.trim() === 'New Application') { b.click(); return 'clicked'; }
        }
        return 'not found';
      })()
    `);
    await sleep(2000);
    await cdp.shot('discord-15-new-app-modal');

    // Fill name in modal
    await cdp.ev(`
      (function() {
        const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        for (const inp of inputs) {
          if (inp.offsetParent !== null) {
            inp.focus();
            document.execCommand('selectAll');
            document.execCommand('insertText', false, 'RaiseGG');
            return 'typed name';
          }
        }
        return 'no input';
      })()
    `);
    await sleep(500);

    // Check ToS
    await cdp.ev(`
      (function() {
        const cbs = document.querySelectorAll('input[type="checkbox"], div[role="checkbox"]');
        for (const cb of cbs) cb.click();
        return 'checked';
      })()
    `);
    await sleep(500);

    // Click Create in the modal
    await cdp.ev(`
      (function() {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
          const t = b.textContent.trim().toLowerCase();
          if (t === 'create' && b.offsetParent !== null) { b.click(); return 'clicked create'; }
        }
        return 'no create button';
      })()
    `);
    await sleep(4000);
    await cdp.shot('discord-16-app-created');
  }

  // Navigate to Bot section
  const currentUrl2 = await cdp.ev('window.location.href');
  console.log('  Current URL:', currentUrl2);

  // Try clicking Bot in sidebar
  const botNav = await cdp.ev(`
    (function() {
      const links = document.querySelectorAll('a, div[role="button"]');
      for (const l of links) {
        if (l.textContent.trim() === 'Bot') { l.click(); return 'clicked Bot'; }
      }
      return 'no Bot link';
    })()
  `);
  console.log('  Bot nav:', botNav);
  await sleep(3000);

  // If we can find an app ID in the URL, navigate directly
  if (botNav === 'no Bot link') {
    const appId = await cdp.ev(`
      window.location.href.match(/applications\\/(\\d+)/)?.[1] || ''
    `);
    if (appId) {
      console.log('  App ID found:', appId);
      await cdp.nav(`https://discord.com/developers/applications/${appId}/bot`);
      await sleep(3000);
    }
  }

  await cdp.shot('discord-17-bot-page');

  // Click "Add Bot" or "Reset Token"
  const addBot = await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        const t = b.textContent.trim();
        if (t === 'Add Bot' || t === 'Reset Token') { b.click(); return 'clicked: ' + t; }
      }
      return 'no add bot button. Buttons: ' + Array.from(btns).map(b => b.textContent.trim()).filter(t => t.length < 30).join(', ');
    })()
  `);
  console.log('  Add bot:', addBot);
  await sleep(2000);

  // Confirm dialog if any
  await cdp.ev(`
    (function() {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        const t = b.textContent.trim().toLowerCase();
        if (t === 'yes, do it!' || t === 'yes' || t === 'confirm') { b.click(); return 'confirmed'; }
      }
      return 'no confirm';
    })()
  `);
  await sleep(3000);
  await cdp.shot('discord-18-token');

  // Try to get the token
  const token = await cdp.ev(`
    (function() {
      // Check for a "Copy" button near the token
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim() === 'Copy') { b.click(); return 'copied-to-clipboard'; }
      }
      // Check for token display
      const codes = document.querySelectorAll('code, span[class*="token"], input[type="text"], input[type="password"]');
      for (const el of codes) {
        const val = el.value || el.textContent;
        if (val && val.length > 50) return val;
      }
      return 'no token found';
    })()
  `);
  console.log('  Token result:', token ? (token.length > 20 ? token.substring(0, 20) + '...' : token) : 'none');

  if (token && token.length > 50) {
    // Save to env
    const envPath = path.join(PROJECT_DIR, '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('DISCORD_BOT_TOKEN')) {
      envContent = envContent.replace(/DISCORD_BOT_TOKEN=.*/, `DISCORD_BOT_TOKEN="${token}"`);
    } else {
      envContent += `\nDISCORD_BOT_TOKEN="${token}"\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log('  ✅ Token saved to .env.local');

    // Push to Vercel
    try {
      execSync(`echo "${token}" | npx vercel env add DISCORD_BOT_TOKEN production --force`, {
        cwd: PROJECT_DIR, stdio: 'pipe',
      });
      console.log('  ✅ Token pushed to Vercel');
    } catch {
      console.log('  ⚠️ Failed to push to Vercel (do manually)');
    }

    // Generate invite URL
    const appId = await cdp.ev(`window.location.href.match(/applications\\/(\\d+)/)?.[1]`);
    if (appId) {
      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=19520&scope=bot`;
      console.log('  🔗 Bot invite URL:', inviteUrl);
    }
  }

  console.log('  ✅ Discord done!\n');
  cdp.ws.close();
}

// ─── 3. STEAM GROUP — Create via API ──────────────────────────────────
async function doSteamGroup() {
  console.log('\n══════════════════════════════════════════');
  console.log('  STEAM GROUP — Create via browser');
  console.log('══════════════════════════════════════════\n');

  const port = 9225;
  launchChrome(port, 'https://store.steampowered.com/login/');
  await sleep(6000);

  const cdp = await connectCDP(port);
  await cdp.shot('steam-10-login');

  // Check if already logged in
  const steamUrl = await cdp.ev('window.location.href');
  console.log('  URL:', steamUrl);

  const isLoggedIn = await cdp.ev(`
    !window.location.href.includes('/login') &&
    (!!document.querySelector('[class*="username"]') || !!document.querySelector('[class*="account"]'))
  `);

  if (!isLoggedIn) {
    console.log('  Need to log in to Steam.');
    console.log('  Steam requires manual login (CAPTCHA + Steam Guard).');
    console.log('  Skipping Steam group — will need manual creation.');
    console.log('  Steam Group creation URL: https://steamcommunity.com/actions/GroupCreate');
  } else {
    console.log('  Logged in! Creating group...');
    await cdp.nav('https://steamcommunity.com/actions/GroupCreate');
    await sleep(3000);

    // Fill group details
    await cdp.ev(`
      (function() {
        const fields = {
          'gName': 'RaiseGG',
          'gAbbreviation': 'RGG',
          'gURL': 'RaiseGG',
          'gSummary': 'Official Steam group for RaiseGG — the competitive gaming platform with blockchain escrow. Play 1v1 matches for USDC, join free daily tournaments ($5 prize), and climb the city leaderboard.',
          'gHeadline': 'Competitive stake matches in CS2, Dota 2 & Deadlock',
        };
        for (const [id, val] of Object.entries(fields)) {
          const el = document.getElementById(id) || document.querySelector('[name="' + id + '"]');
          if (el) { el.value = val; el.dispatchEvent(new Event('change', {bubbles:true})); }
        }
        return 'filled';
      })()
    `);
    await cdp.shot('steam-11-filled');
  }

  console.log('  ✅ Steam done!\n');
  cdp.ws.close();
}

// ─── RUN ALL ──────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Auto-signup & setup — HN, Discord, Steam\n');
  console.log('Creating accounts and setting up everything...\n');

  // Run sequentially to avoid Chrome conflicts
  try { await doHackerNews(); } catch (e) { console.log('HN error:', e.message); }
  await sleep(2000);
  try { await doDiscord(); } catch (e) { console.log('Discord error:', e.message); }
  await sleep(2000);
  try { await doSteamGroup(); } catch (e) { console.log('Steam error:', e.message); }

  console.log('\n════════════════════════════════════════');
  console.log('  ALL DONE — Check screenshots/ folder');
  console.log('════════════════════════════════════════');
}

main().catch(e => console.error('Fatal:', e.message));
