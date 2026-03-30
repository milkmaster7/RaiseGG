import { NextRequest, NextResponse } from 'next/server'
import { readSession } from '@/lib/session'
import { canClaimFaucet, claimFaucet, getFaucetStats } from '@/lib/faucet'
import { rateLimit } from '@/lib/rate-limit'

/**
 * GET /api/faucet — Check faucet status for current user
 */
export async function GET(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await canClaimFaucet(playerId)

  return NextResponse.json({
    canClaim: status.canClaim,
    alreadyClaimed: status.alreadyClaimed ?? false,
    reason: status.reason,
    amount: 0.50,
    message: status.canClaim
      ? 'Claim your free $0.50 to play your first match!'
      : status.reason,
  })
}

/**
 * POST /api/faucet — Claim the $0.50 faucet
 */
export async function POST(req: NextRequest) {
  const playerId = await readSession(req)
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 100 claims per day total (global, not per-user)
  const { allowed } = rateLimit('faucet:global', 100, 24 * 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily faucet limit reached. Try again tomorrow!' },
      { status: 429 }
    )
  }

  const result = await claimFaucet(playerId)

  if (!result.success) {
    return NextResponse.json(
      { error: result.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    amount: 0.50,
    message: result.message,
  })
}
