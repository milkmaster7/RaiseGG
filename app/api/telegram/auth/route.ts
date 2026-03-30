// Telegram userbot authentication via web browser
// Step 1: GET /api/telegram/auth?key=CRON_SECRET — shows the auth page
// Step 2: User enters api_id, api_hash, phone number
// Step 3: Sends code, user enters it
// Step 4: Session saved to .env.local and returned for Vercel

import { NextResponse } from 'next/server'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import * as fs from 'fs'
import * as path from 'path'

// In-memory state for the auth flow
let pendingClient: TelegramClient | null = null
let pendingResolve: ((code: string) => void) | null = null
let pendingPasswordResolve: ((password: string) => void) | null = null
let authState = 'idle' as string
let authError = ''
let authSession = ''

export const maxDuration = 120

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key')
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentSession = process.env.TELEGRAM_SESSION
  const isConfigured = !!(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Telegram Auth — RaiseGG</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:#0b0c1d;color:#e0e6ef;font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;padding:40px 20px}
    .container{max-width:500px;width:100%}
    h1{font-size:24px;font-weight:800;margin-bottom:8px;text-align:center}
    .subtitle{color:#8a8fb5;font-size:14px;text-align:center;margin-bottom:32px}
    .card{background:#12132a;border:1px solid #1e2045;border-radius:12px;padding:24px;margin-bottom:20px}
    .card h2{font-size:16px;font-weight:700;margin-bottom:16px;color:#00e6ff}
    label{display:block;font-size:13px;font-weight:600;color:#8a8fb5;margin-bottom:6px;margin-top:14px}
    label:first-child{margin-top:0}
    input{width:100%;padding:10px 14px;background:#0b0c1d;border:1px solid #2a2d5a;border-radius:8px;color:#e0e6ef;font-size:14px;font-family:monospace}
    input:focus{outline:none;border-color:#00e6ff}
    button{width:100%;padding:12px;background:#00e6ff;color:#0b0c1d;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-top:16px;transition:opacity .2s}
    button:hover{opacity:.9}
    button:disabled{opacity:.4;cursor:not-allowed}
    .step{display:none}
    .step.active{display:block}
    .status{padding:12px 16px;border-radius:8px;margin-top:16px;font-size:13px}
    .status.ok{background:#00e67615;border:1px solid #00e67640;color:#00e676}
    .status.err{background:#ff525215;border:1px solid #ff525240;color:#ff5252}
    .status.info{background:#00e6ff15;border:1px solid #00e6ff40;color:#00e6ff}
    .instructions{color:#8a8fb5;font-size:13px;line-height:1.6}
    .instructions a{color:#00e6ff}
    .instructions ol{padding-left:20px}
    .session-box{word-break:break-all;background:#0b0c1d;border:1px solid #2a2d5a;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;color:#8a8fb5;margin-top:12px;max-height:100px;overflow:auto}
    .copy-btn{background:#1e2045;border:1px solid #2a2d5a;color:#00e6ff;font-size:11px;font-weight:600;padding:6px 14px;border-radius:6px;cursor:pointer;width:auto;margin-top:8px}
  </style>
</head>
<body>
  <div class="container">
    <h1>Telegram Userbot Auth</h1>
    <p class="subtitle">One-time setup — gives Claude full Telegram access</p>

    ${currentSession ? '<div class="status ok">Already authenticated! Session exists. Re-auth below to refresh.</div>' : ''}

    <!-- STEP 1: Get API credentials -->
    <div class="card step active" id="step1">
      <h2>Step 1: Telegram API Credentials</h2>
      <div class="instructions">
        <ol>
          <li>Open <a href="https://my.telegram.org" target="_blank">my.telegram.org</a> in this browser</li>
          <li>Log in with your phone number</li>
          <li>Click <b>"API Development Tools"</b></li>
          <li>Create an app (name: "RaiseGG", any description)</li>
          <li>Copy <b>api_id</b> and <b>api_hash</b> below</li>
        </ol>
      </div>
      <label>api_id (number)</label>
      <input type="text" id="apiId" placeholder="12345678" value="${process.env.TELEGRAM_API_ID || ''}"/>
      <label>api_hash (string)</label>
      <input type="text" id="apiHash" placeholder="abcdef1234567890abcdef1234567890" value="${process.env.TELEGRAM_API_HASH || ''}"/>
      <label>Phone number (with country code)</label>
      <input type="text" id="phone" placeholder="+90 555 123 4567"/>
      <button onclick="startAuth()">Send Login Code</button>
      <div id="step1Status"></div>
    </div>

    <!-- STEP 2: Enter code -->
    <div class="card step" id="step2">
      <h2>Step 2: Enter Verification Code</h2>
      <p class="instructions">Telegram sent a code to your app. Enter it below.</p>
      <label>Verification Code</label>
      <input type="text" id="code" placeholder="12345"/>
      <button onclick="submitCode()">Verify</button>
      <div id="step2Status"></div>
    </div>

    <!-- STEP 3: 2FA password (if needed) -->
    <div class="card step" id="step3">
      <h2>Step 2b: Two-Factor Password</h2>
      <p class="instructions">Your account has 2FA enabled. Enter your password.</p>
      <label>2FA Password</label>
      <input type="password" id="password" placeholder="your 2FA password"/>
      <button onclick="submitPassword()">Submit</button>
      <div id="step3Status"></div>
    </div>

    <!-- STEP 4: Done -->
    <div class="card step" id="step4">
      <h2>Done!</h2>
      <div class="status ok" id="doneMsg">Session created successfully!</div>
      <p class="instructions" style="margin-top:12px">Copy this session string and add it to Vercel:</p>
      <div class="session-box" id="sessionBox"></div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('sessionBox').textContent);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Session',1500)">Copy Session</button>
      <p class="instructions" style="margin-top:16px">Then in Vercel dashboard, add env var:<br/><b>TELEGRAM_SESSION</b> = [paste the session string]<br/><b>TELEGRAM_API_ID</b> = [your api_id]<br/><b>TELEGRAM_API_HASH</b> = [your api_hash]</p>
    </div>
  </div>

  <script>
    const KEY = '${process.env.CRON_SECRET}'
    const BASE = '/api/telegram/auth'

    function showStep(n) {
      document.querySelectorAll('.step').forEach(s => s.classList.remove('active'))
      document.getElementById('step' + n).classList.add('active')
    }

    function setStatus(id, msg, type) {
      const el = document.getElementById(id)
      el.innerHTML = '<div class="status ' + type + '">' + msg + '</div>'
    }

    async function startAuth() {
      const apiId = document.getElementById('apiId').value.trim()
      const apiHash = document.getElementById('apiHash').value.trim()
      const phone = document.getElementById('phone').value.trim()
      if (!apiId || !apiHash || !phone) {
        setStatus('step1Status', 'Fill in all fields', 'err')
        return
      }
      setStatus('step1Status', 'Connecting to Telegram...', 'info')
      try {
        const res = await fetch(BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', apiId, apiHash, phone, key: KEY })
        })
        const data = await res.json()
        if (data.ok && data.state === 'waiting_code') {
          showStep(2)
        } else if (data.error) {
          setStatus('step1Status', data.error, 'err')
        }
      } catch (e) {
        setStatus('step1Status', 'Network error: ' + e.message, 'err')
      }
    }

    async function submitCode() {
      const code = document.getElementById('code').value.trim()
      if (!code) { setStatus('step2Status', 'Enter the code', 'err'); return }
      setStatus('step2Status', 'Verifying...', 'info')
      try {
        const res = await fetch(BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'code', code, key: KEY })
        })
        const data = await res.json()
        if (data.state === 'waiting_password') {
          showStep(3)
        } else if (data.state === 'done') {
          document.getElementById('sessionBox').textContent = data.session
          showStep(4)
        } else if (data.error) {
          setStatus('step2Status', data.error, 'err')
        }
      } catch (e) {
        setStatus('step2Status', 'Network error: ' + e.message, 'err')
      }
    }

    async function submitPassword() {
      const password = document.getElementById('password').value
      if (!password) { setStatus('step3Status', 'Enter password', 'err'); return }
      setStatus('step3Status', 'Verifying...', 'info')
      try {
        const res = await fetch(BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'password', password, key: KEY })
        })
        const data = await res.json()
        if (data.state === 'done') {
          document.getElementById('sessionBox').textContent = data.session
          showStep(4)
        } else if (data.error) {
          setStatus('step3Status', data.error, 'err')
        }
      } catch (e) {
        setStatus('step3Status', 'Network error: ' + e.message, 'err')
      }
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  if (body.key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action } = body

  try {
    if (action === 'start') {
      const { apiId, apiHash, phone } = body

      // Clean up any previous client
      if (pendingClient) {
        try { await pendingClient.disconnect() } catch {}
        pendingClient = null
      }
      pendingResolve = null
      pendingPasswordResolve = null
      authState = 'idle'
      authError = ''
      authSession = ''

      const client = new TelegramClient(
        new StringSession(''),
        parseInt(apiId),
        apiHash,
        { connectionRetries: 3 }
      )

      pendingClient = client

      // Start auth in background — it will pause at phoneCode callback
      const authPromise = client.start({
        phoneNumber: async () => phone,
        phoneCode: async () => {
          authState = 'waiting_code'
          return new Promise<string>(resolve => {
            pendingResolve = resolve
          })
        },
        password: async () => {
          authState = 'waiting_password'
          return new Promise<string>(resolve => {
            pendingPasswordResolve = resolve
          })
        },
        onError: (err) => {
          authState = 'error'
          authError = String(err)
        },
      })

      // Handle completion
      authPromise.then(() => {
        authState = 'done'
        authSession = client.session.save() as unknown as string

        // Save to .env.local
        const envPath = path.join(process.cwd(), '.env.local')
        try {
          let envContent = ''
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8')
          }
          if (!envContent.includes('TELEGRAM_SESSION=')) {
            fs.appendFileSync(envPath, `\nTELEGRAM_SESSION=${authSession}\n`)
          }
          if (!envContent.includes('TELEGRAM_API_ID=')) {
            fs.appendFileSync(envPath, `TELEGRAM_API_ID=${apiId}\n`)
          }
          if (!envContent.includes('TELEGRAM_API_HASH=')) {
            fs.appendFileSync(envPath, `TELEGRAM_API_HASH=${apiHash}\n`)
          }
        } catch {}
      }).catch(err => {
        authState = 'error'
        authError = String(err)
      })

      // Wait a bit for the code request to trigger
      await new Promise(r => setTimeout(r, 5000))

      if (authState === 'error') {
        return NextResponse.json({ ok: false, error: authError })
      }

      return NextResponse.json({ ok: true, state: authState })
    }

    if (action === 'code') {
      if (!pendingResolve) {
        return NextResponse.json({ ok: false, error: 'No pending code request. Start auth first.' })
      }

      pendingResolve(body.code)
      pendingResolve = null

      // Wait for next state
      await new Promise(r => setTimeout(r, 5000))

      if (authState === 'done') {
        return NextResponse.json({ ok: true, state: 'done', session: authSession })
      }
      if (authState === 'waiting_password') {
        return NextResponse.json({ ok: true, state: 'waiting_password' })
      }
      if (authState === 'error') {
        return NextResponse.json({ ok: false, error: authError })
      }

      return NextResponse.json({ ok: true, state: authState })
    }

    if (action === 'password') {
      if (!pendingPasswordResolve) {
        return NextResponse.json({ ok: false, error: 'No pending password request.' })
      }

      pendingPasswordResolve(body.password)
      pendingPasswordResolve = null

      // Wait for completion
      await new Promise(r => setTimeout(r, 5000))

      if (authState === 'done') {
        return NextResponse.json({ ok: true, state: 'done', session: authSession })
      }
      if (authState === 'error') {
        return NextResponse.json({ ok: false, error: authError })
      }

      return NextResponse.json({ ok: true, state: authState })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
