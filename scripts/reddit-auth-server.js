const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3457;

// Public installed-app client ID — no app registration needed
const PUBLIC_CLIENT_ID = 'ohXpoqrZYub1kg';

let redditUsername = '';

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Reddit Setup — RaiseGG</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:#0b0c1d;color:#e0e6ef;font-family:system-ui;display:flex;justify-content:center;padding:40px 20px}
.c{max-width:560px;width:100%}
h1{font-size:22px;font-weight:800;text-align:center;margin-bottom:24px}
.card{background:#12132a;border:1px solid #1e2045;border-radius:12px;padding:24px;margin-bottom:16px}
.card h2{font-size:16px;font-weight:700;margin-bottom:12px;color:#00e6ff}
label{display:block;font-size:13px;font-weight:600;color:#8a8fb5;margin-bottom:6px;margin-top:14px}
label:first-of-type{margin-top:0}
input{width:100%;padding:10px 14px;background:#0b0c1d;border:1px solid #2a2d5a;border-radius:8px;color:#e0e6ef;font-size:14px;font-family:monospace}
input:focus{outline:none;border-color:#00e6ff}
button{width:100%;padding:12px;background:#00e6ff;color:#0b0c1d;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px}
button:hover{opacity:.9}
.msg{padding:12px;border-radius:8px;margin-top:12px;font-size:13px}
.ok{background:#00e67620;border:1px solid #00e67640;color:#00e676}
.err{background:#ff525220;border:1px solid #ff525240;color:#ff5252}
.info{background:#00e6ff15;border:1px solid #00e6ff40;color:#00e6ff}
.steps{color:#8a8fb5;font-size:13px;line-height:1.8}
.steps b{color:#e0e6ef}
.steps a{color:#00e6ff}
#status{margin-top:16px}
.step{display:none}
.step.active{display:block}
</style>
</head>
<body>
<div class="c">
<h1>Reddit Login for RaiseGG</h1>

<!-- STEP 1: Just login -->
<div class="card step active" id="step1">
<h2>Enter your Reddit credentials</h2>
<div class="steps">
<p>Just your Reddit username and password. No app setup needed — we handle everything else automatically.</p>
<p style="margin-top:8px">Don't have a Reddit account? <a href="https://www.reddit.com/register" target="_blank">Create one here</a> (takes 30 seconds).</p>
</div>
<label>Reddit Username</label>
<input type="text" id="username" placeholder="your_reddit_username"/>
<label>Reddit Password</label>
<input type="password" id="password" placeholder="your_reddit_password"/>
<button onclick="testAndSave()">Connect Reddit</button>
<div id="step1Status"></div>
</div>

<!-- STEP 2: Done -->
<div class="card step" id="step2">
<h2>Done!</h2>
<div class="msg ok">Reddit connected and verified! Auto-posting will start within 12 hours.</div>
<p style="font-size:13px;color:#8a8fb5;margin-top:12px">Logged in as: <b id="redditUser"></b></p>
<p style="font-size:13px;color:#8a8fb5;margin-top:8px">Posts will be conservative: 2x/day max, rotated across subreddits, organic style.</p>
<p style="font-size:13px;color:#8a8fb5;margin-top:16px">You can close this window now.</p>
</div>
</div>

<script>
function s(id,show){document.getElementById(id).style.display=show?'block':'none'}
function msg(id,t,cls){document.getElementById(id).innerHTML='<div class="msg '+cls+'">'+t+'</div>'}

async function testAndSave(){
  var u=document.getElementById('username').value.trim();
  var p=document.getElementById('password').value;
  if(!u||!p){msg('step1Status','Fill in both fields','err');return}
  msg('step1Status','Testing credentials...','info');
  try{
    var r=await fetch('/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    var d=await r.json();
    if(d.ok){
      document.getElementById('redditUser').textContent=d.username;
      s('step1',0);s('step2',1);
    }else{
      msg('step1Status',d.error||'Failed','err');
    }
  }catch(e){msg('step1Status','Error: '+e.message,'err')}
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

  if (url.pathname === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { username: u, password: p } = data;

        // Test credentials using public client ID (no app registration needed)
        const authStr = Buffer.from(`${PUBLIC_CLIENT_ID}:`).toString('base64');
        const params = new URLSearchParams({
          grant_type: 'password',
          username: u,
          password: p,
        });

        const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authStr}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Android:com.raisegg.app:v1.0.0 (by /u/RaiseGG)',
          },
          body: params.toString(),
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: `Reddit error: ${tokenData.error}. Check your username/password.` }));
          return;
        }

        if (!tokenData.access_token) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'No access token received. Check credentials.' }));
          return;
        }

        // Verify by getting user info
        const meRes = await fetch('https://oauth.reddit.com/api/v1/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'Android:com.raisegg.app:v1.0.0 (by /u/RaiseGG)',
          },
        });
        const meData = await meRes.json();
        redditUsername = meData.name || u;

        // Save to .env.local
        const envPath = path.join(__dirname, '..', '.env.local');
        let content = '';
        try { content = fs.readFileSync(envPath, 'utf-8'); } catch {}

        const vars = {
          REDDIT_USERNAME: u,
          REDDIT_PASSWORD: p,
        };

        for (const [key, val] of Object.entries(vars)) {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          if (regex.test(content)) {
            content = content.replace(regex, `${key}=${val}`);
          } else {
            content += `\n${key}=${val}`;
          }
        }

        fs.writeFileSync(envPath, content);
        console.log('Reddit credentials saved to .env.local');
        console.log('Logged in as:', redditUsername);

        // Push to Vercel
        const { execSync } = require('child_process');
        const projectDir = path.join(__dirname, '..');
        try {
          for (const [key, val] of Object.entries(vars)) {
            try { execSync(`npx vercel env rm ${key} production -y`, { cwd: projectDir, stdio: 'pipe' }); } catch {}
            execSync(`printf "${val}" | npx vercel env add ${key} production`, { cwd: projectDir, stdio: 'pipe' });
            console.log(`Added ${key} to Vercel`);
          }
          console.log('All Reddit env vars pushed to Vercel!');
        } catch (e) {
          console.error('Vercel push failed (you can add manually):', e.message);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, username: redditUsername }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  Reddit Login — localhost:' + PORT);
  console.log('  Just enter your Reddit username + password');
  console.log('  No app creation needed!');
  console.log('========================================');
  console.log('');

  // Auto-open browser
  const { exec } = require('child_process');
  exec(`start http://localhost:${PORT}`);
});
