const http = require('http');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

const API_ID = parseInt(process.env.TELEGRAM_API_ID || '22547312');
const API_HASH = process.env.TELEGRAM_API_HASH || '58209992510f1c2c2a7a7b2b909c3b98';
const PORT = 3456;

let client = null;
let codeResolve = null;
let passwordResolve = null;
let state = 'ready'; // ready, waiting_code, waiting_password, done, error
let sessionString = '';
let errorMsg = '';

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Telegram Login</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:#0b0c1d;color:#e0e6ef;font-family:system-ui;display:flex;justify-content:center;padding:40px 20px}
.c{max-width:460px;width:100%}
h1{font-size:22px;font-weight:800;text-align:center;margin-bottom:24px}
.card{background:#12132a;border:1px solid #1e2045;border-radius:12px;padding:24px;margin-bottom:16px}
label{display:block;font-size:13px;font-weight:600;color:#8a8fb5;margin-bottom:6px}
input{width:100%;padding:10px 14px;background:#0b0c1d;border:1px solid #2a2d5a;border-radius:8px;color:#e0e6ef;font-size:15px;font-family:monospace}
input:focus{outline:none;border-color:#00e6ff}
button{width:100%;padding:12px;background:#00e6ff;color:#0b0c1d;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px}
button:hover{opacity:.9}
.msg{padding:12px;border-radius:8px;margin-top:12px;font-size:13px}
.ok{background:#00e67620;border:1px solid #00e67640;color:#00e676}
.err{background:#ff525220;border:1px solid #ff525240;color:#ff5252}
.info{background:#00e6ff15;border:1px solid #00e6ff40;color:#00e6ff}
.session{word-break:break-all;background:#0b0c1d;border:1px solid #2a2d5a;border-radius:8px;padding:12px;font-family:monospace;font-size:10px;color:#8a8fb5;margin-top:12px;max-height:80px;overflow:auto}
.cpbtn{background:#1e2045;border:1px solid #2a2d5a;color:#00e6ff;font-size:12px;font-weight:600;padding:6px 16px;border-radius:6px;cursor:pointer;width:auto;margin-top:8px}
#status{margin-top:16px}
</style>
</head>
<body>
<div class="c">
<h1>Telegram Login</h1>
<div class="card" id="phoneCard">
<label>Your phone number (with country code)</label>
<input type="text" id="phone" placeholder="+66812345678" autofocus/>
<button onclick="sendCode()">Send Code</button>
</div>
<div class="card" id="codeCard" style="display:none">
<label>Code from Telegram</label>
<input type="text" id="code" placeholder="12345" autofocus/>
<button onclick="submitCode()">Verify</button>
</div>
<div class="card" id="pwCard" style="display:none">
<label>2FA Password</label>
<input type="password" id="pw" placeholder="your password" autofocus/>
<button onclick="submitPw()">Submit</button>
</div>
<div class="card" id="doneCard" style="display:none">
<div class="msg ok">Done! Session saved. You can close this window.</div>
<p style="font-size:13px;color:#8a8fb5;margin-top:12px">Session string (copy this to Vercel as TELEGRAM_SESSION):</p>
<div class="session" id="sess"></div>
<button class="cpbtn" onclick="navigator.clipboard.writeText(document.getElementById('sess').textContent);this.textContent='Copied!'">Copy</button>
</div>
<div id="status"></div>
</div>
<script>
function s(id,show){document.getElementById(id).style.display=show?'block':'none'}
function msg(t,cls){document.getElementById('status').innerHTML='<div class="msg '+cls+'">'+t+'</div>'}
// Always reset server state on page load
fetch('/reset').then(()=>{
  s('phoneCard',1);s('codeCard',0);s('pwCard',0);s('doneCard',0);
  document.getElementById('status').innerHTML='';
});
async function sendCode(){
  var p=document.getElementById('phone').value.trim();
  if(!p){msg('Enter phone number','err');return}
  msg('Connecting to Telegram...','info');
  var r=await fetch('/start?phone='+encodeURIComponent(p));
  var d=await r.json();
  if(d.state==='waiting_code'){s('phoneCard',0);s('codeCard',1);msg('Code sent! Check your Telegram app.','ok')}
  else if(d.state==='waiting_password'){s('phoneCard',0);s('pwCard',1);msg('Enter your 2FA password','info')}
  else if(d.error){msg(d.error,'err')}
}
async function submitCode(){
  var c=document.getElementById('code').value.trim();
  if(!c){msg('Enter the code','err');return}
  msg('Verifying...','info');
  var r=await fetch('/code?code='+encodeURIComponent(c));
  var d=await r.json();
  if(d.state==='waiting_password'){s('codeCard',0);s('pwCard',1);msg('Enter your 2FA password','info')}
  else if(d.state==='done'){s('codeCard',0);s('doneCard',1);document.getElementById('sess').textContent=d.session;msg('Success! Session saved.','ok')}
  else if(d.error){msg(d.error,'err')}
}
async function submitPw(){
  var p=document.getElementById('pw').value;
  if(!p){msg('Enter password','err');return}
  msg('Verifying...','info');
  var r=await fetch('/password?pw='+encodeURIComponent(p));
  var d=await r.json();
  if(d.state==='done'){s('pwCard',0);s('doneCard',1);document.getElementById('sess').textContent=d.session;msg('Success! Session saved.','ok')}
  else if(d.error){msg(d.error,'err')}
}
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (url.pathname === '/reset') {
    if (client) { try { client.disconnect(); } catch {} }
    client = null;
    codeResolve = null;
    passwordResolve = null;
    state = 'ready';
    sessionString = '';
    errorMsg = '';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === '/start') {
    const phone = url.searchParams.get('phone');
    try {
      if (client) { try { await client.disconnect(); } catch {} }
      client = new TelegramClient(new StringSession(''), API_ID, API_HASH, { connectionRetries: 3 });

      const authPromise = client.start({
        phoneNumber: async () => phone,
        phoneCode: async () => {
          state = 'waiting_code';
          return new Promise(resolve => { codeResolve = resolve; });
        },
        password: async () => {
          state = 'waiting_password';
          return new Promise(resolve => { passwordResolve = resolve; });
        },
        onError: (err) => { state = 'error'; errorMsg = String(err); },
      });

      authPromise.then(() => {
        state = 'done';
        sessionString = client.session.save();
        // Save to .env.local
        const envPath = path.join(__dirname, '..', '.env.local');
        try {
          let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
          if (!content.includes('TELEGRAM_SESSION=')) {
            fs.appendFileSync(envPath, '\\nTELEGRAM_SESSION=' + sessionString + '\\n');
          } else {
            content = content.replace(/TELEGRAM_SESSION=.*/, 'TELEGRAM_SESSION=' + sessionString);
            fs.writeFileSync(envPath, content);
          }
          console.log('Session saved to .env.local');
        } catch (e) { console.error('Could not save to .env.local:', e); }
      }).catch(err => { state = 'error'; errorMsg = String(err); });

      // Wait for state to change
      await new Promise(r => setTimeout(r, 8000));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ state, error: errorMsg || undefined }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ state: 'error', error: String(err) }));
    }
    return;
  }

  if (url.pathname === '/code') {
    const code = url.searchParams.get('code');
    if (codeResolve) { codeResolve(code); codeResolve = null; }
    await new Promise(r => setTimeout(r, 5000));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ state, session: state === 'done' ? sessionString : undefined, error: errorMsg || undefined }));
    return;
  }

  if (url.pathname === '/password') {
    const pw = url.searchParams.get('pw');
    if (passwordResolve) { passwordResolve(pw); passwordResolve = null; }
    await new Promise(r => setTimeout(r, 5000));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ state, session: state === 'done' ? sessionString : undefined, error: errorMsg || undefined }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  Auth server running on localhost:' + PORT);
  console.log('  Browser should open automatically');
  console.log('========================================');
  console.log('');
});
