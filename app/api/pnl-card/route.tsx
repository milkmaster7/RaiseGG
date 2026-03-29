import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

/* ─── CS2 Card ─────────────────────────────────────────────────────────────── */
function CS2Card({ username, opponent, stake, payout, elo, won }: CardProps) {
  const accent = won ? '#59BF40' : '#C44848'
  const label = won ? 'VICTORY' : 'DEFEAT'
  const statColor = won ? '#A3CF06' : '#C44848'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0A0D12', fontFamily: 'sans-serif' }}>
      {/* Signature CS2 blue gradient bar */}
      <div style={{ display: 'flex', width: '100%', height: 4, background: 'linear-gradient(90deg, #06BFFF 0%, #2D73FF 100%)' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 800, color: '#06BFFF', letterSpacing: '0.15em' }}>RAISEGG</div>
          <div style={{ display: 'flex', fontSize: 12, color: '#3d4450', letterSpacing: '0.2em', fontWeight: 600 }}>MATCH RESULT</div>
        </div>
        <div style={{ display: 'flex', padding: '5px 16px', border: '1px solid #06BFFF', borderRadius: '2px', fontSize: 11, fontWeight: 700, color: '#06BFFF', letterSpacing: '0.2em' }}>
          COUNTER-STRIKE 2
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, padding: '0 48px', alignItems: 'center' }}>
        {/* Left: Result */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
          <div style={{ display: 'flex', fontSize: 14, color: '#8B929A', letterSpacing: '0.3em', fontWeight: 600 }}>MATCH RESULT</div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, color: accent, letterSpacing: '0.05em', lineHeight: 1.1 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 16 }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#FFFFFFEE', letterSpacing: '0.05em' }}>{username}</div>
            <div style={{ display: 'flex', fontSize: 16, color: '#3d4450', fontWeight: 600 }}>VS</div>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#67707B', letterSpacing: '0.05em' }}>{opponent}</div>
          </div>
        </div>

        {/* Right: Stats glass panel */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '20px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid #32353c', borderRadius: '2px',
          padding: '28px 40px', minWidth: 280,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 11, color: '#8B929A', letterSpacing: '0.2em', fontWeight: 600 }}>STAKE</div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: '#FFFFFFEE' }}>${stake}</div>
          </div>
          <div style={{ display: 'flex', width: '100%', height: 1, background: '#32353c' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 11, color: '#8B929A', letterSpacing: '0.2em', fontWeight: 600 }}>{won ? 'PAYOUT' : 'LOST'}</div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: statColor }}>{won ? '+' : '-'}${won ? payout : stake}</div>
          </div>
          <div style={{ display: 'flex', width: '100%', height: 1, background: '#32353c' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 11, color: '#8B929A', letterSpacing: '0.2em', fontWeight: 600 }}>ELO</div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: statColor }}>{elo}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px', borderTop: '1px solid #1e202f' }}>
        <div style={{ display: 'flex', fontSize: 12, color: '#3d4450', letterSpacing: '0.1em' }}>raisegg.com</div>
        <div style={{ display: 'flex', fontSize: 12, color: '#3d4450', letterSpacing: '0.15em' }}>STAKE · PLAY · WIN</div>
      </div>
    </div>
  )
}

