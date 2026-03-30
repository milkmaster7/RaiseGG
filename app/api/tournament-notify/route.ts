import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const supabase = createServiceClient()
    await supabase
      .from('tournament_notify')
      .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email' })

    return NextResponse.json({ ok: true })
  } catch (_) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
