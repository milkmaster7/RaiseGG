/**
 * lib/social-graphics.ts — Generate shareable marketing images for RaiseGG
 *
 * Uses node-canvas to create OG-sized (1200x630) graphics for
 * tournament announcements, city leaderboards, match results, and weekly stats.
 *
 * Color palette:
 *   Background:  #0b0c1d (deep space)
 *   Primary text: #e0e6ef
 *   Accent cyan:  #00e6ff
 *   Accent purple: #7b61ff
 */

import { createCanvas, CanvasRenderingContext2D } from 'canvas'

// ─── Palette ───────────────────────────────────────────────────────────────

const BG       = '#0b0c1d'
const BG_CARD  = '#151630'
const TEXT      = '#e0e6ef'
const CYAN      = '#00e6ff'
const PURPLE    = '#7b61ff'
const DIM       = '#6b7280'
const WIN_GREEN = '#22c55e'
const LOSS_RED  = '#ef4444'

const W = 1200
const H = 630

// ─── Helpers ───────────────────────────────────────────────────────────────

export function drawBackground(ctx: CanvasRenderingContext2D) {
  // Solid deep-space fill
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // Subtle radial glow top-center (purple)
  const grd = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 500)
  grd.addColorStop(0, 'rgba(123, 97, 255, 0.18)')
  grd.addColorStop(1, 'rgba(123, 97, 255, 0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, W, H)

  // Subtle radial glow bottom-right (cyan)
  const grd2 = ctx.createRadialGradient(W, H, 30, W, H, 400)
  grd2.addColorStop(0, 'rgba(0, 230, 255, 0.10)')
  grd2.addColorStop(1, 'rgba(0, 230, 255, 0)')
  ctx.fillStyle = grd2
  ctx.fillRect(0, 0, W, H)
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  // Divider line
  ctx.strokeStyle = 'rgba(0, 230, 255, 0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, H - 60)
  ctx.lineTo(W - 60, H - 60)
  ctx.stroke()

  // Logo text
  ctx.font = 'bold 20px sans-serif'
  ctx.fillStyle = CYAN
  ctx.textAlign = 'left'
  ctx.fillText('raisegg.com', 60, H - 30)

  // Tagline
  ctx.font = '16px sans-serif'
  ctx.fillStyle = DIM
  ctx.textAlign = 'right'
  ctx.fillText('Stake. Compete. Win.', W - 60, H - 30)
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function truncateText(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '...'
}

// ─── Tournament Graphic ────────────────────────────────────────────────────

export interface TournamentGraphicOpts {
  name: string
  city: string
  game: string
  prize: string
  time: string
  playerCount: number
}

export function generateTournamentGraphic(opts: TournamentGraphicOpts): Buffer {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  drawBackground(ctx)

  // Badge: game type
  ctx.font = 'bold 14px sans-serif'
  const badgeText = opts.game.toUpperCase()
  const badgeW = ctx.measureText(badgeText).width + 24
  drawRoundedRect(ctx, 60, 40, badgeW, 28, 4)
  ctx.fillStyle = PURPLE
  ctx.fill()
  ctx.fillStyle = TEXT
  ctx.textAlign = 'left'
  ctx.fillText(badgeText, 72, 59)

  // City badge
  const cityBadge = opts.city.toUpperCase()
  const cityW = ctx.measureText(cityBadge).width + 24
  drawRoundedRect(ctx, 60 + badgeW + 12, 40, cityW, 28, 4)
  ctx.fillStyle = 'rgba(0, 230, 255, 0.15)'
  ctx.fill()
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = CYAN
  ctx.fillText(cityBadge, 60 + badgeW + 24, 59)

  // Tournament name
  ctx.font = 'bold 48px sans-serif'
  ctx.fillStyle = TEXT
  ctx.textAlign = 'left'
  const displayName = truncateText(ctx, opts.name, W - 120)
  ctx.fillText(displayName, 60, 140)

  // Cyan underline accent
  ctx.fillStyle = CYAN
  ctx.fillRect(60, 155, 80, 3)

  // Info cards row
  const cards = [
    { label: 'PRIZE POOL', value: opts.prize, color: WIN_GREEN },
    { label: 'PLAYERS', value: `${opts.playerCount}`, color: CYAN },
    { label: 'STARTS', value: opts.time, color: PURPLE },
  ]

  const cardW = 320
  const cardH = 140
  const cardY = 200
  const gap = 40
  const startX = 60

  cards.forEach((card, i) => {
    const cx = startX + i * (cardW + gap)
    drawRoundedRect(ctx, cx, cardY, cardW, cardH, 8)
    ctx.fillStyle = BG_CARD
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Label
    ctx.font = 'bold 13px sans-serif'
    ctx.fillStyle = DIM
    ctx.textAlign = 'left'
    ctx.fillText(card.label, cx + 24, cardY + 35)

    // Value
    ctx.font = 'bold 36px sans-serif'
    ctx.fillStyle = card.color
    ctx.fillText(truncateText(ctx, card.value, cardW - 48), cx + 24, cardY + 85)
  })

  // "REGISTER NOW" CTA bar
  const ctaY = cardY + cardH + 40
  drawRoundedRect(ctx, 60, ctaY, W - 120, 50, 8)
  const ctaGrd = ctx.createLinearGradient(60, ctaY, W - 60, ctaY)
  ctaGrd.addColorStop(0, PURPLE)
  ctaGrd.addColorStop(1, CYAN)
  ctx.fillStyle = ctaGrd
  ctx.fill()

  ctx.font = 'bold 20px sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.fillText('REGISTER NOW AT RAISEGG.COM', W / 2, ctaY + 33)

  drawFooter(ctx)

  return canvas.toBuffer('image/png')
}

// ─── City Leaderboard Graphic ──────────────────────────────────────────────

export interface CityLeaderboardOpts {
  cities: Array<{ name: string; flag: string; wins: number }>
  game?: string
}

export function generateCityLeaderboard(opts: CityLeaderboardOpts): Buffer {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  drawBackground(ctx)

  // Title
  ctx.font = 'bold 42px sans-serif'
  ctx.fillStyle = TEXT
  ctx.textAlign = 'center'
  ctx.fillText('City Leaderboard', W / 2, 70)

  // Tagline
  ctx.font = 'bold 22px sans-serif'
  ctx.fillStyle = CYAN
  ctx.fillText(
    `Which city dominates ${opts.game?.toUpperCase() ?? 'CS2'}?`,
    W / 2,
    105
  )

  // Accent line
  ctx.fillStyle = CYAN
  ctx.fillRect(W / 2 - 60, 118, 120, 3)

  // Leaderboard rows
  const top5 = opts.cities.slice(0, 5)
  const rowH = 72
  const rowW = W - 160
  const startY = 145

  top5.forEach((city, i) => {
    const y = startY + i * (rowH + 12)
    const isFirst = i === 0

    // Row background
    drawRoundedRect(ctx, 80, y, rowW, rowH, 8)
    ctx.fillStyle = isFirst ? 'rgba(0, 230, 255, 0.08)' : BG_CARD
    ctx.fill()
    if (isFirst) {
      ctx.strokeStyle = CYAN
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Rank number
    ctx.font = 'bold 28px sans-serif'
    ctx.fillStyle = isFirst ? CYAN : DIM
    ctx.textAlign = 'center'
    ctx.fillText(`#${i + 1}`, 130, y + 46)

    // Flag + city name
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(city.flag, 170, y + 46)

    ctx.font = `bold 24px sans-serif`
    ctx.fillStyle = isFirst ? CYAN : TEXT
    ctx.fillText(city.name, 210, y + 46)

    // Win count
    ctx.font = 'bold 26px sans-serif'
    ctx.fillStyle = WIN_GREEN
    ctx.textAlign = 'right'
    ctx.fillText(`${city.wins} W`, W - 120, y + 46)
  })

  drawFooter(ctx)

  return canvas.toBuffer('image/png')
}

// ─── Match Result Graphic ──────────────────────────────────────────────────

export interface MatchResultOpts {
  playerA: string
  playerB: string
  winner: 'A' | 'B'
  map: string
  score: string
  stakeAmount: string
}

export function generateMatchResult(opts: MatchResultOpts): Buffer {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  drawBackground(ctx)

  // Title
  ctx.font = 'bold 18px sans-serif'
  ctx.fillStyle = DIM
  ctx.textAlign = 'center'
  ctx.fillText('MATCH RESULT', W / 2, 50)

  // Map + score
  ctx.font = 'bold 22px sans-serif'
  ctx.fillStyle = CYAN
  ctx.fillText(`${opts.map}  —  ${opts.score}`, W / 2, 85)

  // VS divider
  const vsY = 260
  ctx.font = 'bold 60px sans-serif'
  ctx.fillStyle = 'rgba(123, 97, 255, 0.4)'
  ctx.textAlign = 'center'
  ctx.fillText('VS', W / 2, vsY + 20)

  // Player cards
  const cardW2 = 420
  const cardH2 = 260
  const cardY2 = 120

  // Player A (left)
  const aIsWinner = opts.winner === 'A'
  const leftX = 60
  drawRoundedRect(ctx, leftX, cardY2, cardW2, cardH2, 12)
  ctx.fillStyle = BG_CARD
  ctx.fill()
  if (aIsWinner) {
    ctx.strokeStyle = WIN_GREEN
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = aIsWinner ? WIN_GREEN : TEXT
  ctx.textAlign = 'center'
  ctx.fillText(truncateText(ctx, opts.playerA, cardW2 - 40), leftX + cardW2 / 2, cardY2 + 100)

  if (aIsWinner) {
    ctx.font = 'bold 18px sans-serif'
    ctx.fillStyle = WIN_GREEN
    ctx.fillText('WINNER', leftX + cardW2 / 2, cardY2 + 140)
  }

  // Player B (right)
  const bIsWinner = opts.winner === 'B'
  const rightX = W - 60 - cardW2
  drawRoundedRect(ctx, rightX, cardY2, cardW2, cardH2, 12)
  ctx.fillStyle = BG_CARD
  ctx.fill()
  if (bIsWinner) {
    ctx.strokeStyle = WIN_GREEN
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = bIsWinner ? WIN_GREEN : TEXT
  ctx.textAlign = 'center'
  ctx.fillText(truncateText(ctx, opts.playerB, cardW2 - 40), rightX + cardW2 / 2, cardY2 + 100)

  if (bIsWinner) {
    ctx.font = 'bold 18px sans-serif'
    ctx.fillStyle = WIN_GREEN
    ctx.fillText('WINNER', rightX + cardW2 / 2, cardY2 + 140)
  }

  // Stake info bar
  const stakeY = cardY2 + cardH2 + 30
  drawRoundedRect(ctx, 200, stakeY, W - 400, 60, 8)
  const stakeGrd = ctx.createLinearGradient(200, stakeY, W - 200, stakeY)
  stakeGrd.addColorStop(0, 'rgba(123, 97, 255, 0.2)')
  stakeGrd.addColorStop(1, 'rgba(0, 230, 255, 0.2)')
  ctx.fillStyle = stakeGrd
  ctx.fill()

  ctx.font = 'bold 22px sans-serif'
  ctx.fillStyle = CYAN
  ctx.textAlign = 'center'
  ctx.fillText(`STAKE: ${opts.stakeAmount}`, W / 2, stakeY + 38)

  drawFooter(ctx)

  return canvas.toBuffer('image/png')
}

// ─── Weekly Stats Graphic ──────────────────────────────────────────────────

export interface WeeklyStatsOpts {
  totalMatches: number
  totalPrizeMoney: string
  topPlayer: string
  topCity: string
  weekLabel?: string
}

export function generateWeeklyStats(opts: WeeklyStatsOpts): Buffer {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  drawBackground(ctx)

  // Title
  ctx.font = 'bold 40px sans-serif'
  ctx.fillStyle = TEXT
  ctx.textAlign = 'center'
  ctx.fillText('Weekly Recap', W / 2, 65)

  // Week label
  ctx.font = '20px sans-serif'
  ctx.fillStyle = CYAN
  ctx.fillText(opts.weekLabel ?? 'This Week on RaiseGG', W / 2, 100)

  // Accent line
  ctx.fillStyle = PURPLE
  ctx.fillRect(W / 2 - 50, 115, 100, 3)

  // Stats grid (2x2)
  const stats = [
    { label: 'TOTAL MATCHES', value: `${opts.totalMatches}`, color: CYAN },
    { label: 'PRIZE MONEY', value: opts.totalPrizeMoney, color: WIN_GREEN },
    { label: 'TOP PLAYER', value: opts.topPlayer, color: PURPLE },
    { label: 'TOP CITY', value: opts.topCity, color: CYAN },
  ]

  const gridW = 480
  const gridH = 150
  const gapX = 40
  const gapY = 20
  const gridStartX = (W - gridW * 2 - gapX) / 2
  const gridStartY = 145

  stats.forEach((stat, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = gridStartX + col * (gridW + gapX)
    const y = gridStartY + row * (gridH + gapY)

    drawRoundedRect(ctx, x, y, gridW, gridH, 10)
    ctx.fillStyle = BG_CARD
    ctx.fill()

    // Subtle left accent bar
    ctx.fillStyle = stat.color
    ctx.fillRect(x, y + 20, 4, gridH - 40)

    // Label
    ctx.font = 'bold 14px sans-serif'
    ctx.fillStyle = DIM
    ctx.textAlign = 'left'
    ctx.fillText(stat.label, x + 28, y + 45)

    // Value
    ctx.font = 'bold 38px sans-serif'
    ctx.fillStyle = stat.color
    ctx.fillText(truncateText(ctx, stat.value, gridW - 56), x + 28, y + 100)
  })

  drawFooter(ctx)

  return canvas.toBuffer('image/png')
}