/* ─── DOTA 2 Card ──────────────────────────────────────────────────────────── */
function Dota2Card({ username, opponent, stake, payout, elo, won }: CardProps) {
  const accent = won ? '#59BF40' : '#FF6046'
  const label = won ? 'VICTORY' : 'DEFEAT'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#000000', fontFamily: 'serif' }}>
      {/* Gold divider top */}
      <div style={{ display: 'flex', width: '100%', height: 2, background: 'linear-gradient(90deg, transparent 0%, #E4C269 50%, transparent 100%)' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px 0' }}>
        <div style={{ display: 'flex', fontSize: 20, fontWeight: 800, color: '#F8E8B9', letterSpacing: '0.2em' }}>RAISEGG</div>
        <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: '#AB8C3B', letterSpacing: '0.25em' }}>DOTA 2</div>
      </div>

      {/* Gold divider */}
      <div style={{ display: 'flex', margin: '16px 48px', height: 1, background: 'linear-gradient(90deg, transparent 0%, #4F3612 30%, #AB8C3B 50%, #4F3612 70%, transparent 100%)' }} />

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 48px', gap: '6px' }}>
        <div style={{ display: 'flex', fontSize: 13, color: '#67707B', letterSpacing: '0.35em', fontWeight: 600 }}>MATCH RESULT</div>
        <div style={{ display: 'flex', fontSize: 68, fontWeight: 900, color: accent, letterSpacing: '0.08em', lineHeight: 1.1 }}>{label}</div>

        {/* Gold ornamental divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
          <div style={{ display: 'flex', width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #E4C269)' }} />
          <div style={{ display: 'flex', width: 8, height: 8, background: '#E4C269', transform: 'rotate(45deg)' }} />
          <div style={{ display: 'flex', width: 80, height: 1, background: 'linear-gradient(90deg, #E4C269, transparent)' }} />
        </div>

        {/* Players */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#F8E8B9', letterSpacing: '0.08em' }}>{username}</div>
          <div style={{ display: 'flex', fontSize: 16, color: '#4F3612', fontWeight: 600 }}>VS</div>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#67707B', letterSpacing: '0.08em' }}>{opponent}</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '48px', padding: '20px 48px', border: '1px solid #2D2D33', borderRadius: '3px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', fontSize: 11, color: '#AB8C3B', letterSpacing: '0.2em', fontWeight: 600 }}>STAKE</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: '#F8E8B9' }}>${stake}</div>
          </div>
          <div style={{ display: 'flex', width: 1, background: 'linear-gradient(180deg, transparent, #4F3612, transparent)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', fontSize: 11, color: '#AB8C3B', letterSpacing: '0.2em', fontWeight: 600 }}>{won ? 'PAYOUT' : 'LOST'}</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: accent }}>{won ? '+' : '-'}${won ? payout : stake}</div>
          </div>
          <div style={{ display: 'flex', width: 1, background: 'linear-gradient(180deg, transparent, #4F3612, transparent)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', fontSize: 11, color: '#AB8C3B', letterSpacing: '0.2em', fontWeight: 600 }}>ELO</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: accent }}>{elo}</div>
          </div>
        </div>
      </div>

      {/* Gold divider bottom */}
      <div style={{ display: 'flex', margin: '0 48px 12px', height: 1, background: 'linear-gradient(90deg, transparent 0%, #4F3612 30%, #AB8C3B 50%, #4F3612 70%, transparent 100%)' }} />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px 20px' }}>
        <div style={{ display: 'flex', fontSize: 12, color: '#785F2F', letterSpacing: '0.1em' }}>raisegg.com</div>
        <div style={{ display: 'flex', fontSize: 12, color: '#785F2F', letterSpacing: '0.15em' }}>STAKE · PLAY · WIN</div>
      </div>

      {/* Gold divider bottom edge */}
      <div style={{ display: 'flex', width: '100%', height: 2, background: 'linear-gradient(90deg, transparent 0%, #E4C269 50%, transparent 100%)' }} />
    </div>
  )
}

