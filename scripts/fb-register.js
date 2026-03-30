/**
 * Registers a new Facebook account, verifies via Gmail, then creates a Page.
 * Uses raw CDP WebSocket to handle FB's heavy React pages.
 *
 * Usage: node scripts/fb-register.js <email> <email-password> <page-name>
 */

const http = require('http');
const crypto = require('crypto');

const EMAIL = process.argv[2];
const EMAIL_PASS = process.argv[3];
const PAGE_NAME = process.argv[4] || 'RaiseGG';

if (!EMAIL || !EMAIL_PASS) {
  console.log('Usage: node scripts/fb-register.js <email> <email-password> <page-name>');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Raw CDP WebSocket ──────────────────────────────────────────────────

function connectWS(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': key }
    });
    req.on('upgrade', (res, socket) => {
      let msgId = 0;
      const pending = new Map();
      let buffer = Buffer.alloc(0);

      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 2) {
          const opcode = buffer[0] & 0x0f;
          let payloadLen = buffer[1] & 0x7f;
          let headerLen = 2;
          if (payloadLen === 126) { if (buffer.length < 4) return; payloadLen = buffer.readUInt16BE(2); headerLen = 4; }
          else if (payloadLen === 127) { if (buffer.length < 10) return; payloadLen = Number(buffer.readBigUInt64BE(2)); headerLen = 10; }
          if (buffer.length < headerLen + payloadLen) return;
          const payload = buffer.slice(headerLen, headerLen + payloadLen);
          buffer = buffer.slice(headerLen + payloadLen);
          if (opcode === 1) {
            try { const msg = JSON.parse(payload.toString()); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } } catch(e) {}
          }
        }
      });

      function send(method, params) {
        return new Promise((resolve) => {
          const id = ++msgId;
          pending.set(id, resolve);
          const msg = JSON.stringify({ id, method, params });
          const data = Buffer.from(msg);
          const mask = crypto.randomBytes(4);
          let header;
          if (data.length < 126) { header = Buffer.alloc(6); header[0] = 0x81; header[1] = 0x80 | data.length; mask.copy(header, 2); }
          else if (data.length < 65536) { header = Buffer.alloc(8); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(data.length, 2); mask.copy(header, 4); }
          else { header = Buffer.alloc(14); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(data.length), 2); mask.copy(header, 10); }
          const masked = Buffer.alloc(data.length);
          for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
          socket.write(Buffer.concat([header, masked]));
          setTimeout(() => { pending.delete(id); resolve(null); }, 20000);
        });
      }

      resolve({ send, close: () => socket.destroy() });
    });
    req.on('error', reject);
    req.end();
  });
}

async function evaluate(ws, code) {
  const r = await ws.send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: false });
  return r?.result?.result?.value;
}

async function navigateAndWait(ws, url, waitMs = 10000) {
  await ws.send('Page.navigate', { url });
  await sleep(waitMs);
}

async function typeText(ws, text) {
  for (const char of text) {
    await ws.send('Input.dispatchKeyEvent', { type: 'char', text: char });
    await sleep(30 + Math.random() * 50);
  }
}

async function pressKey(ws, key, code, vk) {
  await ws.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk });
  await ws.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
}

async function pressTab(ws) { await pressKey(ws, 'Tab', 'Tab', 9); }
async function pressEnter(ws) { await pressKey(ws, 'Enter', 'Enter', 13); }

// ─── Get target page ────────────────────────────────────────────────────

async function getPageTarget() {
  const pages = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
  // Find a regular page tab
  return pages.find(p => p.type === 'page' && !p.url.includes('fbsbx') && !p.url.includes('static_resources') && !p.url.includes('webworker'));
}

// ─── Step 1: Register on Facebook ───────────────────────────────────────

