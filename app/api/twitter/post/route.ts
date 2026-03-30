import { NextResponse } from 'next/server'
import { tweetWithDetails } from '@/lib/twitter'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const result = await tweetWithDetails(text)
  if (!result.id) {
    return NextResponse.json({ error: 'Tweet failed', detail: result.error, httpStatus: result.status }, { status: 500 })
  }

  return NextResponse.json({ success: true, tweetId: result.id })
}
