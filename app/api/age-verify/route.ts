import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// POST /api/age-verify — player confirms they are 18+
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { confirmed } = await req.json()
  if (!confirmed) {
    return NextResponse.json({ error: 'You must confirm you are 18 or older' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('players')
    .update({
      age_verified: true,
      age_verified_at: new Date().toISOString(),
    })
    .eq('id', playerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'Age verification confirmed' })
}

// GET /api/age-verify — check if player has verified age
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('players')
    .select('age_verified, age_verified_at')
    .eq('id', playerId)
    .single()

  return NextResponse.json({
    verified: data?.age_verified ?? false,
    verifiedAt: data?.age_verified_at ?? null,
  })
}
