/**
 * Create esport.is Discord server — Step 1: Create guild via browser context
 * Then run setup separately
 */
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

async function getPageWs() {
  const res = await fetch('http://localhost:9222/json/list');
  const tabs = await res.json();
  const discord = tabs.find(t => t.type === 'page' && t.url.includes('discord.com'));
  return discord ? discord.webSocketDebuggerUrl : null;
}

async function send(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 100000);
  return new Promise((resolve, reject) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) { ws.removeListener('message', handler); resolve(msg.result); }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { ws.removeListener('message', handler); reject(new Error('timeout')); }, 30000);
  });
}

async function evaluate(ws, expression) {
  const result = await send(ws, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'eval error');
  return result.result.value;
}

async function run() {
  const wsUrl = await getPageWs();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));
  console.log('Connected');

  // Get token from localStorage
  const token = await evaluate(ws, `
    (() => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const t = iframe.contentWindow.localStorage.getItem('token');
      iframe.remove();
      return t ? t.replace(/"/g, '') : null;
    })()
  `);
  console.log('Token obtained');

  // Create guild using the browser's fetch (same origin, has cookies)
  // This is how it worked for RaiseGG
  const result = await evaluate(ws, `
    (async () => {
      try {
        const res = await fetch('/api/v9/guilds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: '${token}' },
          body: JSON.stringify({ name: 'esport.is — Live Esports Hub' })
        });
        const data = await res.json();
        return JSON.stringify({ status: res.status, data });
      } catch(e) {
        return JSON.stringify({ error: e.message });
      }
    })()
  `);

  const parsed = JSON.parse(result);
  console.log('Status:', parsed.status);

  if (parsed.data?.id) {
    console.log('✅ Guild created! ID:', parsed.data.id);
    fs.writeFileSync(path.join(__dirname, 'esportis-guild-id.txt'), parsed.data.id);
  } else {
    console.log('Response:', JSON.stringify(parsed.data || parsed.error).substring(0, 300));
  }

  ws.close();
}

run().catch(e => console.error('ERROR:', e.message));
