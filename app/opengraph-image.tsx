import { ImageResponse } from 'next/og'

export const alt = 'RaiseGG.gg — Stake. Play. Win.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #07070f 0%, #12122a 50%, #1a1a3e 100%)',
          padding: '80px',
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: '0.05em',
            background: 'linear-gradient(135deg, #7b61ff, #00d4ff)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 24,
          }}
        >
          RaiseGG
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#a0a0c0',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 48,
          }}
        >
          Stake · Play · Win
        </div>

        {/* Games */}
        <div style={{ display: 'flex', gap: 20 }}>
          {['CS2', 'DOTA 2', 'DEADLOCK'].map((game) => (
            <div
              key={game}
              style={{
                background: 'rgba(123, 97, 255, 0.15)',
                border: '1px solid rgba(123, 97, 255, 0.4)',
                borderRadius: 4,
                padding: '8px 20px',
                fontSize: 16,
                fontWeight: 600,
                color: '#9b84ff',
                letterSpacing: '0.1em',
              }}
            >
              {game}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 60,
            fontSize: 18,
            color: '#7b61ff',
            letterSpacing: '0.1em',
          }}
        >
          RaiseGG.gg
        </div>
      </div>
    ),
    { ...size }
  )
}
