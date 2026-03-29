import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') ?? 'Stake. Play. Win.'
  const sub = searchParams.get('sub') ?? 'RaiseGG'
  const color = searchParams.get('color') ?? '7b61ff'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #07070f 0%, #12122a 50%, #1a1a3e 100%)',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '300px',
            background: `radial-gradient(ellipse, #${color}22 0%, transparent 70%)`,
            borderRadius: '50%',
          }}
        />

        {/* Brand */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: `#${color}`,
            textTransform: 'uppercase',
            marginBottom: 32,
          }}
        >
          RaiseGG
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 40 ? 48 : 60,
            fontWeight: 900,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '900px',
            marginBottom: 32,
          }}
        >
          {title}
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 20,
            color: '#a0a0c0',
            letterSpacing: '0.1em',
          }}
        >
          {sub}
        </div>

        {/* Game badges */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 40,
          }}
        >
          {['CS2', 'DOTA 2', 'DEADLOCK'].map((game) => (
            <div
              key={game}
              style={{
                background: `rgba(${color === '00d4ff' ? '0,212,255' : '123,97,255'}, 0.15)`,
                border: `1px solid rgba(${color === '00d4ff' ? '0,212,255' : '123,97,255'}, 0.4)`,
                borderRadius: '4px',
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: `#${color}`,
                letterSpacing: '0.1em',
              }}
            >
              {game}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
