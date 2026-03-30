/**
 * lib/win-card.ts — Generate premium "Proof of Win" shareable image cards
 *
 * 1080x1080 Instagram-ready PNG showing match victory details
 * with on-chain verification badge and RaiseGG branding.
 */

import { createCanvas, CanvasRenderingContext2D } from 'canvas'
import type { Game } from '@/types'

// ─── Palette (matches social-graphics.ts) ─────────────────────────────────

const BG       = '#0b0c1d'
const BG_CARD  = '#151630'
const TEXT      = '#e0e6ef'
const CYAN      = '#00e6ff'
const PURPLE    = '#7b61ff'
const DIM       = '#6b7280'
const WIN_GREEN = '#22c55e'

const SIZE = 1080

// ─── Shared helpers (mirroring social-graphics.ts) ────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Purple glow top-center
  const grd = ctx.createRadialGradient(SIZE / 2, 0, 50, SIZE / 2, 0, 600)
  grd.addColorStop(0, 'rgba(123, 97, 255, 0.22)')
  grd.addColorStop(1, 'rgba(123, 97, 255, 0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Cyan glow bottom-right
  const grd2 = ctx.createRadialGradient(SIZE, SIZE, 30, SIZE, SIZE, 500)
  grd2.addColorStop(0, 'rgba(0, 230, 255, 0.12)')
  grd2.addColorStop(1, 'rgba(0, 230, 255, 0)')
  ctx.fillStyle = grd2
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Win-green glow center (celebration effect)
  const grd3 = ctx.createRadialGradient(SIZE / 2, SIZE / 2 - 60, 20, SIZE / 2, SIZE / 2 - 60, 350)
  grd3.addColorStop(0, 'rgba(34, 197, 94, 0.08)')
  grd3.addColorStop(1, 'rgba(34, 197, 94, 0)')
  ctx.fillStyle = grd3
  ctx.fillRect(0, 0, SIZE, SIZE)
}

function drawGridLines(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)'
  ctx.lineWidth = 1

  // Vertical grid lines
  for (let x = 0; x <= SIZE; x += 60) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, SIZE)
    ctx.stroke()
  }

  // Horizontal grid lines
  for (let y = 0; y <= SIZE; y += 60) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(SIZE, y)
    ctx.stroke()
  }
}

