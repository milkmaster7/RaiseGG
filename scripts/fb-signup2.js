/**
 * FB signup - v2 with correct selectors for React combobox/option elements
 * Usage: node scripts/fb-signup2.js <tab-id> <email> <email-password>
 */
const http = require('http'), crypto = require('crypto');
const TAB_ID = process.argv[2];
const EMAIL = process.argv[3];
const EMAIL_PASS = process.argv[4];
if (!TAB_ID || !EMAIL || !EMAIL_PASS) { console.log('Usage: node fb-signup2.js <tab-id> <email> <email-pass>'); process.exit(1); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function connectWS(u) {
  return new Promise((res, rej) => {
    const url = new URL(u), key = crypto.randomBytes(16).toString('base64');
    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname,
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': key } });
    req.on('upgrade', (r, socket) => {
      let mid = 0; const pend = new Map(); let buf = Buffer.alloc(0);
      socket.on('data', c => {
        buf = Buffer.concat([buf, c]);
        while (buf.length >= 2) {
          let pl = buf[1] & 0x7f, hl = 2;
          if (pl === 126) { if (buf.length < 4) return; pl = buf.readUInt16BE(2); hl = 4; }
          else if (pl === 127) { if (buf.length < 10) return; pl = Number(buf.readBigUInt64BE(2)); hl = 10; }
          if (buf.length < hl + pl) return;
          const pay = buf.slice(hl, hl + pl); buf = buf.slice(hl + pl);
          try { const m = JSON.parse(pay.toString()); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } } catch (e) { }
        }
      });
      function send(method, params) {
        return new Promise(resolve => {
          const id = ++mid; pend.set(id, resolve);
          const msg = JSON.stringify({ id, method, params }), data = Buffer.from(msg), mask = crypto.randomBytes(4);
          let h;
          if (data.length < 126) { h = Buffer.alloc(6); h[0] = 0x81; h[1] = 0x80 | data.length; mask.copy(h, 2); }
          else if (data.length < 65536) { h = Buffer.alloc(8); h[0] = 0x81; h[1] = 0x80 | 126; h.writeUInt16BE(data.length, 2); mask.copy(h, 4); }
          else { h = Buffer.alloc(14); h[0] = 0x81; h[1] = 0x80 | 127; h.writeBigUInt64BE(BigInt(data.length), 2); mask.copy(h, 10); }
          const masked = Buffer.alloc(data.length);
          for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
          socket.write(Buffer.concat([h, masked]));
          setTimeout(() => { pend.delete(id); resolve(null); }, 20000);
        });
      }
      res({ send, close: () => socket.destroy() });
    });
    req.on('error', rej); req.end();
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

async function main() {
  console.log('Connecting to tab:', TAB_ID);
  const ws = await connectWS(`ws://localhost:9222/devtools/page/${TAB_ID}`);
  await ws.send('Runtime.enable', {});

  const url = await ev(ws, 'location.href');
  console.log('URL:', url);

  // Parse name from email
  const parts = EMAIL.split('@')[0].split('.');
  const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'User';
  const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Gaming';

  // Clear and fill first name
  console.log('\n1. First name:', firstName);
  await ev(ws, `
    (function() {
      var inp = document.querySelectorAll('input[type="text"]')[0];
      inp.focus();
      inp.value = '';
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '${firstName}');
      inp.dispatchEvent(new Event('input', {bubbles: true}));
      inp.dispatchEvent(new Event('change', {bubbles: true}));
      return inp.value;
    })()
  `).then(v => console.log('  >', v));
  await sleep(500);

  // Fill surname (index 1)
  console.log('2. Surname:', lastName);
  await ev(ws, `
    (function() {
      var inp = document.querySelectorAll('input[type="text"]')[1];
      inp.focus();
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '${lastName}');
      inp.dispatchEvent(new Event('input', {bubbles: true}));
      inp.dispatchEvent(new Event('change', {bubbles: true}));
      return inp.value;
    })()
  `).then(v => console.log('  >', v));
  await sleep(500);

  // Fill email (index 2)
  console.log('3. Email:', EMAIL);
  await ev(ws, `
    (function() {
      var inp = document.querySelectorAll('input[type="text"]')[2];
      inp.focus();
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '${EMAIL}');
      inp.dispatchEvent(new Event('input', {bubbles: true}));
      inp.dispatchEvent(new Event('change', {bubbles: true}));
      return inp.value;
    })()
  `).then(v => console.log('  >', v));
  await sleep(500);

  // Fill password
  const fbPass = 'Rg' + crypto.randomBytes(5).toString('hex') + '!1';
  console.log('4. Password: set');
  await ev(ws, `
    (function() {
      var inp = document.querySelector('input[type="password"]');
      inp.focus();
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '${fbPass}');
      inp.dispatchEvent(new Event('input', {bubbles: true}));
      inp.dispatchEvent(new Event('change', {bubbles: true}));
      return 'ok';
    })()
  `);
  await sleep(500);

  // Birthday - click Day combobox, then click option "15"
  console.log('5. Birthday: Jun 15, 2001');

  // Day
  await ev(ws, `
    (function() {
      var combo = document.querySelector('[role="combobox"][aria-label="Day"]');
      if (combo) combo.click();
      return combo ? 'clicked day' : 'not found';
    })()
  `).then(v => console.log('  Day combo:', v));
  await sleep(800);

  await ev(ws, `
    (function() {
      var opts = document.querySelectorAll('[role="option"]');
      for (var o of opts) { if (o.textContent.trim() === '15') { o.click(); return 'clicked 15'; } }
      return 'not found';
    })()
  `).then(v => console.log('  Day:', v));
  await sleep(800);

  // Month
  await ev(ws, `
    (function() {
      var combo = document.querySelector('[role="combobox"][aria-label="Month"]');
      if (combo) combo.click();
      return combo ? 'clicked month' : 'not found';
    })()
  `).then(v => console.log('  Month combo:', v));
  await sleep(800);

  await ev(ws, `
    (function() {
      var opts = document.querySelectorAll('[role="option"]');
      for (var o of opts) { if (o.textContent.trim() === 'June') { o.click(); return 'clicked June'; } }
      return 'not found';
    })()
  `).then(v => console.log('  Month:', v));
  await sleep(800);

  // Year
  await ev(ws, `
    (function() {
      var combo = document.querySelector('[role="combobox"][aria-label="Year"]');
      if (combo) combo.click();
      return combo ? 'clicked year' : 'not found';
    })()
  `).then(v => console.log('  Year combo:', v));
  await sleep(800);

  await ev(ws, `
    (function() {
      var opts = document.querySelectorAll('[role="option"]');
      for (var o of opts) { if (o.textContent.trim() === '2001') { o.click(); return 'clicked 2001'; } }
      return 'not found';
    })()
  `).then(v => console.log('  Year:', v));
  await sleep(800);

  // Gender - click gender combobox, then Male
  console.log('6. Gender: Male');
  await ev(ws, `
    (function() {
      var combo = document.querySelector('[role="combobox"][aria-label="Select your gender"]');
      if (combo) combo.click();
      return combo ? 'clicked gender' : 'not found';
    })()
  `).then(v => console.log('  Gender combo:', v));
  await sleep(800);

  await ev(ws, `
    (function() {
      var opts = document.querySelectorAll('[role="option"]');
      for (var o of opts) { if (o.textContent.trim() === 'Male') { o.click(); return 'clicked Male'; } }
      return 'not found';
    })()
  `).then(v => console.log('  Gender:', v));
  await sleep(800);

  // Verify form
  console.log('\nVerifying...');
  const verify = await ev(ws, `
    JSON.stringify({
      first: document.querySelectorAll('input[type="text"]')[0]?.value,
      last: document.querySelectorAll('input[type="text"]')[1]?.value,
      email: document.querySelectorAll('input[type="text"]')[2]?.value,
      pw: document.querySelector('input[type="password"]')?.value?.length
    })
  `);
  console.log('Form:', verify);

  // Click Submit button
  console.log('\n7. Clicking Submit...');
  await ev(ws, `
    (function() {
      var btns = document.querySelectorAll('[role="button"]');
      for (var b of btns) {
        if (b.textContent.trim() === 'Submit') { b.click(); return 'clicked Submit'; }
      }
      return 'not found';
    })()
  `).then(v => console.log('  >', v));

  console.log('Waiting for registration (20s)...');
  await sleep(20000);

  const afterUrl = await ev(ws, 'location.href');
  console.log('\nAfter URL:', afterUrl);

  const afterBody = await ev(ws, 'document.body?.innerText?.substring(0, 500)');
  console.log('Body:', afterBody?.substring(0, 350));

  // Check if email verification needed
  if (afterBody && (afterBody.includes('code') || afterBody.includes('confirm') || afterBody.includes('verify') || afterBody.includes('Check'))) {
    console.log('\n→ EMAIL VERIFICATION NEEDED');
    console.log('Going to Gmail...');

    await ws.send('Page.enable', {});
    await ws.send('Page.navigate', { url: 'https://accounts.google.com/signin' });
    await sleep(10000);

    // Log into Gmail
    const gmailUrl = await ev(ws, 'location.href');
    console.log('Gmail:', gmailUrl);

    const needsLogin = await ev(ws, '!!document.querySelector("#identifierId")');
    if (needsLogin) {
      await ev(ws, 'document.querySelector("#identifierId").focus()');
      await sleep(200);
      await typeKeys(ws, EMAIL);
      await sleep(300);
      await ev(ws, 'document.querySelector("#identifierNext")?.click()');
      await sleep(5000);

      await ev(ws, 'document.querySelector("input[type=\\"password\\"]")?.focus()');
      await sleep(200);
      await typeKeys(ws, EMAIL_PASS);
      await sleep(300);
      await ev(ws, 'document.querySelector("#passwordNext")?.click()');
      await sleep(8000);
    }

    // Go to inbox
    await ws.send('Page.navigate', { url: 'https://mail.google.com/mail/u/0/#inbox' });
    await sleep(10000);

    // Find FB verification email
    console.log('Looking for FB email...');
    const found = await ev(ws, `
      (function() {
        var rows = document.querySelectorAll('tr.zA, tr.zE');
        for (var r of rows) {
          var text = r.innerText || '';
          if (text.includes('Facebook') || text.includes('FB-') || text.includes('confirmation code')) {
            r.click();
            return 'clicked: ' + text.substring(0, 60);
          }
        }
        return 'not found (' + rows.length + ' rows)';
      })()
    `);
    console.log('  >', found);
    await sleep(5000);

    // Extract code
    const code = await ev(ws, `
      (function() {
        var text = document.body.innerText;
        var m = text.match(/FB-(\\d+)/);
        if (m) return m[1];
        m = text.match(/\\b(\\d{5,8})\\b/);
        if (m) return m[1];
        m = text.match(/code[:\\s]+(\\d{4,8})/i);
        if (m) return m[1];
        return 'no code';
      })()
    `);
    console.log('Code:', code);

    if (code && code !== 'no code') {
      // Return to FB and enter code
      await ws.send('Page.navigate', { url: afterUrl || 'https://www.facebook.com/' });
      await sleep(10000);

      const codeEntered = await ev(ws, `
        (function() {
          var inputs = document.querySelectorAll('input');
          for (var inp of inputs) {
            if (inp.type === 'text' || inp.name === 'code') {
              inp.focus();
              var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
              setter.call(inp, '${code}');
              inp.dispatchEvent(new Event('input', {bubbles: true}));
              return 'entered';
            }
          }
          return 'no code input';
        })()
      `);
      console.log('Code entry:', codeEntered);

      if (codeEntered === 'entered') {
        await ev(ws, `
          (function() {
            var btns = document.querySelectorAll('button, [role="button"]');
            for (var b of btns) {
              var t = b.textContent.trim();
              if (t === 'Confirm' || t === 'Continue' || t === 'Submit') { b.click(); return t; }
            }
          })()
        `);
        await sleep(10000);
        console.log('After verify URL:', await ev(ws, 'location.href'));
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