/* ─── DEADLOCK Card ────────────────────────────────────────────────────────── */
function DeadlockCard({ username, opponent, stake, payout, elo, won }: CardProps) {
  const accent = won ? '#4ADE80' : '#EF4444'
  const label = won ? 'VICTORY' : 'DEFEAT'
  const gold = '#F5A623'
  const darkGold = '#8B7332'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#000000', fontFamily: 'sans-serif', position: 'relative' }}>
      {/* Corner ornaments - Art Deco */}
      <div style={{ display: 'flex', position: 'absolute', top: 12, left: 12, width: 24, height: 24, borderTop: `2px solid ${gold}`, borderLeft: `2px solid ${gold}` }} />
      <div style={{ display: 'flex', position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderTop: `2px solid ${gold}`, borderRight: `2px solid ${gold}` }} />
      <div style={{ display: 'flex', position: 'absolute', bottom: 12, left: 12, width: 24, height: 24, borderBottom: `2px solid ${gold}`, borderLeft: `2px solid ${gold}` }} />
      <div style={{ display: 'flex', position: 'absolute', bottom: 12, right: 12, width: 24, height: 24, borderBottom: `2px solid ${gold}`, borderRight: `2px solid ${gold}` }} />

      {/* Top amber line */}
      <div style={{ display: 'flex', margin: '20px 48px 0', height: 1, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px 0' }}>
        <div style={{ display: 'flex', fontSize: 20, fontWeight: 800, color: gold, letterSpacing: '0.2em' }}>RAISEGG</div>
        <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: gold, letterSpacing: '0.3em' }}>DEADLOCK</div>
      </div>

      {/* Art Deco divider with diamond */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '16px 48px' }}>
        <div style={{ display: 'flex', flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${darkGold})` }} />
        <div style={{ display: 'flex', width: 6, height: 6, background: gold, transform: 'rotate(45deg)' }} />
        <div style={{ display: 'flex', width: 12, height: 12, border: `1px solid ${gold}`, transform: 'rotate(45deg)' }} />
        <div style={{ display: 'flex', width: 6, height: 6, background: gold, transform: 'rotate(45deg)' }} />
        <div style={{ display: 'flex', flex: 1, height: 1, background: `linear-gradient(90deg, ${darkGold}, transparent)` }} />
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 48px', gap: '4px' }}>
        <div style={{ display: 'flex', fontSize: 12, color: '#666666', letterSpacing: '0.4em', fontWeight: 600 }}>MATCH RESULT</div>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, color: won ? gold : '#EF4444', letterSpacing: '0.06em', lineHeight: 1.1 }}>{label}</div>

        {/* Players */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.06em' }}>{username}</div>
          <div style={{ display: 'flex', fontSize: 16, color: darkGold, fontWeight: 600 }}>VS</div>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#666666', letterSpacing: '0.06em' }}>{opponent}</div>
        </div>

        {/* Stats with Art Deco borders */}
        <div style={{
          display: 'flex', gap: '40px', padding: '22px 48px',
          border: `1px solid ${darkGold}`, borderRadius: '0px',
          background: 'rgba(245,166,35,0.03)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', fontSize: 10, color: darkGold, letterSpacing: '0.25em', fontWeight: 600 }}>STAKE</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: '#FFFFFF' }}>${stake}</div>
          </div>
          <div style={{ display: 'flex', width: 1, background: `linear-gradient(180deg, transparent, ${darkGold}, transparent)` }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', fontSize: 10, color: darkGold, letterSpacing: '0.25em', fontWeight: 600 }}>{won ? 'PAYOUT' : 'LOST'}</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: accent }}>{won ? '+' : '-'}${won ? payout : stake}</div>
          </div>
          <div style={{ display: 'flex', width: 1, background: `linear-gradient(180deg, transparent, ${darkGold}, transparent)` }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', fontSize: 10, color: darkGold, letterSpacing: '0.25em', fontWeight: 600 }}>ELO</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: accent }}>{elo}</div>
          </div>
        </div>
      </div>

      {/* Art Deco divider bottom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 48px 12px' }}>
        <div style={{ display: 'flex', flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${darkGold})` }} />
        <div style={{ display: 'flex', width: 6, height: 6, background: gold, transform: 'rotate(45deg)' }} />
        <div style={{ display: 'flex', flex: 1, height: 1, background: `linear-gradient(90deg, ${darkGold}, transparent)` }} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px 16px' }}>
        <div style={{ display: 'flex', fontSize: 12, color: darkGold, letterSpacing: '0.1em' }}>raisegg.com</div>
        <div style={{ display: 'flex', fontSize: 12, color: darkGold, letterSpacing: '0.15em' }}>STAKE · PLAY · WIN</div>
      </div>

      {/* Bottom amber line */}
      <div style={{ display: 'flex', margin: '0 48px 20px', height: 1, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />
    </div>
  )
}

/* ─── Route Handler ────────────────────────────────────────────────────────── */

interface CardProps {
  username: string; opponent: string; stake: string; payout: string; elo: string; won: boolean
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const username = searchParams.get('username') ?? 'Player'
  const opponent = searchParams.get('opponent') ?? 'Opponent'
  const game     = (searchParams.get('game') ?? 'cs2').toLowerCase()
  const result   = searchParams.get('result') ?? 'win'
  const payout   = searchParams.get('payout') ?? '0.00'
  const elo      = searchParams.get('elo') ?? '+0'
  const stake    = searchParams.get('stake') ?? '0.00'
  const won      = result === 'win'

  const props: CardProps = { username, opponent, stake, payout, elo, won }

  const card = game === 'dota2' ? Dota2Card(props)
    : game === 'deadlock' ? DeadlockCard(props)
    : CS2Card(props)

  return new ImageResponse(card, { width: 1200, height: 630 })
}
