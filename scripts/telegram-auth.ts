/**
 * scripts/telegram-auth.ts — One-time Telegram user authentication
 *
 * Run this ONCE to create a session file. After that, the userbot
 * can post to groups, join channels, etc. without user interaction.
 *
 * Prerequisites:
 * 1. Go to https://my.telegram.org → API Development Tools
 * 2. Create an app → get api_id (number) + api_hash (string)
 * 3. Set them as env vars: TELEGRAM_API_ID, TELEGRAM_API_HASH
 *
 * Usage:
 *   npx tsx scripts/telegram-auth.ts
 */

import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'

const SESSION_FILE = path.join(__dirname, '..', '.telegram-session')

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || '')
  const apiHash = process.env.TELEGRAM_API_HASH || ''

  if (!apiId || !apiHash) {
    console.error('\n❌ Missing TELEGRAM_API_ID or TELEGRAM_API_HASH')
    console.error('\nSteps:')
    console.error('1. Go to https://my.telegram.org')
    console.error('2. Log in with your phone number')
    console.error('3. Go to "API Development Tools"')
    console.error('4. Create an application (any name)')
    console.error('5. Copy api_id and api_hash')
    console.error('6. Set them:')
    console.error('   export TELEGRAM_API_ID=12345678')
    console.error('   export TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890')
    console.error('7. Run this script again')
    process.exit(1)
  }

  console.log('\n🔐 Telegram User Authentication')
  console.log('================================\n')

  const session = new StringSession('')
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 3,
  })

  await client.start({
    phoneNumber: async () => await ask('📱 Enter your phone number (with country code, e.g. +90...): '),
    password: async () => await ask('🔒 Enter your 2FA password (if set): '),
    phoneCode: async () => await ask('📨 Enter the code Telegram sent you: '),
    onError: (err) => console.error('Error:', err),
  })

  const sessionString = client.session.save() as unknown as string
  fs.writeFileSync(SESSION_FILE, sessionString, 'utf-8')

  // Also add to .env.local for the Next.js app
  const envPath = path.join(__dirname, '..', '.env.local')
  let envContent = ''
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8')
  }

  if (!envContent.includes('TELEGRAM_SESSION=')) {
    fs.appendFileSync(envPath, `\nTELEGRAM_SESSION=${sessionString}\n`)
    console.log('\n✅ Session saved to .env.local as TELEGRAM_SESSION')
  }

  console.log(`\n✅ Session saved to ${SESSION_FILE}`)
  console.log('✅ You can now use the Telegram userbot!')

  const me = await client.getMe()
  console.log(`\n👤 Logged in as: ${(me as any).firstName} ${(me as any).lastName || ''} (@${(me as any).username || 'no username'})`)

  await client.disconnect()
}

main().catch(console.error)
