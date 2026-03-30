import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const username = searchParams.get('username') ?? 'Player'
  const matchesPlayed = searchParams.get('matches') ?? '0'
  const wins = searchParams.get('wins') ?? '0'
  const losses = searchParams.get('losses') ?? '0'
  const winRate = searchParams.get('winRate') ?? '0'
  const eloChange = searchParams.get('eloChange') ?? '0'
  const biggestWin = searchParams.get('biggestWin') ?? '0'
  const streak = searchParams.get('streak') ?? '0'
  const totalEarned = searchParams.get('totalEarned') ?? '0'
  const rank = searchParams.get('rank') ?? '—'

  const eloNum = Number(eloChange)
  const earnedNum = Number(totalEarned)
  const eloColor = eloNum >= 0 ? '#22c55e' : '#ef4444'
  const earnedColor = earnedNum >= 0 ? '#22c55e' : '#ef4444'

  const stats = [
    { label: 'MATCHES', value: matchesPlayed },
    { label: 'WINS', value: wins, color: '#22c55e' },
    { label: 'LOSSES', value: losses, color: '#ef4444' },
    { label: 'WIN RATE', value: `${winRate}%` },
    { label: 'ELO CHANGE', value: `${eloNum >= 0 ? '+' : ''}${eloChange}`, color: eloColor },
    { label: 'BIGGEST WIN', value: `$${biggestWin}`, color: '#22c55e' },
    { label: 'STREAK', value: `${streak} days` },
    { label: 'EARNED', value: `${earnedNum >= 0 ? '+' : ''}$${totalEarned}`, color: earnedColor },
    { label: 'RANK', value: `#${rank}` },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #07070f 0%, #12122a 50%, #1a1a3e 100%)',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '700px',
            height: '350px',
            background: 'radial-gradient(ellipse, rgba(0,212,255,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.2em', color: '#00d4ff', textTransform: 'uppercase' }}>
            RaiseGG
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', letterSpacing: '0.1em' }}>
            WEEKLY HIGHLIGHT REEL
          </div>
        </div>

        {/* Player name */}
        <div style={{ fontSize: 42, fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>
          {username}&apos;s Week
        </div>
        <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: '40px', letterSpacing: '0.05em' }}>
          Your performance this week on RaiseGG
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '120px',
                height: '90px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color ?? '#ffffff', marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '60px',
            right: '60px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: '#4b5563' }}>
            raisegg.com
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['CS2', 'DOTA 2', 'DEADLOCK'].map((game) => (
              <div
                key={game}
                style={{
                  background: 'rgba(0,212,255,0.1)',
                  border: '1px solid rgba(0,212,255,0.3)',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#00d4ff',
                  letterSpacing: '0.1em',
                }}
              >
                {game}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    }
  )
}
