import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

/*
  /api/pnl-card?username=NiKo&game=cs2&result=win&payout=45.00&stake=25.00&elo=+28
  Optional: &opponent=s1mple &side=ct|t &hero=axe &character=haze &ref=abc123
*/

const GAME: Record<string, { label: string; color: string; rgb: string; bg: string; overlay: string }> = {
  cs2:      { label: 'CS2',      color: '#FF8C00', rgb: '255,140,0',  bg: 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg',    overlay: 'rgba(0,0,0,0.25)' },
  dota2:    { label: 'DOTA 2',   color: '#E23D28', rgb: '226,61,40',  bg: 'https://cdn.akamai.steamstatic.com/steam/apps/570/library_hero.jpg',    overlay: 'rgba(0,0,0,0.45)' },
  deadlock: { label: 'DEADLOCK', color: '#F5A623', rgb: '245,166,35', bg: 'https://cdn.akamai.steamstatic.com/steam/apps/1422450/library_hero.jpg', overlay: 'rgba(0,0,0,0.42)' },
}

function getDetail(game: string, p: URLSearchParams): string {
  if (game === 'cs2') {
    // Prefer map name, fall back to side
    const map = p.get('map')
    if (map) return map
    const side = p.get('side')?.toLowerCase()
    if (side === 'ct') return 'Counter-Terrorist'
    if (side === 't') return 'Terrorist'
    return ''
  }
  if (game === 'dota2') return p.get('hero') ?? ''
  if (game === 'deadlock') return p.get('character') ?? ''
  return ''
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const username = p.get('username') ?? 'Player'
  const opponent = p.get('opponent') ?? ''
  const game     = (p.get('game') ?? 'cs2').toLowerCase()
  const result   = p.get('result') ?? 'win'
  const payout   = p.get('payout') ?? '0.00'
  const stake    = p.get('stake') ?? '0.00'
  const ref      = p.get('ref') ?? ''
  const won      = result === 'win'
  const detail   = getDetail(game, p)

  const gc = GAME[game] ?? GAME.cs2
  const resultColor = won ? '#4ADE80' : '#FF2D2D'
  const profit = won ? `+$${payout}` : `-$${stake}`

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif',
      }}>

        {/* ── Full background: game artwork ── */}
        <img
          src={gc.bg}
          width={1200}
          height={630}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* ── Dark overlay so text is readable ── */}
        <div style={{
          display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `linear-gradient(135deg, rgba(0,0,0,0.60) 0%, ${gc.overlay} 50%, rgba(0,0,0,0.40) 100%)`,
        }} />

        {/* ── Game color tint ── */}
        <div style={{
          display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `linear-gradient(180deg, rgba(${gc.rgb},0.08) 0%, rgba(${gc.rgb},0.03) 100%)`,
        }} />

        {/* ── Content ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          position: 'relative', width: '100%', height: '100%',
          padding: '44px 52px',
        }}>

          {/* Top bar: RaiseGG + game badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 900, color: '#ffffff', letterSpacing: '0.08em' }}>
              RAISEGG
            </div>
            <div style={{
              display: 'flex', padding: '8px 22px', borderRadius: '4px',
              background: `rgba(${gc.rgb}, 0.25)`, border: `2px solid ${gc.color}60`,
              fontSize: 16, fontWeight: 800, color: gc.color, letterSpacing: '0.15em',
            }}>
              {gc.label}
            </div>
          </div>

          {/* Player info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 36 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: '50%',
              background: `rgba(${gc.rgb}, 0.2)`,
              border: `2px solid ${gc.color}`,
              fontSize: 24, fontWeight: 800, color: '#fff',
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: '#ffffff' }}>{username}</div>
              {opponent && (
                <div style={{ display: 'flex', fontSize: 16, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>vs {opponent}</div>
              )}
            </div>
          </div>

          {/* Detail + Result wrapper */}
          <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', marginTop: 16 }}>
            {/* Detail (hero/side) */}
            {detail && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'rgba(0,0,0,0.35)', borderRadius: '6px',
                padding: '8px 24px',
                borderLeft: `4px solid ${gc.color}`,
              }}>
                <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: gc.color }}>{detail}</div>
              </div>
            )}

            {/* Result + profit */}
            <div style={{
              display: 'flex', flexDirection: 'column', marginTop: detail ? 16 : 0,
              background: 'rgba(0,0,0,0.45)', borderRadius: '8px',
              padding: '16px 24px',
              borderLeft: `4px solid ${resultColor}`,
            }}>
            <div style={{
              display: 'flex', fontSize: 32, fontWeight: 800, color: resultColor,
              letterSpacing: '0.25em',
            }}>
              {won ? 'VICTORY' : 'DEFEAT'}
            </div>
            <div style={{
              display: 'flex', fontSize: 84, fontWeight: 900, color: resultColor,
              lineHeight: 1, letterSpacing: '-0.02em', marginTop: 4,
            }}>
              {profit}
            </div>
          </div>
          </div>

          {/* Spacer */}
          <div style={{ display: 'flex', flex: 1 }} />

          {/* Bottom bar: ref + branding */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20,
          }}>
            <div style={{ display: 'flex', fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.05em' }}>
              raisegg.com
            </div>
            {ref && (
              <div style={{ display: 'flex', fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                Use code: {ref}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
