/**
 * Logs into Gmail via CDP and extracts the Facebook verification code.
 * Usage: node scripts/gmail-get-code.js <tab-id> <email> <password>
 */
const http = require('http'), crypto = require('crypto');
const TAB_ID = process.argv[2];
const EMAIL = process.argv[3];
const PASS = process.argv[4];
if (!TAB_ID || !EMAIL || !PASS) { console.log('Usage: node gmail-get-code.js <tab-id> <email> <password>'); process.exit(1); }

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
          setTimeout(() => { pend.delete(id); resolve(null); }, 25000);
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

async function main() {
  console.log('Connecting to tab:', TAB_ID);
  const ws = await connectWS(`ws://localhost:9222/devtools/page/${TAB_ID}`);
  await ws.send('Runtime.enable', {});
  await ws.send('Page.enable', {});

  // Navigate to Gmail directly (not through accounts.google.com)
  console.log('Going to Gmail...');
  await ws.send('Page.navigate', { url: 'https://mail.google.com/' });
  await sleep(10000);

  let url = await ev(ws, 'location.href');
  console.log('URL:', url);

  // Check if we're on login page
  let body = await ev(ws, 'document.body?.innerText?.substring(0, 300)');
  console.log('Body:', body?.substring(0, 150));

  // Look for email field
  const hasEmail = await ev(ws, '!!document.querySelector("#identifierId") || !!document.querySelector("input[type=\\"email\\"]")');
  if (hasEmail) {
    console.log('\nEntering email...');
    // Click and type email
    await ev(ws, '(document.querySelector("#identifierId") || document.querySelector("input[type=\\"email\\"]")).focus()');
    await sleep(300);
    // Clear first
    await ws.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 }); // Ctrl+A
    await ws.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await sleep(100);
    await ws.send('Input.insertText', { text: EMAIL });
    await sleep(800);

    // Verify email was typed
    const emailVal = await ev(ws, '(document.querySelector("#identifierId") || document.querySelector("input[type=\\"email\\"]"))?.value');
    console.log('Email value:', emailVal);

    // Click Next
    console.log('Clicking Next...');
    await ev(ws, `
      (function() {
        // Try multiple selectors for Next button
        var btn = document.querySelector('#identifierNext');
        if (btn) { btn.click(); return 'identifierNext'; }
        var btns = document.querySelectorAll('button');
        for (var b of btns) { if (b.textContent.includes('Next')) { b.click(); return 'button Next'; } }
        var divBtns = document.querySelectorAll('[role="button"]');
        for (var b of divBtns) { if (b.textContent.includes('Next')) { b.click(); return 'div Next'; } }
        return 'not found';
      })()
    `).then(v => console.log('  >', v));

    await sleep(6000);

    // Check for CAPTCHA
    body = await ev(ws, 'document.body?.innerText?.substring(0, 300)');
    console.log('After Next body:', body?.substring(0, 150));

    if (body && body.includes('captcha')) {
      console.log('CAPTCHA detected! Cannot proceed automatically.');
      ws.close();
      return;
    }

    // Look for password field
    const hasPw = await ev(ws, '!!document.querySelector("input[type=\\"password\\"]")');
    console.log('Has password:', hasPw);

    if (hasPw) {
      console.log('Entering password...');
      await ev(ws, 'document.querySelector("input[type=\\"password\\"]").focus()');
      await sleep(300);
      await ws.send('Input.insertText', { text: PASS });
      await sleep(800);

      // Click Next
      console.log('Clicking password Next...');
      await ev(ws, `
        (function() {
          var btn = document.querySelector('#passwordNext');
          if (btn) { btn.click(); return 'passwordNext'; }
          var btns = document.querySelectorAll('button');
          for (var b of btns) { if (b.textContent.includes('Next')) { b.click(); return 'button Next'; } }
          return 'not found';
        })()
      `).then(v => console.log('  >', v));

      await sleep(10000);
    }
  }

  // Check where we ended up
  url = await ev(ws, 'location.href');
  console.log('\nCurrent URL:', url);
  body = await ev(ws, 'document.body?.innerText?.substring(0, 300)');
  console.log('Body:', body?.substring(0, 200));

  if (url && url.includes('mail.google.com')) {
    console.log('\n✓ LOGGED INTO GMAIL!');

    // Wait a moment for inbox to load
    await sleep(3000);

    // Search for Facebook email specifically
    console.log('Searching for Facebook email...');
    await ws.send('Page.navigate', { url: 'https://mail.google.com/mail/u/0/#search/from%3Afacebook' });
    await sleep(8000);

    // Try to find and click the email
    const searchResult = await ev(ws, `
      (function() {
        var body = document.body?.innerText || '';
        // Look for FB code pattern directly in page text
        var m = body.match(/FB-(\\d+)/);
        if (m) return 'CODE:' + m[1];
        m = body.match(/(\\d{5})/);

        // Try clicking an email row
        var spans = document.querySelectorAll('span');
        for (var s of spans) {
          var text = s.textContent || '';
          if (text.includes('Facebook') || text.includes('confirmation') || text.includes('code')) {
            if (s.closest('tr')) { s.closest('tr').click(); return 'clicked row: ' + text.substring(0, 50); }
          }
        }
        return 'nothing found. Body: ' + body.substring(0, 200);
      })()
    `);
    console.log('Search:', searchResult?.substring(0, 200));

    if (searchResult && searchResult.startsWith('CODE:')) {
      console.log('\n✓ FOUND CODE:', searchResult.replace('CODE:', ''));
    } else {
      // Wait and try again
      await sleep(5000);
      const code2 = await ev(ws, `
        (function() {
          var text = document.body?.innerText || '';
          var m = text.match(/FB-(\\d+)/);
          if (m) return m[1];
          m = text.match(/code is (\\d{5})/i);
          if (m) return m[1];
          m = text.match(/\\b(\\d{5})\\b/);
          if (m) return m[1];
          return 'no code. Preview: ' + text.substring(0, 300);
        })()
      `);
      console.log('Code attempt 2:', code2?.substring(0, 200));
    }
  } else {
    console.log('Gmail login failed or redirected elsewhere');
  }

  ws.close();
}

main().catch(e => console.error('Fatal:', e.message));
