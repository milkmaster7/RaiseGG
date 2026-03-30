/**
 * Fills and submits the FB signup form on an already-loaded page.
 * Usage: node scripts/fb-signup.js <tab-id> <email> <email-password>
 */
const http = require('http');
const crypto = require('crypto');

const TAB_ID = process.argv[2] || '91AC487A5E3E8D6ACB5920BBDD46FD8C';
const EMAIL = process.argv[3] || 'triche.evan@gmail.com';
const EMAIL_PASS = process.argv[4] || '';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
      socket.on('data', chunk => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 2) {
          let pLen = buffer[1] & 0x7f, hLen = 2;
          if (pLen === 126) { if (buffer.length < 4) return; pLen = buffer.readUInt16BE(2); hLen = 4; }
          else if (pLen === 127) { if (buffer.length < 10) return; pLen = Number(buffer.readBigUInt64BE(2)); hLen = 10; }
          if (buffer.length < hLen + pLen) return;
          const payload = buffer.slice(hLen, hLen + pLen);
          buffer = buffer.slice(hLen + pLen);
          try {
            const m = JSON.parse(payload.toString());
            if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
          } catch(e) {}
        }
      });
      function send(method, params) {
        return new Promise(resolve => {
          const id = ++msgId;
          pending.set(id, resolve);
          const msg = JSON.stringify({ id, method, params });
          const data = Buffer.from(msg);
          const mask = crypto.randomBytes(4);
          let h;
          if (data.length < 126) {
            h = Buffer.alloc(6); h[0] = 0x81; h[1] = 0x80 | data.length; mask.copy(h, 2);
          } else if (data.length < 65536) {
            h = Buffer.alloc(8); h[0] = 0x81; h[1] = 0x80 | 126; h.writeUInt16BE(data.length, 2); mask.copy(h, 4);
          } else {
            h = Buffer.alloc(14); h[0] = 0x81; h[1] = 0x80 | 127; h.writeBigUInt64BE(BigInt(data.length), 2); mask.copy(h, 10);
          }
          const masked = Buffer.alloc(data.length);
          for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
          socket.write(Buffer.concat([h, masked]));
          setTimeout(() => { pending.delete(id); resolve(null); }, 20000);
        });
      }
      resolve({ send, close: () => socket.destroy() });
    });
    req.on('error', reject);
    req.end();
  });
}

async function ev(ws, code) {
  const r = await ws.send('Runtime.evaluate', { expression: code, returnByValue: true });
  return r?.result?.result?.value;
}

async function typeKeys(ws, text) {
  for (const ch of text) {
    await ws.send('Input.dispatchKeyEvent', { type: 'char', text: ch });
    await sleep(30 + Math.random() * 40);
  }
}

async function pressTab(ws) {
  await ws.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await ws.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
}

