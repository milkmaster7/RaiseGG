import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'

// GET /api/players/me — full player profile for settings page
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data: player, error } = await db
    .from('players')
    .select('id, username, email, avatar_url, wallet_address, country')
    .eq('id', playerId)
    .single()

  if (error || !player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  return NextResponse.json({ player })
}

// PATCH /api/players/me — update username and/or email
export async function PATCH(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { username?: string; email?: string | null; country?: string | null }
  try {
    body = await req.json()
  } catch (_) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.username !== undefined) {
    const name = body.username?.trim()
    if (!name || name.length < 2 || name.length > 32) {
      return NextResponse.json({ error: 'Username must be 2-32 characters' }, { status: 400 })
    }
    updates.username = name
  }

  if (body.email !== undefined) {
    if (body.email === null || body.email === '') {
      updates.email = null
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email.trim())) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
      updates.email = body.email.trim()
    }
  }

  if (body.country !== undefined) {
    if (body.country === null || body.country === '') {
      updates.country = null
    } else {
      const code = body.country.trim().toUpperCase()
      if (code.length !== 2) {
        return NextResponse.json({ error: 'Country must be a 2-letter ISO code' }, { status: 400 })
      }
      updates.country = code
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const db = createServiceClient()
  const { data: player, error } = await db
    .from('players')
    .update(updates)
    .eq('id', playerId)
    .select('id, username, email, avatar_url, wallet_address, country')
    .single()

  if (error) {
    // Handle unique constraint on username
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ player })
}

// DELETE /api/players/me — soft-delete account (ban + clear personal data)
export async function DELETE(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Check for active matches (open or in_progress)
  const { data: activeMatches } = await db
    .from('matches')
    .select('id')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .in('status', ['open', 'in_progress'])
    .limit(1)

  if (activeMatches && activeMatches.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete account while you have active matches. Cancel or finish them first.' },
      { status: 409 }
    )
  }

  // Soft delete: ban player and clear personal data
  const { error } = await db
    .from('players')
    .update({
      banned: true,
      username: `deleted_${playerId.slice(0, 8)}`,
      email: null,
      avatar_url: null,
      wallet_address: null,
    })
    .eq('id', playerId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
