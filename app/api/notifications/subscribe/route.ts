import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { endpoint, keys, playerId } = await req.json()

    if (!endpoint || !keys?.p256dh || !keys?.auth || !playerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Upsert by endpoint so re-subscribing updates keys
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          player_id: playerId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('[push-subscribe] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (_) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
