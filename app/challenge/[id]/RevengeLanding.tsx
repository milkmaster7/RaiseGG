'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShareButtons } from '@/components/ShareButtons'

interface ChallengerData {
  username: string
  avatar_url: string | null
  country: string | null
  cs2_elo: number
  dota2_elo: number
  deadlock_elo: number
  cs2_wins: number
  cs2_losses: number
  dota2_wins: number
  dota2_losses: number
  deadlock_wins: number
  deadlock_losses: number
}

interface RevengeChallenge {
  id: string
  stake_amount: number
  game: string
  message: string | null
  status: string
  created_at: string
  expires_at: string
  challenger: ChallengerData | ChallengerData[]
}

const GAME_LABELS: Record<string, string> = {
  cs2: 'CS2',
  dota2: 'Dota 2',
  deadlock: 'Deadlock',
}

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, diff)
  })

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      setTimeLeft(Math.max(0, diff))
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresAt, timeLeft])

  const hours = Math.floor(timeLeft / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  return { hours, minutes, seconds, expired: timeLeft <= 0 }
}

export function RevengeLanding({ challenge }: { challenge: RevengeChallenge }) {
  const challenger = (Array.isArray(challenge.challenger) ? challenge.challenger[0] : challenge.challenger) as ChallengerData
  const { hours, minutes, seconds, expired: countdownExpired } = useCountdown(challenge.expires_at)

  const isExpired = challenge.status !== 'pending' || countdownExpired
  const gameLabel = GAME_LABELS[challenge.game] ?? challenge.game
  const eloKey = `${challenge.game}_elo` as keyof ChallengerData
  const winsKey = `${challenge.game}_wins` as keyof ChallengerData
  const lossesKey = `${challenge.game}_losses` as keyof ChallengerData

  const elo = (challenger?.[eloKey] as number) ?? 1000
  const wins = (challenger?.[winsKey] as number) ?? 0
  const losses = (challenger?.[lossesKey] as number) ?? 0

  const shareUrl = `https://raisegg.com/challenge/${challenge.id}?type=revenge`
  const shareText = `${challenger?.username ?? 'Someone'} challenges you to a $${challenge.stake_amount} ${gameLabel} revenge match on RaiseGG!`

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-20 text-center">
      <div className="card py-10 px-6 relative overflow-hidden">
        {/* Revenge accent stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-accent-cyan to-accent-purple" />

        {/* Header */}
        <div className="text-5xl mb-3">&#x1F525;</div>
        <h1 className="font-orbitron text-2xl sm:text-3xl font-black text-white mb-1">
          {isExpired ? 'Challenge Expired' : 'Revenge Match'}
        </h1>
        {!isExpired && (
          <p className="text-accent-cyan text-sm font-semibold mb-6 uppercase tracking-wider">
            I challenge you to a rematch
          </p>
        )}

        {!isExpired && (
          <>
            {/* Challenger profile */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {challenger?.avatar_url ? (
                <img
                  src={challenger.avatar_url}
                  alt={challenger.username}
                  className="w-14 h-14 rounded-full border-2 border-accent-cyan"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-space-700 border-2 border-accent-cyan flex items-center justify-center">
                  <span className="text-white font-orbitron text-lg">
                    {(challenger?.username ?? '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-left">
                <div className="text-white font-semibold text-lg">{challenger?.username ?? 'Unknown'}</div>
                {challenger?.country && (
                  <div className="text-muted text-xs">{challenger.country}</div>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="bg-space-800 rounded-lg p-3">
                <div className="text-[10px] text-muted uppercase tracking-wider">Game</div>
                <div className="font-orbitron font-bold text-white text-sm mt-1">{gameLabel}</div>
              </div>
              <div className="bg-space-800 rounded-lg p-3">
                <div className="text-[10px] text-muted uppercase tracking-wider">ELO</div>
                <div className="font-orbitron font-bold text-accent-cyan text-sm mt-1">{elo}</div>
              </div>
              <div className="bg-space-800 rounded-lg p-3">
                <div className="text-[10px] text-muted uppercase tracking-wider">W/L</div>
                <div className="font-orbitron font-bold text-white text-sm mt-1">
                  <span className="text-green-400">{wins}</span>
                  <span className="text-muted mx-0.5">/</span>
                  <span className="text-red-400">{losses}</span>
                </div>
              </div>
              <div className="bg-space-800 rounded-lg p-3">
                <div className="text-[10px] text-muted uppercase tracking-wider">Stake</div>
                <div className="font-orbitron font-bold text-gradient text-sm mt-1">${challenge.stake_amount}</div>
              </div>
            </div>

            {/* Custom message */}
            {challenge.message && (
              <div className="bg-space-800 border border-space-700 rounded-lg p-4 mb-6 text-left">
                <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Message</div>
                <p className="text-white text-sm italic">&ldquo;{challenge.message}&rdquo;</p>
              </div>
            )}

            {/* Countdown timer */}
            <div className="mb-6">
              <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Expires in</div>
              <div className="flex items-center justify-center gap-2">
                <TimeBlock value={hours} label="hrs" />
                <span className="text-muted font-orbitron text-lg">:</span>
                <TimeBlock value={minutes} label="min" />
                <span className="text-muted font-orbitron text-lg">:</span>
                <TimeBlock value={seconds} label="sec" />
              </div>
            </div>

            {/* Accept CTA */}
            <Link
              href="/api/auth/steam"
              className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2 mb-4 shadow-glow animate-pulse-glow"
            >
              Accept Challenge
            </Link>
            <p className="text-xs text-muted mb-6">
              Sign in with Steam to accept. Winner takes 90%, paid instantly via Solana.
            </p>

            {/* Share */}
            <div className="border-t border-space-700 pt-4">
              <div className="text-[10px] text-muted uppercase tracking-wider mb-3">Share this challenge</div>
              <div className="flex justify-center">
                <ShareButtons url={shareUrl} text={shareText} />
              </div>
            </div>
          </>
        )}

        {isExpired && (
          <div className="mt-4">
            <p className="text-muted mb-6">This revenge challenge has expired or been resolved.</p>
            <Link href="/play" className="btn-primary px-6 py-3 inline-block">
              Browse Open Matches
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-space-800 rounded-lg px-3 py-2 min-w-[56px]">
      <div className="font-orbitron font-bold text-white text-xl tabular-nums">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[10px] text-muted uppercase">{label}</div>
    </div>
  )
}