async function main() {
  const wsUrl = `ws://localhost:9222/devtools/page/${TAB_ID}`;
  console.log('Connecting to tab:', TAB_ID);

  const ws = await connectWS(wsUrl);
  await ws.send('Runtime.enable', {});

  // Check current state
  const url = await ev(ws, 'location.href');
  console.log('URL:', url);

  if (!url || !url.includes('facebook.com')) {
    console.log('Not on Facebook. Navigating...');
    await ws.send('Page.enable', {});
    await ws.send('Page.navigate', { url: 'https://www.facebook.com/r.php' });
    await sleep(12000);
  }

  // Get form info
  const formInfo = await ev(ws, `
    JSON.stringify({
      inputCount: document.querySelectorAll('input').length,
      selectCount: document.querySelectorAll('select').length,
      inputs: Array.from(document.querySelectorAll('input')).map(function(inp, i) {
        return { idx: i, type: inp.type, placeholder: inp.placeholder, name: inp.name };
      }),
      body: document.body.innerText.substring(0, 200)
    })
  `);
  console.log('Form:', formInfo);

  const form = JSON.parse(formInfo || '{}');

  // Extract name from email
  const emailParts = EMAIL.split('@')[0].split('.');
  const firstName = emailParts[0] ? emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1) : 'User';
  const lastName = emailParts[1] ? emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1) : 'Gaming';

  // Fill first name
  console.log('\n1. First name:', firstName);
  await ev(ws, 'document.querySelectorAll("input")[0].focus()');
  await sleep(300);
  await typeKeys(ws, firstName);
  await sleep(500);

  // Surname
  console.log('2. Surname:', lastName);
  await pressTab(ws);
  await sleep(300);
  await typeKeys(ws, lastName);
  await sleep(500);

  // Email
  console.log('3. Email:', EMAIL);
  await ev(ws, 'document.querySelectorAll("input")[2].focus()');
  await sleep(300);
  await typeKeys(ws, EMAIL);
  await sleep(500);

  // Password
  const fbPass = 'Rg' + crypto.randomBytes(5).toString('hex') + '!1';
  console.log('4. Password: set');
  await ev(ws, 'document.querySelector("input[type=\\"password\\"]").focus()');
  await sleep(300);
  await typeKeys(ws, fbPass);
  await sleep(500);

  // Birthday
  console.log('5. Birthday: Jun 15, 2001');
  await ev(ws, `
    (function() {
      var selects = document.querySelectorAll('select');
      for (var i = 0; i < selects.length; i++) {
        var s = selects[i];
        var opts = Array.from(s.options);
        // Day
        if (opts.length > 28 && opts.length < 35) {
          s.value = '15';
          s.dispatchEvent(new Event('change', {bubbles: true}));
        }
        // Month
        if (opts.length >= 12 && opts.length <= 14) {
          s.value = '6';
          s.dispatchEvent(new Event('change', {bubbles: true}));
        }
        // Year
        if (opts.length > 50) {
          s.value = '2001';
          s.dispatchEvent(new Event('change', {bubbles: true}));
        }
      }
      return 'done';
    })()
  `);
  await sleep(500);

  // Gender
  console.log('6. Gender: Male');
  await ev(ws, `
    (function() {
      var labels = document.querySelectorAll('label');
      for (var l of labels) {
        if (l.textContent.trim() === 'Male') { l.click(); return 'clicked Male label'; }
      }
      var radios = document.querySelectorAll('input[type="radio"]');
      for (var r of radios) {
        if (r.value === '2') { r.click(); return 'clicked radio 2'; }
      }
      return 'not found';
    })()
  `).then(v => console.log('  >', v));
  await sleep(500);

  // Verify
  console.log('\nVerifying form...');
  const verify = await ev(ws, `
    JSON.stringify({
      firstName: document.querySelectorAll('input')[0].value,
      surname: document.querySelectorAll('input')[1].value,
      email: document.querySelectorAll('input')[2].value,
      hasPassword: document.querySelector('input[type="password"]').value.length > 0
    })
  `);
  console.log('Values:', verify);

  // Click Sign Up
  console.log('\n7. Signing up...');
  const clicked = await ev(ws, `
    (function() {
      var btns = document.querySelectorAll('button');
      for (var b of btns) {
        var text = b.textContent.trim();
        if (text === 'Sign Up' || text === 'Register') {
          b.click();
          return 'clicked: ' + text;
        }
      }
      var submit = document.querySelector('button[type="submit"]');
      if (submit) { submit.click(); return 'clicked submit: ' + submit.textContent.trim(); }
      return 'not found. Buttons: ' + Array.from(btns).map(function(b) { return b.textContent.trim(); }).join(', ');
    })()
  `);
  console.log('  >', clicked);

  console.log('Waiting for registration...');
  await sleep(15000);

  const afterUrl = await ev(ws, 'location.href');
  console.log('\nAfter URL:', afterUrl);

  const afterBody = await ev(ws, 'document.body.innerText.substring(0, 400)');
  console.log('Body:', afterBody?.substring(0, 300));

  // Check if verification needed
  if (afterBody && (afterBody.includes('code') || afterBody.includes('confirm') || afterBody.includes('verify') || afterBody.includes('Check your email'))) {
    console.log('\n→ EMAIL VERIFICATION NEEDED');
    console.log('Switching to Gmail to get code...');

    // Navigate to Gmail
    await ws.send('Page.enable', {});
    await ws.send('Page.navigate', { url: 'https://accounts.google.com/signin/v2/identifier?service=mail&flowName=GlifWebSignIn' });
    await sleep(10000);

    const gmailUrl = await ev(ws, 'location.href');
    console.log('Gmail URL:', gmailUrl);

    // Check if need to log in
    const hasEmailInput = await ev(ws, '!!document.querySelector("#identifierId")');
    if (hasEmailInput) {
      console.log('Logging into Gmail...');
      await ev(ws, 'document.querySelector("#identifierId").focus()');
      await sleep(300);
      await typeKeys(ws, EMAIL);
      await sleep(500);

      // Click Next
      await ev(ws, 'document.querySelector("#identifierNext")?.click()');
      await sleep(5000);

      // Password
      const hasPwField = await ev(ws, '!!document.querySelector("input[type=\\"password\\"]")');
      if (hasPwField) {
        await ev(ws, 'document.querySelector("input[type=\\"password\\"]").focus()');
        await sleep(300);
        await typeKeys(ws, EMAIL_PASS);
        await sleep(500);
        await ev(ws, 'document.querySelector("#passwordNext")?.click()');
        await sleep(8000);
      }
    }

    // Go to inbox
    await ws.send('Page.navigate', { url: 'https://mail.google.com/mail/u/0/#inbox' });
    await sleep(8000);

    // Find FB email
    const fbEmailFound = await ev(ws, `
      (function() {
        var rows = document.querySelectorAll('tr');
        for (var r of rows) {
          if (r.innerText.includes('Facebook') || r.innerText.includes('confirmation')) {
            r.querySelector('td:nth-child(4)')?.click() || r.click();
            return 'found and clicked';
          }
        }
        return 'not found. Row count: ' + rows.length;
      })()
    `);
    console.log('FB email:', fbEmailFound);
    await sleep(5000);

    // Extract code
    const code = await ev(ws, `
      (function() {
        var text = document.body.innerText;
        var m = text.match(/\\b(\\d{5,8})\\b/);
        if (m) return m[1];
        m = text.match(/code[:\\s]+(\\d{4,8})/i);
        if (m) return m[1];
        return 'no code found';
      })()
    `);
    console.log('Code:', code);

    if (code && !code.includes('no code')) {
      // Go back to FB and enter code
      await ws.send('Page.navigate', { url: 'https://www.facebook.com/' });
      await sleep(10000);

      const hasCodeInput = await ev(ws, '!!document.querySelector("input[name=\\"code\\"]")');
      if (hasCodeInput) {
        await ev(ws, 'document.querySelector("input[name=\\"code\\"]").focus()');
        await sleep(300);
        await typeKeys(ws, code);
        await sleep(500);
        await ev(ws, `
          (function() {
            var btns = document.querySelectorAll('button');
            for (var b of btns) { if (b.textContent.includes('Confirm') || b.textContent.includes('Continue')) { b.click(); return; } }
          })()
        `);
        await sleep(8000);
        console.log('Code entered!');
      }
    }
  }

  console.log('\n══════════════════════════');
  console.log('FB Email:', EMAIL);
  console.log('FB Password:', fbPass);
  console.log('══════════════════════════');

  ws.close();
}

main().catch(e => console.error('Fatal:', e.message));
