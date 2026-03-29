import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// GET /api/pnl-card?username=...&opponent=...&game=CS2&result=win&payout=45.00&elo=+28&stake=25.00
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const username = searchParams.get('username') ?? 'Player'
  const opponent = searchParams.get('opponent') ?? 'Opponent'
  const game = searchParams.get('game') ?? 'CS2'
  const result = searchParams.get('result') ?? 'win'
  const payout = searchParams.get('payout') ?? '0.00'
  const elo = searchParams.get('elo') ?? '+0'
  const stake = searchParams.get('stake') ?? '0.00'

  const won = result === 'win'
  const accentColor = won ? '#22c55e' : '#ef4444'
  const accentRgb = won ? '34,197,94' : '239,68,68'
  const resultLabel = won ? 'VICTORY' : 'DEFEAT'
  const emoji = won ? '🏆' : '💀'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #07070f 0%, #0d0d1f 40%, #12122a 100%)',
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            background: `radial-gradient(circle, rgba(${accentRgb}, 0.12) 0%, transparent 70%)`,
            borderRadius: '50%',
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '28px 48px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#00e6ff', letterSpacing: '0.15em' }}>
              RaiseGG
            </div>
            <div style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>Match Result</div>
          </div>
          <div
            style={{
              background: `rgba(${accentRgb}, 0.15)`,
              border: `1px solid ${accentColor}`,
              borderRadius: '6px',
              padding: '6px 20px',
              fontSize: 14,
              fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.15em',
            }}
          >
            {game.toUpperCase()}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '0 48px',
            gap: 8,
          }}
        >
          {/* Result */}
          <div style={{ fontSize: 18, letterSpacing: '0.3em', color: '#666', fontWeight: 600 }}>
            MATCH RESULT
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: accentColor,
              letterSpacing: '0.05em',
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {resultLabel} {emoji}
          </div>

          {/* Players */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ffffff' }}>{username}</div>
            <div style={{ fontSize: 20, color: '#444', fontWeight: 600 }}>vs</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#888' }}>{opponent}</div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: 48,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '24px 56px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 13, color: '#666', fontWeight: 600, letterSpacing: '0.1em' }}>STAKE</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff' }}>${stake}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 13, color: '#666', fontWeight: 600, letterSpacing: '0.1em' }}>
                {won ? 'PAYOUT' : 'LOST'}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: accentColor }}>
                {won ? '+' : '-'}${won ? payout : stake}
              </div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 13, color: '#666', fontWeight: 600, letterSpacing: '0.1em' }}>ELO</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: elo.startsWith('-') ? '#ef4444' : '#22c55e' }}>
                {elo}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 48px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontSize: 14, color: '#444' }}>raisegg.gg</div>
          <div style={{ fontSize: 14, color: '#444' }}>Stake. Play. Win.</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