async function registerFacebook(ws) {
  console.log('\n═══ STEP 1: Register Facebook Account ═══');

  // Go to FB registration page
  console.log('Navigating to Facebook signup...');
  await navigateAndWait(ws, 'https://www.facebook.com/r.php', 10000);

  const url = await evaluate(ws, 'location.href');
  console.log('URL:', url);

  // Check if we're on signup page
  const hasSignup = await evaluate(ws, `
    !!(document.querySelector('input[name="firstname"]') || document.querySelector('input[name="reg_email__"]'))
  `);

  if (!hasSignup) {
    // We might be logged into Tommy's account - need to log out first
    console.log('Not on signup page. Logging out first...');
    await navigateAndWait(ws, 'https://www.facebook.com/logout.php', 5000);

    // Click logout confirmation if needed
    await evaluate(ws, `
      (function() {
        var btns = document.querySelectorAll('button, [role="button"]');
        for (var b of btns) { if (b.textContent.includes('Log Out') || b.textContent.includes('Log out')) { b.click(); return 'clicked'; } }
        // Try form submit
        var form = document.querySelector('form'); if (form) { form.submit(); return 'form submitted'; }
        return 'no button';
      })()
    `);
    await sleep(5000);

    // Navigate to signup
    await navigateAndWait(ws, 'https://www.facebook.com/r.php', 10000);
  }

  // Check page state
  const formState = await evaluate(ws, `
    JSON.stringify({
      hasFirstName: !!document.querySelector('input[name="firstname"]'),
      hasLastName: !!document.querySelector('input[name="lastname"]'),
      hasEmail: !!document.querySelector('input[name="reg_email__"]'),
      hasPassword: !!document.querySelector('input[name="reg_passwd__"]'),
      bodySnippet: document.body?.innerText?.substring(0, 200)
    })
  `);
  console.log('Form:', formState);

  if (!formState) {
    console.log('Could not access form. Page may still be loading...');
    await sleep(5000);
  }

  const state = JSON.parse(formState || '{}');
  if (!state.hasFirstName) {
    console.log('Signup form not found. Body:', state?.bodySnippet?.substring(0, 100));
    return false;
  }

  // Generate a name from the email
  const emailUser = EMAIL.split('@')[0];
  const firstName = emailUser.charAt(0).toUpperCase() + emailUser.slice(1, 6);
  const lastName = 'Gaming';

  // Fill first name
  console.log('Filling registration form...');
  await evaluate(ws, `document.querySelector('input[name="firstname"]').focus()`);
  await sleep(200);
  await typeText(ws, firstName);
  console.log('  First name:', firstName);
  await sleep(500);

  // Tab to last name
  await pressTab(ws);
  await sleep(200);
  await typeText(ws, lastName);
  console.log('  Last name:', lastName);
  await sleep(500);

  // Fill email - click directly
  await evaluate(ws, `document.querySelector('input[name="reg_email__"]')?.focus()`);
  await sleep(200);
  await typeText(ws, EMAIL);
  console.log('  Email:', EMAIL);
  await sleep(500);

  // Re-enter email (if field exists)
  await pressTab(ws);
  await sleep(500);
  const hasReenter = await evaluate(ws, `!!document.querySelector('input[name="reg_email_confirmation__"]')`);
  if (hasReenter) {
    await evaluate(ws, `document.querySelector('input[name="reg_email_confirmation__"]')?.focus()`);
    await sleep(200);
    await typeText(ws, EMAIL);
    console.log('  Email confirmed');
    await sleep(500);
  }

  // Fill password - generate a strong one
  const fbPassword = 'Rg' + crypto.randomBytes(6).toString('hex') + '!1';
  await evaluate(ws, `document.querySelector('input[name="reg_passwd__"]')?.focus()`);
  await sleep(200);
  await typeText(ws, fbPassword);
  console.log('  Password: set (saved below)');
  await sleep(500);

  // Birthday - set to a valid age (25 years old)
  console.log('Setting birthday...');
  await evaluate(ws, `
    (function() {
      // Month
      var month = document.querySelector('select[name="birthday_month"]');
      if (month) { month.value = '6'; month.dispatchEvent(new Event('change', {bubbles:true})); }
      // Day
      var day = document.querySelector('select[name="birthday_day"]');
      if (day) { day.value = '15'; day.dispatchEvent(new Event('change', {bubbles:true})); }
      // Year
      var year = document.querySelector('select[name="birthday_year"]');
      if (year) { year.value = '2001'; year.dispatchEvent(new Event('change', {bubbles:true})); }
      return 'set';
    })()
  `);
  await sleep(500);

  // Gender - select Custom or Male
  console.log('Setting gender...');
  await evaluate(ws, `
    (function() {
      // Radio buttons for gender: 1=Female, 2=Male, -1=Custom
      var male = document.querySelector('input[name="sex"][value="2"]');
      if (male) { male.click(); return 'male'; }
      return 'not found';
    })()
  `);
  await sleep(500);

  // Click Sign Up
  console.log('Clicking Sign Up...');
  await evaluate(ws, `
    (function() {
      var btns = document.querySelectorAll('button[name="websubmit"], button[type="submit"]');
      for (var b of btns) { if (b.textContent.includes('Sign Up') || b.textContent.includes('sign up')) { b.click(); return 'clicked'; } }
      // Fallback
      var submit = document.querySelector('button[name="websubmit"]');
      if (submit) { submit.click(); return 'clicked submit'; }
      return 'not found';
    })()
  `);

  console.log('Waiting for registration...');
  await sleep(15000);

  const afterUrl = await evaluate(ws, 'location.href');
  console.log('After signup URL:', afterUrl);

  const afterText = await evaluate(ws, 'document.body?.innerText?.substring(0, 300)');
  console.log('Page text:', afterText?.substring(0, 200));

  // Save the FB password
  console.log('\n  ═══ CREDENTIALS ═══');
  console.log('  FB Email:', EMAIL);
  console.log('  FB Password:', fbPassword);

  // Check if we need email verification
  if (afterText?.includes('code') || afterText?.includes('confirm') || afterText?.includes('verify')) {
    console.log('\n  → Email verification required. Getting code from Gmail...');
    return { needsVerification: true, fbPassword };
  }

  return { needsVerification: false, fbPassword };
}

