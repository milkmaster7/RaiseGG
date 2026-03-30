import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendNewsletterWelcome } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = (body.email ?? '').trim().toLowerCase()

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        { email, subscribed_at: new Date().toISOString(), unsubscribed_at: null },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('Newsletter insert error:', error)
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 })
    }

    // Send welcome email (fire-and-forget, don't block the response)
    sendNewsletterWelcome(email).catch((_) => {
      console.error('Failed to send newsletter welcome email to', email)
    })

    return NextResponse.json({ ok: true })
  } catch (_) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
}