function drawRoundedRect(
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

function truncateText(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '...'
}

function gameLabel(game: Game): string {
  switch (game) {
    case 'cs2':      return 'CS2'
    case 'dota2':    return 'DOTA 2'
    case 'deadlock': return 'DEADLOCK'
    default:         return (game as string).toUpperCase()
  }
}

// ─── Win Card Generator ───────────────────────────────────────────────────

export interface WinCardOpts {
  playerName: string
  city: string
  score: string          // e.g. "16-12"
  amountWon: string      // e.g. "$5.00 USDC"
  game: Game
  date: string           // e.g. "Mar 30, 2026"
  matchId: string        // unique match ID for verification
}

export function generateWinCard(opts: WinCardOpts): Buffer {
  const canvas = createCanvas(SIZE, SIZE)
  const ctx = canvas.getContext('2d')

  // ── Background + grid ───────────────────────────────────────────────
  drawBackground(ctx)
  drawGridLines(ctx)

  // ── Top section: "PROOF OF WIN" header ──────────────────────────────
  ctx.font = 'bold 16px sans-serif'
  ctx.fillStyle = DIM
  ctx.textAlign = 'center'
  ctx.fillText('P R O O F   O F   W I N', SIZE / 2, 70)

  // Accent line under header
  const lineGrd = ctx.createLinearGradient(SIZE / 2 - 120, 85, SIZE / 2 + 120, 85)
  lineGrd.addColorStop(0, 'rgba(0, 230, 255, 0)')
  lineGrd.addColorStop(0.5, CYAN)
  lineGrd.addColorStop(1, 'rgba(0, 230, 255, 0)')
  ctx.fillStyle = lineGrd
  ctx.fillRect(SIZE / 2 - 120, 85, 240, 2)

  // ── Game badge + City badge ─────────────────────────────────────────
  const badgeY = 115
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'left'

  // Game badge (purple fill)
  const gameText = gameLabel(opts.game)
  const gameW = ctx.measureText(gameText).width + 28
  const badgeStartX = SIZE / 2 - (gameW + 16 + ctx.measureText(opts.city.toUpperCase()).width + 28) / 2

  drawRoundedRect(ctx, badgeStartX, badgeY, gameW, 32, 4)
  ctx.fillStyle = PURPLE
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(gameText, badgeStartX + 14, badgeY + 22)

  // City badge (cyan outline)
  const cityText = opts.city.toUpperCase()
  const cityW = ctx.measureText(cityText).width + 28
  const cityX = badgeStartX + gameW + 16

  drawRoundedRect(ctx, cityX, badgeY, cityW, 32, 4)
  ctx.fillStyle = 'rgba(0, 230, 255, 0.1)'
  ctx.fill()
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = CYAN
  ctx.fillText(cityText, cityX + 14, badgeY + 22)

  // ── Player name ─────────────────────────────────────────────────────
  ctx.font = 'bold 52px sans-serif'
  ctx.fillStyle = TEXT
  ctx.textAlign = 'center'
  const displayName = truncateText(ctx, opts.playerName, SIZE - 160)
  ctx.fillText(displayName, SIZE / 2, 220)

  // Glow effect behind player name
  ctx.save()
  ctx.shadowColor = CYAN
  ctx.shadowBlur = 30
  ctx.globalAlpha = 0.15
  ctx.fillText(displayName, SIZE / 2, 220)
  ctx.restore()

  // "VICTORY" subtitle
  ctx.font = 'bold 20px sans-serif'
  ctx.fillStyle = WIN_GREEN
  ctx.fillText('V I C T O R Y', SIZE / 2, 258)

  // ── Main amount won — BIG and bold ──────────────────────────────────
  const amountY = 430

  // Glow circle behind amount
  const amtGlow = ctx.createRadialGradient(SIZE / 2, amountY - 20, 10, SIZE / 2, amountY - 20, 200)
  amtGlow.addColorStop(0, 'rgba(34, 197, 94, 0.15)')
  amtGlow.addColorStop(1, 'rgba(34, 197, 94, 0)')
  ctx.fillStyle = amtGlow
  ctx.fillRect(0, amountY - 200, SIZE, 400)

  // Amount text with green glow
  ctx.save()
  ctx.font = 'bold 96px sans-serif'
  ctx.fillStyle = WIN_GREEN
  ctx.textAlign = 'center'
  ctx.shadowColor = WIN_GREEN
  ctx.shadowBlur = 40
  ctx.fillText(opts.amountWon, SIZE / 2, amountY)
  ctx.restore()

  // Second pass without shadow for crisp text
  ctx.font = 'bold 96px sans-serif'
  ctx.fillStyle = WIN_GREEN
  ctx.textAlign = 'center'
  ctx.fillText(opts.amountWon, SIZE / 2, amountY)

  // "WON" label above amount
  ctx.font = 'bold 18px sans-serif'
  ctx.fillStyle = DIM
  ctx.fillText('AMOUNT WON', SIZE / 2, amountY - 80)

  // ── Score card ──────────────────────────────────────────────────────
  const scoreCardY = 500
  const scoreCardW = 280
  const scoreCardH = 100
  const scoreCardX = SIZE / 2 - scoreCardW / 2

  drawRoundedRect(ctx, scoreCardX, scoreCardY, scoreCardW, scoreCardH, 12)
  ctx.fillStyle = BG_CARD
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 230, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Score label
  ctx.font = 'bold 14px sans-serif'
  ctx.fillStyle = DIM
  ctx.textAlign = 'center'
  ctx.fillText('MATCH SCORE', SIZE / 2, scoreCardY + 30)

  // Score value
  ctx.font = 'bold 44px sans-serif'
  ctx.fillStyle = CYAN
  ctx.fillText(opts.score, SIZE / 2, scoreCardY + 78)

  // ── Info row: Date + Match ID ───────────────────────────────────────
  const infoY = 660
  const infoCardW = 440
  const infoCardH = 90
  const infoGap = 40
  const infoStartX = (SIZE - infoCardW * 2 - infoGap) / 2

  // Date card
  drawRoundedRect(ctx, infoStartX, infoY, infoCardW, infoCardH, 8)
  ctx.fillStyle = BG_CARD
  ctx.fill()

  // Left accent bar
  ctx.fillStyle = PURPLE
  ctx.fillRect(infoStartX, infoY + 15, 3, infoCardH - 30)

  ctx.font = 'bold 13px sans-serif'
  ctx.fillStyle = DIM
  ctx.textAlign = 'left'
  ctx.fillText('DATE', infoStartX + 24, infoY + 35)

  ctx.font = 'bold 24px sans-serif'
  ctx.fillStyle = TEXT
  ctx.fillText(opts.date, infoStartX + 24, infoY + 68)

  // Match ID card
  const matchIdX = infoStartX + infoCardW + infoGap
  drawRoundedRect(ctx, matchIdX, infoY, infoCardW, infoCardH, 8)
  ctx.fillStyle = BG_CARD
  ctx.fill()

  // Left accent bar
  ctx.fillStyle = CYAN
  ctx.fillRect(matchIdX, infoY + 15, 3, infoCardH - 30)

  ctx.font = 'bold 13px sans-serif'
  ctx.fillStyle = DIM
  ctx.textAlign = 'left'
  ctx.fillText('MATCH ID', matchIdX + 24, infoY + 35)

  ctx.font = 'bold 20px sans-serif'
  ctx.fillStyle = CYAN
  const truncatedId = truncateText(ctx, opts.matchId, infoCardW - 48)
  ctx.fillText(truncatedId, matchIdX + 24, infoY + 68)

  // ── Verified on-chain badge ─────────────────────────────────────────
  const badgeBoxY = 800
  const badgeBoxW = 340
  const badgeBoxH = 48
  const badgeBoxX = SIZE / 2 - badgeBoxW / 2

  drawRoundedRect(ctx, badgeBoxX, badgeBoxY, badgeBoxW, badgeBoxH, 24)

  // Gradient border
  const verifyGrd = ctx.createLinearGradient(badgeBoxX, badgeBoxY, badgeBoxX + badgeBoxW, badgeBoxY)
  verifyGrd.addColorStop(0, 'rgba(0, 230, 255, 0.2)')
  verifyGrd.addColorStop(1, 'rgba(123, 97, 255, 0.2)')
  ctx.fillStyle = verifyGrd
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 230, 255, 0.4)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Checkmark circle
  const checkX = badgeBoxX + 28
  const checkY = badgeBoxY + badgeBoxH / 2
  ctx.beginPath()
  ctx.arc(checkX, checkY, 10, 0, Math.PI * 2)
  ctx.fillStyle = WIN_GREEN
  ctx.fill()

  // Checkmark icon
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(checkX - 4, checkY)
  ctx.lineTo(checkX - 1, checkY + 3)
  ctx.lineTo(checkX + 5, checkY - 4)
  ctx.stroke()

  // Badge text
  ctx.font = 'bold 16px sans-serif'
  ctx.fillStyle = TEXT
  ctx.textAlign = 'left'
  ctx.fillText('Verified on-chain', checkX + 20, badgeBoxY + 31)

  // Solana indicator
  ctx.font = '13px sans-serif'
  ctx.fillStyle = DIM
  ctx.textAlign = 'right'
  ctx.fillText('SOLANA', badgeBoxX + badgeBoxW - 20, badgeBoxY + 31)

  // ── Footer: branding ────────────────────────────────────────────────
  // Divider
  const dividerGrd = ctx.createLinearGradient(80, 900, SIZE - 80, 900)
  dividerGrd.addColorStop(0, 'rgba(0, 230, 255, 0)')
  dividerGrd.addColorStop(0.3, 'rgba(0, 230, 255, 0.25)')
  dividerGrd.addColorStop(0.7, 'rgba(0, 230, 255, 0.25)')
  dividerGrd.addColorStop(1, 'rgba(0, 230, 255, 0)')
  ctx.fillStyle = dividerGrd
  ctx.fillRect(80, 900, SIZE - 160, 1)

  // RaiseGG branding
  ctx.font = 'bold 36px sans-serif'
  ctx.textAlign = 'center'

  // "RAISE" in cyan, "GG" in purple
  const raiseW = ctx.measureText('RAISE').width
  const ggW = ctx.measureText('GG').width
  const totalBrandW = raiseW + ggW
  const brandStartX = SIZE / 2 - totalBrandW / 2

  ctx.textAlign = 'left'
  ctx.fillStyle = CYAN
  ctx.fillText('RAISE', brandStartX, 955)
  ctx.fillStyle = PURPLE
  ctx.fillText('GG', brandStartX + raiseW, 955)

  // URL
  ctx.font = '18px sans-serif'
  ctx.fillStyle = DIM
  ctx.textAlign = 'center'
  ctx.fillText('raisegg.com', SIZE / 2, 990)

  // Tagline
  ctx.font = 'bold 14px sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.fillText('Stake. Compete. Win.', SIZE / 2, 1020)

  // ── Corner accents (decorative L-shaped corners) ────────────────────
  const cornerLen = 30
  const cornerInset = 40
  ctx.strokeStyle = 'rgba(0, 230, 255, 0.2)'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'

  // Top-left
  ctx.beginPath()
  ctx.moveTo(cornerInset, cornerInset + cornerLen)
  ctx.lineTo(cornerInset, cornerInset)
  ctx.lineTo(cornerInset + cornerLen, cornerInset)
  ctx.stroke()

  // Top-right
  ctx.beginPath()
  ctx.moveTo(SIZE - cornerInset - cornerLen, cornerInset)
  ctx.lineTo(SIZE - cornerInset, cornerInset)
  ctx.lineTo(SIZE - cornerInset, cornerInset + cornerLen)
  ctx.stroke()

  // Bottom-left
  ctx.beginPath()
  ctx.moveTo(cornerInset, SIZE - cornerInset - cornerLen)
  ctx.lineTo(cornerInset, SIZE - cornerInset)
  ctx.lineTo(cornerInset + cornerLen, SIZE - cornerInset)
  ctx.stroke()

  // Bottom-right
  ctx.beginPath()
  ctx.moveTo(SIZE - cornerInset - cornerLen, SIZE - cornerInset)
  ctx.lineTo(SIZE - cornerInset, SIZE - cornerInset)
  ctx.lineTo(SIZE - cornerInset, SIZE - cornerInset - cornerLen)
  ctx.stroke()

  return canvas.toBuffer('image/png')
}
