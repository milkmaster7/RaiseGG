const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3458;

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Facebook Setup — RaiseGG</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:#0b0c1d;color:#e0e6ef;font-family:system-ui;display:flex;justify-content:center;padding:40px 20px}
.c{max-width:600px;width:100%}
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
.steps{color:#8a8fb5;font-size:13px;line-height:1.9}
.steps b{color:#e0e6ef}
.steps a{color:#00e6ff}
.steps code{background:#0b0c1d;padding:2px 6px;border-radius:4px;font-size:12px;color:#00e6ff}
ol{padding-left:20px}
ol li{margin-bottom:8px}
#status{margin-top:16px}
.step{display:none}
.step.active{display:block}
hr{border:none;border-top:1px solid #1e2045;margin:16px 0}
</style>
</head>
<body>
<div class="c">
<h1>Facebook Page Setup for RaiseGG</h1>

<!-- STEP 1: Instructions -->
<div class="card step active" id="step1">
<h2>Step 1: Create a Facebook Page</h2>
<div class="steps">
<p>If you already have a RaiseGG Facebook Page, skip to Step 2.</p>
<ol>
<li>Go to <a href="https://www.facebook.com/pages/create" target="_blank">facebook.com/pages/create</a></li>
<li>Choose <b>"Business or brand"</b></li>
<li>Name it <b>RaiseGG</b> (category: "Gaming")</li>
<li>Add a profile picture and cover photo</li>
</ol>
</div>
<hr/>
<h2>Step 2: Create a Facebook App</h2>
<div class="steps">
<ol>
<li>Go to <a href="https://developers.facebook.com/apps/create/" target="_blank">developers.facebook.com/apps/create</a></li>
<li>Choose <b>"Business"</b> type</li>
<li>Name the app <b>"RaiseGG Auto-Poster"</b></li>
<li>Once created, go to your app dashboard</li>
</ol>
</div>
<hr/>
<h2>Step 3: Get a Page Access Token</h2>
<div class="steps">
<ol>
<li>In the app dashboard, go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank">Graph API Explorer</a></li>
<li>Select your app from the dropdown</li>
<li>Click <b>"Generate Access Token"</b></li>
<li>Grant permissions: <code>pages_manage_posts</code>, <code>pages_read_engagement</code>, <code>pages_show_list</code></li>
<li>Select your RaiseGG page when prompted</li>
<li>Copy the <b>Page Access Token</b> (not User token!)</li>
<li><b>For a long-lived token:</b> Go to <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank">Access Token Debugger</a> → paste token → click "Extend Access Token"</li>
</ol>
</div>
<hr/>
<h2>Step 4: Find your Page ID</h2>
<div class="steps">
<ol>
<li>Go to your Facebook Page</li>
<li>Click <b>"About"</b> → scroll to <b>"Page transparency"</b></li>
<li>Your Page ID is the numeric ID shown there</li>
<li>Or use Graph API Explorer: <code>GET /me/accounts</code> — it lists all pages with their IDs</li>
</ol>
</div>
<button onclick="goToStep2()">I have my Page ID and Token →</button>
</div>

<!-- STEP 2: Enter credentials -->
<div class="card step" id="step2">
<h2>Enter Facebook Page Credentials</h2>
<label>Facebook Page ID (numeric)</label>
<input type="text" id="pageId" placeholder="123456789012345"/>
<label>Page Access Token</label>
<input type="text" id="pageToken" placeholder="EAAxxxxxxxxx..."/>
<button onclick="testAndSave()">Test & Save</button>
<div id="step2Status"></div>
</div>

<!-- STEP 3: Done -->
<div class="card step" id="step3">
<h2>Done!</h2>
<div class="msg ok">Facebook Page connected and verified! Auto-posting will start within 8 hours.</div>
<p style="font-size:13px;color:#8a8fb5;margin-top:12px">Page: <b id="pageName"></b></p>
<p style="font-size:13px;color:#8a8fb5;margin-top:8px">Posts will be 3x/day: 8:00, 14:00, 22:00 UTC</p>
<p style="font-size:13px;color:#8a8fb5;margin-top:4px">Templates rotate in EN, TR, and RU.</p>
<p style="font-size:13px;color:#8a8fb5;margin-top:16px">You can close this window now.</p>
</div>
</div>

<script>
function s(id,show){document.getElementById(id).classList[show?'add':'remove']('active')}
function msg(id,t,cls){document.getElementById(id).innerHTML='<div class="msg '+cls+'">'+t+'</div>'}

function goToStep2(){
  s('step1',0);s('step2',1);
}

async function testAndSave(){
  var pid=document.getElementById('pageId').value.trim();
  var tok=document.getElementById('pageToken').value.trim();
  if(!pid||!tok){msg('step2Status','Fill in both fields','err');return}
  if(!/^\\d+$/.test(pid)){msg('step2Status','Page ID should be numeric','err');return}
  msg('step2Status','Testing credentials with Facebook Graph API...','info');
  try{
    var r=await fetch('/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pageId:pid,pageToken:tok})});
    var d=await r.json();
    if(d.ok){
      document.getElementById('pageName').textContent=d.pageName||pid;
      s('step2',0);s('step3',1);
    }else{
      msg('step2Status',d.error||'Failed to verify','err');
    }
  }catch(e){msg('step2Status','Error: '+e.message,'err')}
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
        const { pageId, pageToken } = data;

        // Test credentials by calling Graph API
        const testUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=name,id,fan_count&access_token=${pageToken}`;
        const testRes = await fetch(testUrl);
        const testData = await testRes.json();

        if (testData.error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: false,
            error: `Facebook API error: ${testData.error.message} (code ${testData.error.code}). Check your Page ID and Token.`
          }));
          return;
        }

        if (!testData.id) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Could not verify page. Check your credentials.' }));
          return;
        }

        const pageName = testData.name || pageId;
        console.log(`Verified Facebook Page: ${pageName} (ID: ${testData.id}, fans: ${testData.fan_count || 0})`);

        // Also test posting permission by checking /me/accounts
        const permUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${pageToken}`;
        const permRes = await fetch(permUrl);
        const permData = await permRes.json();

        if (permData.error) {
          console.warn('Warning: Could not verify posting permissions. Posts may fail if token lacks pages_manage_posts scope.');
        }

        // Save to .env.local
        const envPath = path.join(__dirname, '..', '.env.local');
        let content = '';
        try { content = fs.readFileSync(envPath, 'utf-8'); } catch {}

        const vars = {
          FACEBOOK_PAGE_ID: pageId,
          FACEBOOK_PAGE_TOKEN: pageToken,
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
        console.log('Facebook credentials saved to .env.local');

        // Push to Vercel
        const { execSync } = require('child_process');
        const projectDir = path.join(__dirname, '..');
        try {
          for (const [key, val] of Object.entries(vars)) {
            try { execSync(`npx vercel env rm ${key} production -y`, { cwd: projectDir, stdio: 'pipe' }); } catch {}
            execSync(`printf "${val}" | npx vercel env add ${key} production`, { cwd: projectDir, stdio: 'pipe' });
            console.log(`Added ${key} to Vercel`);
          }
          console.log('All Facebook env vars pushed to Vercel!');
        } catch (e) {
          console.error('Vercel push failed (you can add manually):', e.message);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, pageName }));
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
  console.log('  Facebook Page Setup — localhost:' + PORT);
  console.log('  Follow the steps to connect your page');
  console.log('========================================');
  console.log('');

  // Auto-open browser
  const { exec } = require('child_process');
  exec(`start http://localhost:${PORT}`);
});
