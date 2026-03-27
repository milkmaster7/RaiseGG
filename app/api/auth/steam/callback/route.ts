import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { createServiceClient } from '@/lib/supabase'
import { checkPlayerEligibility, getPlayerSummary, getPlayerBans, getHoursPlayed } from '@/lib/steam'
import { signSession } from '@/lib/session'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const SITE_URL = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://raisegg.vercel.app'
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-min-32-chars'
)

// Step 2 — Steam redirects back here with openid params
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const params = Object.fromEntries(searchParams.entries())

  // Verify CSRF state
  const state = searchParams.get('state')
  if (!state) return NextResponse.redirect(`${SITE_URL}?error=missing_state`)
  try {
    await jwtVerify(state, SECRET)
  } catch {
    return NextResponse.redirect(`${SITE_URL}?error=invalid_state`)
  }

  // Verify with Steam
  const verifyParams = new URLSearchParams({ ...params, 'openid.mode': 'check_authentication' })
  const verifyRes = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    body: verifyParams,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const verifyText = await verifyRes.text()
  if (!verifyText.includes('is_valid:true')) {
    return NextResponse.redirect(`${SITE_URL}?error=steam_auth_failed`)
  }

  // Extract Steam64 ID from claimed_id URL
  const claimedId = params['openid.claimed_id'] ?? ''
  const steamId = claimedId.replace('https://steamcommunity.com/openid/id/', '')
  if (!steamId || !/^\d{17}$/.test(steamId)) {
    return NextResponse.redirect(`${SITE_URL}?error=invalid_steam_id`)
  }

  // Check eligibility
  const eligibility = await checkPlayerEligibility(steamId)
  const summary = await getPlayerSummary(steamId)

  const supabase = createServiceClient()

  const [bans, cs2Hours, dota2Hours] = await Promise.all([
    getPlayerBans(steamId),
    getHoursPlayed(steamId, 730),
    getHoursPlayed(steamId, 570),
  ])

  // Upsert player
  const { data: player, error } = await supabase
    .from('players')
    .upsert({
      steam_id:       steamId,
      username:       summary?.personaname ?? `Player_${steamId.slice(-6)}`,
      avatar_url:     summary?.avatarfull,
      eligible:       eligibility.eligible,
      account_age_ok: eligibility.eligible,
      vac_banned:     bans?.VACBanned ?? false,
      hours_ok:       (cs2Hours >= 100 || dota2Hours >= 100),
      cs2_elo:        1000,
      dota2_elo:      1000,
      deadlock_elo:   1000,
      cs2_wins:       0,
      cs2_losses:     0,
      dota2_wins:     0,
      dota2_losses:   0,
      deadlock_wins:  0,
      deadlock_losses: 0,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'steam_id' })
    .select()
    .single()

  if (error || !player) {
    return NextResponse.redirect(`${SITE_URL}?error=db_error`)
  }

  // Sign a JWT and set as session cookie
  const token = await signSession(player.id)
  const response = NextResponse.redirect(`${SITE_URL}/dashboard`)
  response.cookies.set('rgg_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return response
}
