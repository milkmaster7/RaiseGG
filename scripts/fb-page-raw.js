/**
 * Creates a Facebook Page using raw CDP WebSocket (no puppeteer)
 * Works around FB's heavy React pages that cause puppeteer timeouts
 */

const http = require('http');
const crypto = require('crypto');

const PAGE_NAME = process.argv[2] || 'RaiseGG';
const PAGE_BIO = process.argv[3] || 'Competitive gaming for real stakes. 1v1 CS2, Dota 2 & Deadlock. Win USDC prizes. raisegg.gg';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function connectWS(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        Connection: 'Upgrade', Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': key
      }
    });
    req.on('upgrade', (res, socket) => {
      let msgId = 0;
      const pending = new Map();
      let buffer = Buffer.alloc(0);

      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 2) {
          const fin = buffer[0] & 0x80;
          const opcode = buffer[0] & 0x0f;
          let payloadLen = buffer[1] & 0x7f;
          let headerLen = 2;
          if (payloadLen === 126) {
            if (buffer.length < 4) return;
            payloadLen = buffer.readUInt16BE(2);
            headerLen = 4;
          } else if (payloadLen === 127) {
            if (buffer.length < 10) return;
            payloadLen = Number(buffer.readBigUInt64BE(2));
            headerLen = 10;
          }
          if (buffer.length < headerLen + payloadLen) return;
          const payload = buffer.slice(headerLen, headerLen + payloadLen);
          buffer = buffer.slice(headerLen + payloadLen);

          if (opcode === 1) {
            try {
              const msg = JSON.parse(payload.toString());
              if (msg.id && pending.has(msg.id)) {
                pending.get(msg.id)(msg);
                pending.delete(msg.id);
              }
            } catch(e) {}
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
          if (data.length < 126) {
            header = Buffer.alloc(6);
            header[0] = 0x81; header[1] = 0x80 | data.length;
            mask.copy(header, 2);
          } else if (data.length < 65536) {
            header = Buffer.alloc(8);
            header[0] = 0x81; header[1] = 0x80 | 126;
            header.writeUInt16BE(data.length, 2);
            mask.copy(header, 4);
          } else {
            header = Buffer.alloc(14);
            header[0] = 0x81; header[1] = 0x80 | 127;
            header.writeBigUInt64BE(BigInt(data.length), 2);
            mask.copy(header, 10);
          }
          const masked = Buffer.alloc(data.length);
          for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
          socket.write(Buffer.concat([header, masked]));
          setTimeout(() => { pending.delete(id); resolve(null); }, 15000);
        });
      }

      resolve({ send, close: () => socket.destroy() });
    });
    req.on('error', reject);
    req.end();
  });
}

async function evaluate(ws, code) {
  const r = await ws.send('Runtime.evaluate', { expression: code, returnByValue: true });
  return r?.result?.result?.value;
}

