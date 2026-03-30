/**
 * Quick check: is Discord logged in on the main Chrome?
 * Try discord.com/app which requires auth
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 9222;
const SHOTS = path.join(__dirname, '..', 'screenshots');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Get existing pages
  const pages = await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${PORT}/json`, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  console.log('Existing tabs:');
  pages.filter(p => p.type === 'page').forEach(p => console.log(' ', p.url.substring(0, 80)));

  // Find any Discord tab
  const discordTab = pages.find(p => p.url.includes('discord.com'));
  if (discordTab) {
    console.log('\nFound Discord tab:', discordTab.url);

    const ws = new WebSocket(discordTab.webSocketDebuggerUrl, { perMessageDeflate: false });
    let id = 1; const pending = new Map();
    ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
    await new Promise(r => ws.on('open', r));

    const ev = async expr => {
      const r = await new Promise((res, rej) => {
        const i = id++; pending.set(i, res);
        ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
        setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 10000);
      });
      return r?.result?.result?.value;
    };

    // Check if there's a token in localStorage
    const hasToken = await ev(`
      (function() {
        const token = localStorage.getItem('token');
        return token ? 'has token: ' + token.substring(0, 10) + '...' : 'no token';
      })()
    `);
    console.log('Token check:', hasToken);

    // Check current URL
    const url = await ev('window.location.href');
    console.log('Current URL:', url);

    ws.close();
  } else {
    console.log('\nNo Discord tab found. Trying to open Discord app...');

    // Create new tab
    const newTab = await new Promise((res, rej) => {
      const req = http.request(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }, r => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
      });
      req.on('error', rej);
      req.end();
    });

    const ws = new WebSocket(newTab.webSocketDebuggerUrl, { perMessageDeflate: false });
    let id = 1; const pending = new Map();
    ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
    await new Promise(r => ws.on('open', r));

    const send = (method, params = {}) => new Promise((res, rej) => {
      const i = id++; pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
      setTimeout(() => { pending.delete(i); rej(new Error('timeout')); }, 15000);
    });

    // Navigate to Discord app (will redirect to login if not authed)
    await send('Page.navigate', { url: 'https://discord.com/channels/@me' });
    await sleep(5000);

    const url = await (async () => {
      const r = await send('Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
      return r?.result?.result?.value;
    })();
    console.log('Discord app URL:', url);

    // Try screenshot
    try {
      const r = await send('Page.captureScreenshot', { format: 'png', quality: 70 });
      if (r?.result?.data) fs.writeFileSync(path.join(SHOTS, 'discord-check.png'), Buffer.from(r.result.data, 'base64'));
      console.log('Screenshot saved: discord-check.png');
    } catch {}

    ws.close();
  }
}

main().catch(e => console.error('Error:', e.message));
