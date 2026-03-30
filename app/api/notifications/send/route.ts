import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase'

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return
  if (process.env.NEXT_PUBLIC_VAPID_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:hello@raisegg.com',
      process.env.NEXT_PUBLIC_VAPID_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    vapidConfigured = true
  }
}

interface NotificationPayload {
  title: string
  body: string
  url?: string
  icon?: string
  tag?: string
}

// Send push notification to a specific player
async function sendPushToPlayer(playerId: string, payload: NotificationPayload) {
  ensureVapid()
  const supabase = createServiceClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('player_id', playerId)

  if (!subs || subs.length === 0) return 0

  let sent = 0
  const staleEndpoints: string[] = []

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          data: { url: payload.url ?? 'https://raisegg.com' },
          icon: payload.icon ?? '/icon-192.png',
          tag: payload.tag,
        })
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        staleEndpoints.push(sub.endpoint)
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }

  return sent
}

// Match event notification payloads
const MATCH_PAYLOADS: Record<string, (d: Record<string, any>) => NotificationPayload> = {
  match_found: (d) => ({
    title: 'Match Found!',
    body: `A ${d.game?.toUpperCase()} player near your ELO is looking for a $${d.stake} match`,
    url: '/play',
    tag: 'match-found',
  }),
  match_result: (d) => ({
    title: d.won ? 'You Won!' : 'Match Complete',
    body: d.won
      ? `You won $${d.payout} in ${d.game?.toUpperCase()}!`
      : `Better luck next time. ${d.game?.toUpperCase()} match resolved.`,
    url: '/dashboard/matches',
    tag: 'match-result',
  }),
  match_cancelled: (d) => ({
    title: 'Match Cancelled',
    body: `Your ${d.game?.toUpperCase() ?? ''} match was cancelled. Stake refunded.`,
    url: '/dashboard/wallet',
    tag: 'match-cancelled',
  }),
  challenge_received: (d) => ({
    title: 'Challenge Received!',
    body: `${d.challenger} challenged you to a $${d.stake} ${d.game?.toUpperCase()} match`,
    url: d.challengeUrl ?? '/play',
    tag: 'challenge',
  }),
  tournament_starting: (d) => ({
    title: 'Tournament Starting Soon!',
    body: `${d.name} starts in 1 hour. Check in now.`,
    url: '/tournaments',
    tag: 'tournament',
  }),
}

// Exported for internal use from other server files
export async function sendMatchNotification(type: string, playerId: string, details: Record<string, any>) {
  const payloadFn = MATCH_PAYLOADS[type]
  if (!payloadFn) return 0
  return sendPushToPlayer(playerId, payloadFn(details))
}

// POST /api/notifications/send — cron/internal endpoint
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, playerId, title, body, url, details } = await req.json()

  // Support both typed events and direct title/body
  if (type && playerId && MATCH_PAYLOADS[type]) {
    const sent = await sendMatchNotification(type, playerId, details ?? {})
    return NextResponse.json({ sent })
  }

  if (!playerId || !title || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const sent = await sendPushToPlayer(playerId, { title, body, url })
  return NextResponse.json({ sent })
}
