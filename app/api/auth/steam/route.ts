import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://raisegg.gg'
const RETURN_URL = `${SITE_URL}/api/auth/steam/callback`
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-min-32-chars'
)

// Step 1 — redirect to Steam OpenID with signed CSRF state
export async function GET() {
  const state = await new SignJWT({ ts: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(SECRET)

  const params = new URLSearchParams({
    'openid.ns':         'http://specs.openid.net/auth/2.0',
    'openid.mode':       'checkid_setup',
    'openid.return_to':  `${RETURN_URL}?state=${encodeURIComponent(state)}`,
    'openid.realm':      SITE_URL,
    'openid.identity':   'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })

  return NextResponse.redirect(`${STEAM_OPENID_URL}?${params.toString()}`)
}