// ─── Step 2: Get verification code from Gmail ───────────────────────────

async function getGmailCode(ws) {
  console.log('\n═══ STEP 2: Get Verification Code from Gmail ═══');

  // Open Gmail in a new tab... actually we can't easily do new tabs with raw CDP
  // Navigate the same tab to Gmail
  await navigateAndWait(ws, 'https://accounts.google.com/signin/v2/identifier?service=mail', 12000);

  const gmailUrl = await evaluate(ws, 'location.href');
  console.log('Gmail URL:', gmailUrl);

  // Check if we need to log in
  const needsLogin = await evaluate(ws, `
    !!(document.querySelector('input[type="email"]') || document.querySelector('#identifierId'))
  `);

  if (needsLogin) {
    console.log('Logging into Gmail...');

    // Enter email
    await evaluate(ws, `
      var input = document.querySelector('input[type="email"]') || document.querySelector('#identifierId');
      if (input) { input.focus(); input.click(); }
    `);
    await sleep(300);
    await typeText(ws, EMAIL);
    await sleep(500);

    // Click Next
    await evaluate(ws, `
      (function() {
        var btns = document.querySelectorAll('button, [role="button"]');
        for (var b of btns) { if (b.textContent.includes('Next') || b.textContent.includes('next')) { b.click(); return; } }
        document.querySelector('#identifierNext')?.click();
      })()
    `);
    await sleep(5000);

    // Enter password
    const hasPasswordField = await evaluate(ws, `!!document.querySelector('input[type="password"]')`);
    if (hasPasswordField) {
      await evaluate(ws, `document.querySelector('input[type="password"]')?.focus()`);
      await sleep(300);
      await typeText(ws, EMAIL_PASS);
      await sleep(500);

      // Click Next
      await evaluate(ws, `
        (function() {
          var btns = document.querySelectorAll('button, [role="button"]');
          for (var b of btns) { if (b.textContent.includes('Next') || b.textContent.includes('next')) { b.click(); return; } }
          document.querySelector('#passwordNext')?.click();
        })()
      `);
      await sleep(8000);
    }

    console.log('Gmail URL after login:', await evaluate(ws, 'location.href'));
  }

  // Navigate to Gmail inbox
  await navigateAndWait(ws, 'https://mail.google.com/mail/u/0/#inbox', 8000);
  await sleep(3000);

  // Look for Facebook email
  console.log('Looking for Facebook verification email...');
  const fbEmail = await evaluate(ws, `
    (function() {
      var emails = document.querySelectorAll('tr.zA');
      for (var e of emails) {
        var text = e.innerText || '';
        if (text.includes('Facebook') || text.includes('FB') || text.includes('confirmation code')) {
          e.click();
          return 'clicked: ' + text.substring(0, 80);
        }
      }
      return 'no FB email found. Inbox count: ' + emails.length;
    })()
  `);
  console.log('Email search:', fbEmail);

  await sleep(5000);

  // Extract the code from the email body
  const code = await evaluate(ws, `
    (function() {
      var body = document.body?.innerText || '';
      // Look for 5-6 digit code
      var match = body.match(/\\b(\\d{5,8})\\b/);
      if (match) return match[1];
      // Look for "code is XXXXX" pattern
      match = body.match(/code[:\\s]+?(\\d{4,8})/i);
      if (match) return match[1];
      return 'no code found in: ' + body.substring(0, 200);
    })()
  `);
  console.log('Verification code:', code);

  return code;
}

// ─── Step 3: Enter verification code on Facebook ────────────────────────

