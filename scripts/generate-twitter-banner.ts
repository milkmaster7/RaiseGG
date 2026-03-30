/**
 * Generate Twitter/X banner image (1500x500) for @UnspokenMoves / RaiseGG
 * Run: npx tsx scripts/generate-twitter-banner.ts
 */

import { createCanvas } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'

const W = 1500
const H = 500

const BG      = '#0b0c1d'
const TEXT     = '#e0e6ef'
const CYAN     = '#00e6ff'
const PURPLE   = '#7b61ff'
const DIM      = '#6b7280'

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')

// ─── Background ───────────────────────────────────────────────────────
ctx.fillStyle = BG
ctx.fillRect(0, 0, W, H)

// Purple glow top-left
const g1 = ctx.createRadialGradient(200, 100, 30, 200, 100, 400)
g1.addColorStop(0, 'rgba(123, 97, 255, 0.25)')
g1.addColorStop(1, 'rgba(123, 97, 255, 0)')
ctx.fillStyle = g1
ctx.fillRect(0, 0, W, H)

// Cyan glow bottom-right
const g2 = ctx.createRadialGradient(W - 200, H - 100, 20, W - 200, H - 100, 450)
g2.addColorStop(0, 'rgba(0, 230, 255, 0.18)')
g2.addColorStop(1, 'rgba(0, 230, 255, 0)')
ctx.fillStyle = g2
ctx.fillRect(0, 0, W, H)

// Subtle grid lines
ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
ctx.lineWidth = 1
for (let x = 0; x < W; x += 60) {
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
}
for (let y = 0; y < H; y += 60) {
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
}

// ─── Shield logo (large, left side) ───────────────────────────────────
const shieldX = 180
const shieldY = 130
const shieldScale = 5

function drawShield(cx: number, cy: number, scale: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)

  // Shield outline
  ctx.beginPath()
  ctx.moveTo(0, -13)
  ctx.lineTo(11, -8)
  ctx.lineTo(11, 1)
  ctx.quadraticCurveTo(11, 9, 0, 13)
  ctx.quadraticCurveTo(-11, 9, -11, 1)
  ctx.lineTo(-11, -8)
  ctx.closePath()
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 0.4
  ctx.stroke()

  // Shield fill
  ctx.fillStyle = 'rgba(0, 230, 255, 0.08)'
  ctx.fill()

  // Upward arrow
  ctx.beginPath()
  ctx.moveTo(0, -6)
  ctx.lineTo(4, 0)
  ctx.lineTo(1.5, 0)
  ctx.lineTo(1.5, 6)
  ctx.lineTo(-1.5, 6)
  ctx.lineTo(-1.5, 0)
  ctx.lineTo(-4, 0)
  ctx.closePath()
  ctx.fillStyle = CYAN
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.restore()
}

drawShield(shieldX, shieldY + 50, shieldScale)

// ─── Brand name ───────────────────────────────────────────────────────
ctx.font = 'bold 120px sans-serif'
ctx.textAlign = 'left'

// "Raise" in white
ctx.fillStyle = TEXT
ctx.fillText('Raise', 290, 230)

// "GG" in cyan
const raiseW = ctx.measureText('Raise').width
ctx.fillStyle = CYAN
ctx.fillText('GG', 290 + raiseW, 230)

// ─── Tagline ──────────────────────────────────────────────────────────
ctx.font = '600 32px sans-serif'
ctx.fillStyle = DIM
// @ts-ignore — letterSpacing works in node-canvas but not typed
;(ctx as any).letterSpacing = '8px'
ctx.fillText('STAKE  ·  COMPETE  ·  WIN', 300, 290)

// ─── Game badges ──────────────────────────────────────────────────────
const games = ['CS2', 'DOTA 2', 'DEADLOCK']
const badgeY = 340
let badgeX = 300

games.forEach((game) => {
  ctx.font = 'bold 20px sans-serif'
  const tw = ctx.measureText(game).width
  const bw = tw + 36
  const bh = 40

  // Badge bg
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, bw, bh, 4)
  ctx.fillStyle = 'rgba(123, 97, 255, 0.15)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(123, 97, 255, 0.4)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Badge text
  ctx.fillStyle = '#9b84ff'
  ctx.textAlign = 'left'
  ctx.fillText(game, badgeX + 18, badgeY + 27)

  badgeX += bw + 16
})

// ─── URL ──────────────────────────────────────────────────────────────
ctx.font = 'bold 24px sans-serif'
ctx.fillStyle = CYAN
ctx.textAlign = 'left'
ctx.fillText('raisegg.com', 300, 430)

// ─── Decorative elements on right side ────────────────────────────────
// Floating shield icons (small, decorative)
drawShield(W - 250, 120, 2.5)
drawShield(W - 120, 300, 1.8)
drawShield(W - 350, 380, 2)

// Gradient line accent
const lineGrd = ctx.createLinearGradient(0, H - 4, W, H - 4)
lineGrd.addColorStop(0, 'rgba(123, 97, 255, 0)')
lineGrd.addColorStop(0.3, PURPLE)
lineGrd.addColorStop(0.7, CYAN)
lineGrd.addColorStop(1, 'rgba(0, 230, 255, 0)')
ctx.fillStyle = lineGrd
ctx.fillRect(0, H - 4, W, 4)

// Top line accent
const topGrd = ctx.createLinearGradient(0, 0, W, 0)
topGrd.addColorStop(0, 'rgba(0, 230, 255, 0)')
topGrd.addColorStop(0.3, CYAN)
topGrd.addColorStop(0.7, PURPLE)
topGrd.addColorStop(1, 'rgba(123, 97, 255, 0)')
ctx.fillStyle = topGrd
ctx.fillRect(0, 0, W, 3)

// ─── Save ─────────────────────────────────────────────────────────────
const out = path.join(__dirname, '..', 'public', 'twitter-banner.png')
fs.writeFileSync(out, canvas.toBuffer('image/png'))
console.log(`Banner saved to ${out} (${W}x${H})`)

const out2 = path.join(__dirname, '..', 'public', 'twitter-banner-preview.png')
fs.writeFileSync(out2, canvas.toBuffer('image/png'))
console.log('Done!')
