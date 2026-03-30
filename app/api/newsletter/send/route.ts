import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendBulkNewsletter } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { subject, html } = body as { subject?: string; html?: string }

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: subject and html' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: subscribers, error } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .is('unsubscribed_at', null)

    if (error) {
      console.error('Failed to fetch subscribers:', error)
      return NextResponse.json({ error: 'Failed to fetch subscribers.' }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No active subscribers.' })
    }

    const emails = subscribers.map((s) => s.email as string)
    const results = await sendBulkNewsletter(emails, subject, html)

    const succeeded = results.filter((r) => r.ok).length
    const failed = results.filter((r) => !r.ok).length

    return NextResponse.json({
      sent: succeeded,
      failed,
      total: emails.length,
    })
  } catch (_) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
}
