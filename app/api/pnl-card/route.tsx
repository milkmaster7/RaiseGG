import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

/*
  /api/pnl-card?username=NiKo&game=cs2&result=win&payout=45.00&stake=25.00&elo=+28
  Optional: &side=ct|t  &hero=axe  &character=haze  &opponent=s1mple
*/

const GAME: Record<string, { label: string; color: string; rgb: string; winColor: string; lossColor: string }> = {
  cs2:      { label: 'COUNTER-STRIKE 2', color: '#06BFFF', rgb: '6,191,255',   winColor: '#59BF40', lossColor: '#C44848' },
  dota2:    { label: 'DOTA 2',           color: '#E23D28', rgb: '226,61,40',    winColor: '#59BF40', lossColor: '#FF6046' },
  deadlock: { label: 'DEADLOCK',         color: '#F5A623', rgb: '245,166,35',   winColor: '#4ADE80', lossColor: '#EF4444' },
}

function getHeroImg(game: string, params: URLSearchParams): string | null {
  if (game === 'dota2') {
    const hero = params.get('hero')?.toLowerCase().replace(/\s+/g, '_')
    if (hero) return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${hero}.png`
  }
  if (game === 'deadlock') {
    const char = params.get('character')?.toLowerCase().replace(/\s+/g, '_')
    if (char) return `https://cdn.akamai.steamstatic.com/apps/deadlock/images/react/oldgods/splash_${char}.png`
  }
  return null
}

function getDetail(game: string, params: URLSearchParams): string {
  if (game === 'cs2') {
    const side = params.get('side')?.toLowerCase()
    if (side === 'ct') return 'Counter-Terrorist'
    if (side === 't') return 'Terrorist'
    return ''
  }
  if (game === 'dota2') return params.get('hero') ?? ''
  if (game === 'deadlock') return params.get('character') ?? ''
  return ''
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const username = p.get('username') ?? 'Player'
  const opponent = p.get('opponent') ?? ''
  const game     = (p.get('game') ?? 'cs2').toLowerCase()
  const result   = p.get('result') ?? 'win'
  const payout   = p.get('payout') ?? '0.00'
  const elo      = p.get('elo') ?? '+0'
  const stake    = p.get('stake') ?? '0.00'
  const won      = result === 'win'
  const detail   = getDetail(game, p)
  const heroImg  = getHeroImg(game, p)

  const gc = GAME[game] ?? GAME.cs2
  const resultColor = won ? gc.winColor : gc.lossColor
  const payoutSign  = won ? '+' : '-'
  const payoutVal   = won ? payout : stake

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', width: '100%', height: '100%',
        background: '#0a0a0a', fontFamily: 'sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* ── Game color overlay wash (right side) ── */}
        <div style={{
          display: 'flex', position: 'absolute', top: 0, right: 0, bottom: 0,
          width: '55%',
          background: `linear-gradient(135deg, transparent 0%, rgba(${gc.rgb}, 0.06) 40%, rgba(${gc.rgb}, 0.15) 100%)`,
        }} />

        {/* Diagonal accent glow */}
        <div style={{
          display: 'flex', position: 'absolute', top: -200, right: -100,
          width: 600, height: 600, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${gc.rgb}, 0.18) 0%, transparent 65%)`,
        }} />

        {/* Bottom accent glow */}
        <div style={{
          display: 'flex', position: 'absolute', bottom: -100, right: 100,
          width: 400, height: 400, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${gc.rgb}, 0.10) 0%, transparent 65%)`,
        }} />

        {/* ── Hero/character image (right side) ── */}
        {heroImg && (
          <div style={{
            display: 'flex', position: 'absolute', right: 20, bottom: 0,
            width: 380, height: 500, alignItems: 'flex-end', justifyContent: 'center',
            opacity: 0.7,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImg}
              width={360}
              height={480}
              style={{ objectFit: 'contain', objectPosition: 'bottom' }}
            />
          </div>
        )}

        {/* Gradient fade over hero to keep text readable */}
        {heroImg && (
          <div style={{
            display: 'flex', position: 'absolute', top: 0, right: 0, bottom: 0,
            width: '50%',
            background: 'linear-gradient(90deg, #0a0a0a 0%, transparent 60%)',
          }} />
        )}

        {/* ── Content (left-aligned) ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', padding: '40px 48px',
          position: 'relative', width: '100%', height: '100%',
        }}>

          {/* Top row: Logo + Game badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '0.06em' }}>
              RaiseGG
            </div>
            <div style={{
              display: 'flex', padding: '5px 16px', borderRadius: '4px',
              background: `rgba(${gc.rgb}, 0.15)`, border: `1px solid ${gc.color}60`,
              fontSize: 12, fontWeight: 700, color: gc.color, letterSpacing: '0.18em',
            }}>
              {gc.label}
            </div>
          </div>

          {/* Username + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 52, height: 52, borderRadius: '50%',
              background: `linear-gradient(135deg, ${gc.color}50, ${gc.color}15)`,
              border: `2px solid ${gc.color}80`,
              fontSize: 22, fontWeight: 800, color: gc.color,
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: '#fff' }}>{username}</div>
              {opponent && (
                <div style={{ display: 'flex', fontSize: 14, color: '#555' }}>vs {opponent}</div>
              )}
            </div>
          </div>

          {/* Game detail (hero name / side) */}
          {detail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 20 }}>
              <div style={{ display: 'flex', width: 3, height: 18, background: gc.color, borderRadius: '2px' }} />
              <div style={{ display: 'flex', fontSize: 18, fontWeight: 600, color: gc.color, letterSpacing: '0.04em' }}>
                {detail}
              </div>
            </div>
          )}

          {/* Big payout number */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: detail ? 24 : 36, gap: '2px' }}>
            <div style={{ display: 'flex', fontSize: 15, color: resultColor, letterSpacing: '0.2em', fontWeight: 700 }}>
              {won ? 'VICTORY' : 'DEFEAT'}
            </div>
            <div style={{
              display: 'flex', fontSize: 80, fontWeight: 900, color: resultColor,
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {payoutSign}${payoutVal}
            </div>
          </div>

          {/* Spacer */}
          <div style={{ display: 'flex', flex: 1 }} />

          {/* Bottom stats */}
          <div style={{ display: 'flex', gap: '48px', borderTop: '1px solid #1a1a1a', paddingTop: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', fontSize: 11, color: '#444', letterSpacing: '0.12em', fontWeight: 600 }}>STAKE</div>
              <div style={{ display: 'flex', fontSize: 20, color: '#888', fontWeight: 700 }}>${stake}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', fontSize: 11, color: '#444', letterSpacing: '0.12em', fontWeight: 600 }}>PAYOUT</div>
              <div style={{ display: 'flex', fontSize: 20, color: resultColor, fontWeight: 700 }}>{payoutSign}${payoutVal}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', fontSize: 11, color: '#444', letterSpacing: '0.12em', fontWeight: 600 }}>ELO</div>
              <div style={{ display: 'flex', fontSize: 20, color: resultColor, fontWeight: 700 }}>{elo}</div>
            </div>
            <div style={{ display: 'flex', flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', fontSize: 14, color: '#2a2a2a', fontWeight: 600, letterSpacing: '0.05em' }}>raisegg.com</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
