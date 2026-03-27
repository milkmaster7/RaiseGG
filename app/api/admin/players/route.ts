import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  const supabase = createServiceClient()
  if (!playerId || !(await isAdmin(playerId, supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q') ?? ''

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
  const supabase = createServiceClient()
  if (!playerId || !(await isAdmin(playerId, supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { targetId, banned, banReason } = await req.json()
  if (!targetId) return NextResponse.json({ error: 'targetId required' }, { status: 400 })

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
