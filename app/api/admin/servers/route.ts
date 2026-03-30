import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { readSession } from '@/lib/session'
import { isAdmin } from '@/lib/admin'

// GET /api/admin/servers — full server list with sensitive data (admin only)
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  const supabase = createServiceClient()
  if (!playerId || !(await isAdmin(playerId, supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase.from('game_servers').select('*').order('region')
  return NextResponse.json(data ?? [])
}

// POST /api/admin/servers — add a new server
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  const supabase = createServiceClient()
  if (!playerId || !(await isAdmin(playerId, supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { ip, port, rcon_password, region, hostname, provider, gotv_port } = await req.json()
  if (!ip || !port || !region || !hostname) {
    return NextResponse.json({ error: 'ip, port, region, hostname required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('game_servers').insert({
    ip,
    port,
    rcon_password: rcon_password ?? '',
    region,
    hostname,
    provider: provider ?? 'custom',
    gotv_port: gotv_port ?? null,
    status: 'available',
    last_heartbeat: new Date().toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
