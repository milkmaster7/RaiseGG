import { NextResponse } from 'next/server'
import { postToChannel, postAnnouncement } from '@/lib/telegram'

// POST /api/telegram/post — manually post to the Telegram channel
export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, body, link, raw } = await req.json()

  // raw = send exact text as-is
  if (raw) {
    const ok = await postToChannel(raw)
    return NextResponse.json({ ok })
  }

  if (!title || !body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  }

  const ok = await postAnnouncement(title, body, link)
  return NextResponse.json({ ok })
}
