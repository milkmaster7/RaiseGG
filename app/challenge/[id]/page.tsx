import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { getTier } from '@/lib/elo'
import { RevengeLanding } from './RevengeLanding'

type Props = { params: Promise<{ id: string }> }

// ─── Helpers ────────────────────────────────────────────────────────────────
async function fetchRevengeChallenge(supabase: ReturnType<typeof createServiceClient>, id: string) {
  const { data } = await supabase
    .from('revenge_challenges')
    .select(`
      id, stake_amount, game, message, status, created_at, expires_at,
      challenger:players!challenger_id(
        username, avatar_url, country,
        cs2_elo, dota2_elo, deadlock_elo,
        cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses
      )
    `)
    .eq('id', id)
    .single()
  return data
}

async function fetchChallengeLink(supabase: ReturnType<typeof createServiceClient>, id: string) {
  const { data } = await supabase
    .from('challenge_links')
    .select('*, creator:players!creator_id(username, avatar_url, cs2_elo, dota2_elo, deadlock_elo)')
    .eq('id', id)
    .single()
  return data
}

// ─── Metadata ───────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()

  // Try revenge challenge first, then fall back to challenge_links
  const revenge = await fetchRevengeChallenge(supabase, id)
  if (revenge) {
    const challenger = revenge.challenger as any
    const name = challenger?.username ?? 'Someone'
    const title = `${name} challenges you to a rematch — $${revenge.stake_amount} ${revenge.game.toUpperCase()}`
    return {
      title,
      description: revenge.message || `Accept this ${revenge.game.toUpperCase()} revenge match on RaiseGG. $${revenge.stake_amount} stake, instant USDC/USDT payout.`,
      openGraph: {
        title,
        description: `$${revenge.stake_amount} ${revenge.game.toUpperCase()} revenge match on RaiseGG`,
        images: [{ url: `/api/og?title=${encodeURIComponent(title)}&sub=raisegg.com&color=ff6b35`, width: 1200, height: 630 }],
      },
    }
  }

  const link = await fetchChallengeLink(supabase, id)
  if (!link) return { title: 'Challenge Not Found' }

  const creator = link.creator as any
  const title = `${creator?.username ?? 'Someone'} challenged you — $${link.stake_amount} ${link.game.toUpperCase()}`
  return {
    title,
    description: `Accept this ${link.game.toUpperCase()} stake challenge on RaiseGG. $${link.stake_amount} stake, instant USDC/USDT payout.`,
    openGraph: {
      title,
      description: `$${link.stake_amount} ${link.game.toUpperCase()} stake match on RaiseGG`,
      images: [{ url: `/api/og?title=${encodeURIComponent(title)}&sub=raisegg.com&color=ff6b35`, width: 1200, height: 630 }],
    },
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default async function ChallengePage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  // Try revenge challenge first
  const revenge = await fetchRevengeChallenge(supabase, id)
  if (revenge) {
    return <RevengeLanding challenge={revenge} />
  }

  // Fall back to existing challenge_links
  const data = await fetchChallengeLink(supabase, id)
  if (!data) notFound()

  const creator = data.creator as any
  const expired = data.status !== 'active' || new Date(data.expires_at) < new Date()
  const gameLabel = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }[data.game as string] ?? data.game
  const eloKey = `${data.game}_elo` as string
  const creatorElo = creator?.[eloKey] ?? 1000
  const tier = getTier(creatorElo)

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="card py-10 px-6">
        <div className="text-6xl mb-4">&#x2694;&#xFE0F;</div>
        <h1 className="font-orbitron text-2xl font-black text-white mb-2">
          {expired ? 'Challenge Expired' : 'You\'ve Been Challenged!'}
        </h1>

        {!expired && (
          <>
            <p className="text-muted mb-6">
              <span className="text-white font-semibold">{creator?.username ?? 'Unknown'}</span>
              {' '}wants to play a <span className="text-accent-cyan font-semibold">${data.stake_amount}</span>
              {' '}<span className="text-white">{gameLabel}</span> stake match
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-space-800 rounded-lg p-3">
                <div className="text-xs text-muted uppercase">Game</div>
                <div className="font-orbitron font-bold text-white text-sm">{gameLabel}</div>
              </div>
              <div className="bg-space-800 rounded-lg p-3">
                <div className="text-xs text-muted uppercase">Stake</div>
                <div className="font-orbitron font-bold text-gradient text-sm">${data.stake_amount}</div>
              </div>
              <div className="bg-space-800 rounded-lg p-3">
                <div className="text-xs text-muted uppercase">Rank</div>
                <div className="font-orbitron font-bold text-sm" style={{ color: tier.color }}>{tier.name}</div>
              </div>
            </div>

            <Link href="/api/auth/steam" className="btn-primary text-base px-8 py-4 inline-block mb-4">
              Accept Challenge — Connect Steam
            </Link>
            <p className="text-xs text-muted">Winner takes 90%. Paid instantly via Solana.</p>
          </>
        )}

        {expired && (
          <div className="mt-4">
            <p className="text-muted mb-6">This challenge link has expired or been used.</p>
            <Link href="/play" className="btn-primary px-6 py-3 inline-block">
              Browse Open Matches
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