async function main() {
  // Find the FB creation page target
  const pages = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  let target = pages.find(p => p.url.includes('pages/creation') && p.type === 'page');

  if (!target) {
    // Navigate a blank/regular page to FB
    target = pages.find(p => p.type === 'page' && !p.url.includes('fbsbx') && !p.url.includes('static_resources'));
    if (!target) { console.log('No usable tab found'); return; }

    console.log('Navigating to FB page creation...');
    const ws = await connectWS(target.webSocketDebuggerUrl);
    await ws.send('Page.navigate', { url: 'https://www.facebook.com/pages/creation/' });
    console.log('Waiting for page load...');
    await sleep(12000);
    ws.close();

    // Re-fetch targets
    const newPages = await new Promise((resolve) => {
      http.get('http://localhost:9222/json', res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      });
    });
    target = newPages.find(p => p.url.includes('pages/creation') || p.url.includes('facebook.com'));
    if (!target) { console.log('Could not find FB page after navigation'); return; }
  }

  console.log('Connecting to:', target.url.substring(0, 60));
  const ws = await connectWS(target.webSocketDebuggerUrl);

  // Enable Runtime
  await ws.send('Runtime.enable', {});
  await sleep(1000);

  // Check form state
  console.log('Checking form...');
  const stateStr = await evaluate(ws, `
    JSON.stringify({
      url: location.href,
      nameValue: document.querySelector('input[type="text"]:not([aria-label*="Search"])')?.value || '',
      hasCat: !!document.querySelector('input[aria-label="Category (required)"]'),
      hasBio: !!document.querySelector('textarea'),
      text: document.body?.innerText?.substring(0, 150) || ''
    })
  `);

  if (!stateStr) {
    console.log('Could not evaluate - page may still be loading. Waiting...');
    await sleep(5000);
    const retry = await evaluate(ws, 'document.body?.innerText?.substring(0, 100)');
    console.log('Body:', retry);
    if (!retry || !retry.includes('Page name')) {
      console.log('Form not loaded. Try again later.');
      ws.close();
      return;
    }
  } else {
    const state = JSON.parse(stateStr);
    console.log('State:', JSON.stringify(state, null, 2));

    if (!state.hasCat) {
      console.log('Form not loaded');
      ws.close();
      return;
    }
  }

  // 1. Set name
  console.log(`\n1. Setting name: ${PAGE_NAME}`);
  const nameResult = await evaluate(ws, `
    (function() {
      var inp = document.querySelector('input[type="text"]:not([aria-label*="Search"])');
      if (!inp) return 'no input';
      inp.focus();
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '${PAGE_NAME}');
      inp.dispatchEvent(new Event('input', {bubbles: true}));
      inp.dispatchEvent(new Event('change', {bubbles: true}));
      return 'set: ' + inp.value;
    })()
  `);
  console.log('  >', nameResult);
  await sleep(1500);

  // 2. Set category - focus the input and use insertText
  console.log(`2. Setting category: Gaming`);
  await evaluate(ws, `document.querySelector('input[aria-label="Category (required)"]')?.focus()`);
  await sleep(300);
  await ws.send('Input.insertText', { text: 'Gaming' });
  await sleep(2500);

  // Select first dropdown
  await ws.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 40, key: 'ArrowDown', code: 'ArrowDown' });
  await ws.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 40, key: 'ArrowDown', code: 'ArrowDown' });
  await sleep(300);
  await ws.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await ws.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  console.log('  > category selected');
  await sleep(1500);

  // 3. Set bio
  console.log('3. Setting bio');
  const bioEscaped = PAGE_BIO.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const bioResult = await evaluate(ws, `
    (function() {
      var ta = document.querySelector('textarea');
      if (!ta) return 'no textarea';
      ta.focus();
      var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, '${bioEscaped}');
      ta.dispatchEvent(new Event('input', {bubbles: true}));
      ta.dispatchEvent(new Event('change', {bubbles: true}));
      return 'set: ' + ta.value.substring(0, 40) + '...';
    })()
  `);
  console.log('  >', bioResult);
  await sleep(1500);

  // Verify
  const verify = await evaluate(ws, `
    JSON.stringify({
      name: document.querySelector('input[type="text"]:not([aria-label*="Search"])')?.value,
      bio: document.querySelector('textarea')?.value?.substring(0, 40)
    })
  `);
  console.log('\nVerification:', verify);

  // 4. Click Create Page
  console.log('\n4. Clicking Create Page...');
  const clickResult = await evaluate(ws, `
    (function() {
      var btns = document.querySelectorAll('[role="button"]');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent.trim() === 'Create Page') {
          btns[i].click();
          return 'clicked';
        }
      }
      return 'button not found';
    })()
  `);
  console.log('  >', clickResult);

  // Wait for creation
  console.log('Waiting for page creation...');
  await sleep(15000);

  const finalUrl = await evaluate(ws, 'location.href');
  console.log('\nFinal URL:', finalUrl);

  const finalText = await evaluate(ws, 'document.body?.innerText?.substring(0, 200)');
  console.log('Content:', finalText?.substring(0, 150));

  if (finalUrl && !finalUrl.includes('pages/creation')) {
    console.log('\n✓ PAGE CREATED SUCCESSFULLY!');
  } else {
    const errors = await evaluate(ws, `
      document.body?.innerText?.split('\\n')?.filter(function(l) {
        return l.includes('error') || l.includes('Error') || l.includes("can't") || l.includes('required');
      })?.slice(0, 3)?.join(' | ') || 'none'
    `);
    console.log('Errors:', errors);
  }

  ws.close();
}

main().catch(e => console.error('Fatal:', e.message));
