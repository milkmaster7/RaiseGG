import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

const ADMIN_PLAYER_IDS = (process.env.ADMIN_PLAYER_IDS ?? '').split(',').filter(Boolean)

function isAdmin(playerId: string) {
  return ADMIN_PLAYER_IDS.includes(playerId)
}

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId || !isAdmin(playerId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const supabase = createServiceClient()

  let query = supabase
    .from('players')
    .select('id, username, avatar_url, email, cs2_elo, dota2_elo, usdc_balance, banned, ban_reason, eligible, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) query = query.ilike('username', `%${q}%`)

  const { data: players } = await query
  return NextResponse.json({ players: players ?? [] })
}

export async function PATCH(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId || !isAdmin(playerId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { targetId, banned, banReason } = await req.json()
  if (!targetId) return NextResponse.json({ error: 'targetId required' }, { status: 400 })

  const supabase = createServiceClient()

  const { error } = await supabase.from('players').update({
    banned:     banned ?? false,
    ban_reason: banned ? (banReason ?? 'Admin action') : null,
  }).eq('id', targetId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  if (banned) {
    await supabase.from('bans').insert({
      player_id: targetId,
      reason:    banReason ?? 'Admin action',
      banned_by: playerId,
    })
  }

  return NextResponse.json({ ok: true })
}
