import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

// POST /api/matches/[id]/connect — admin assigns a CS2 server to a locked match
// Also called by MatchZy server provisioning automation when a server is ready
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const playerId = await readSession(req)
  const supabase = createServiceClient()

  // Allow admin or MatchZy webhook secret
  const webhookSecret = req.headers.get('x-matchzy-secret')
  const isWebhook = webhookSecret && webhookSecret === process.env.MATCHZY_WEBHOOK_SECRET

  if (!isWebhook) {
    if (!playerId || !(await isAdmin(playerId, supabase))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { serverIp, serverPort, connectToken } = await req.json()

  if (!serverIp || !serverPort || !connectToken) {
    return NextResponse.json({ error: 'serverIp, serverPort, and connectToken are required' }, { status: 400 })
  }

  const { data: match, error } = await supabase
    .from('matches')
    .update({
      server_ip:     serverIp,
      server_port:   Number(serverPort),
      connect_token: connectToken,
      status:        'live',
    })
    .eq('id', matchId)
    .eq('game', 'cs2')
    .in('status', ['locked', 'live'])
    .select()
    .single()

  if (error || !match) {
    return NextResponse.json({ error: 'Match not found or not eligible for server assignment' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, match })
}