async function verifyFacebook(ws, code) {
  console.log('\n═══ STEP 3: Verify Facebook Account ═══');

  // Navigate back to Facebook
  await navigateAndWait(ws, 'https://www.facebook.com/', 10000);

  const fbUrl = await evaluate(ws, 'location.href');
  console.log('FB URL:', fbUrl);

  // Check if there's a code input
  const hasCodeInput = await evaluate(ws, `
    !!(document.querySelector('input[name="code"]') || document.querySelector('#code_in_cliff'))
  `);

  if (hasCodeInput) {
    console.log('Entering verification code:', code);
    await evaluate(ws, `
      var input = document.querySelector('input[name="code"]') || document.querySelector('#code_in_cliff');
      if (input) { input.focus(); }
    `);
    await sleep(300);
    await typeText(ws, code);
    await sleep(500);

    // Submit
    await evaluate(ws, `
      (function() {
        var btns = document.querySelectorAll('button[type="submit"], button');
        for (var b of btns) { if (b.textContent.includes('Confirm') || b.textContent.includes('Continue') || b.textContent.includes('Submit')) { b.click(); return; } }
      })()
    `);
    await sleep(8000);
  } else {
    console.log('No code input found - may already be verified or need different verification');
    const text = await evaluate(ws, 'document.body?.innerText?.substring(0, 300)');
    console.log('Page:', text?.substring(0, 200));
  }

  return true;
}

// ─── Step 4: Create Facebook Page ───────────────────────────────────────

async function createPage(ws) {
  console.log('\n═══ STEP 4: Create Facebook Page ═══');

  await navigateAndWait(ws, 'https://www.facebook.com/pages/creation/', 12000);

  const hasForm = await evaluate(ws, `!!document.querySelector('input[type="text"]')`);
  if (!hasForm) {
    console.log('Page creation form not loaded. Waiting...');
    await sleep(5000);
  }

  // Fill page name
  console.log('Filling page:', PAGE_NAME);
  await evaluate(ws, `
    (function() {
      var inp = document.querySelector('input[type="text"]:not([aria-label*="Search"])');
      if (!inp) return;
      inp.focus();
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '${PAGE_NAME}');
      inp.dispatchEvent(new Event('input', {bubbles: true}));
      inp.dispatchEvent(new Event('change', {bubbles: true}));
    })()
  `);
  await sleep(1500);

  // Fill category
  await evaluate(ws, `document.querySelector('input[aria-label="Category (required)"]')?.focus()`);
  await sleep(300);
  await ws.send('Input.insertText', { text: 'Gaming' });
  await sleep(2500);
  await pressKey(ws, 'ArrowDown', 'ArrowDown', 40);
  await sleep(300);
  await pressEnter(ws);
  console.log('Category: Gaming');
  await sleep(1500);

  // Fill bio
  const bio = 'Competitive esports matchmaking. Play CS2, Dota 2 & Deadlock competitively. City leaderboards & tournaments.';
  await evaluate(ws, `
    (function() {
      var ta = document.querySelector('textarea');
      if (!ta) return;
      ta.focus();
      var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, '${bio}');
      ta.dispatchEvent(new Event('input', {bubbles: true}));
      ta.dispatchEvent(new Event('change', {bubbles: true}));
    })()
  `);
  console.log('Bio: set');
  await sleep(1500);

  // Click Create Page
  console.log('Creating page...');
  await evaluate(ws, `
    (function() {
      var btns = document.querySelectorAll('[role="button"]');
      for (var b of btns) { if (b.textContent.trim() === 'Create Page') { b.click(); return; } }
    })()
  `);

  await sleep(15000);

  const finalUrl = await evaluate(ws, 'location.href');
  console.log('Result URL:', finalUrl);

  if (finalUrl && !finalUrl.includes('pages/creation')) {
    console.log('\n✓ PAGE CREATED SUCCESSFULLY!');
    return true;
  } else {
    const text = await evaluate(ws, 'document.body?.innerText?.substring(0, 300)');
    console.log('Still on creation page. Text:', text?.substring(0, 150));
    return false;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   Facebook Registration & Page Setup ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Email: ${EMAIL}`);
  console.log(`Page: ${PAGE_NAME}\n`);

  const target = await getPageTarget();
  if (!target) { console.log('No usable Chrome tab found'); return; }

  const ws = await connectWS(target.webSocketDebuggerUrl);
  await ws.send('Runtime.enable', {});
  await ws.send('Page.enable', {});

  // Step 1: Register
  const regResult = await registerFacebook(ws);
  if (!regResult) { console.log('Registration failed'); ws.close(); return; }

  // Step 2: Get verification code if needed
  if (regResult.needsVerification) {
    const code = await getGmailCode(ws);
    if (code && !code.includes('no code')) {
      await verifyFacebook(ws, code);
    } else {
      console.log('Could not get verification code. Check Gmail manually.');
    }
  }

  // Step 3: Create the page
  await createPage(ws);

  console.log('\n═══ SAVED CREDENTIALS ═══');
  console.log('FB Email:', EMAIL);
  console.log('FB Password:', regResult.fbPassword);

  ws.close();
}

main().catch(e => console.error('Fatal:', e.message));
