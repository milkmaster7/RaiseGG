import { NextRequest, NextResponse } from 'next/server'
import { getAllServers, serverHeartbeat } from '@/lib/game-servers'

// GET /api/servers — list all servers with status (public)
export async function GET() {
  const servers = await getAllServers()
  // Strip sensitive info for public view
  const safe = servers.map(s => ({
    id: s.id,
    region: s.region,
    hostname: s.hostname,
    status: s.status,
    playerCount: (s as any).player_count ?? 0,
    gotvAvailable: !!s.gotv_port,
    lastSeen: s.last_heartbeat,
  }))
  return NextResponse.json(safe)
}

// POST /api/servers — server heartbeat (from game servers)
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { serverId, playerCount } = await req.json()
  if (!serverId) return NextResponse.json({ error: 'serverId required' }, { status: 400 })

  await serverHeartbeat(serverId, playerCount ?? 0)
  return NextResponse.json({ ok: true })
}
