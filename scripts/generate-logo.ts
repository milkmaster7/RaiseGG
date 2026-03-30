/**
 * Generate RaiseGG logo PNG from the shield+arrow design
 * Run: npx tsx scripts/generate-logo.ts
 */

import { createCanvas } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'

const SIZE = 512
const canvas = createCanvas(SIZE, SIZE)
const ctx = canvas.getContext('2d')

const BG = '#0b0c1d'
const CYAN = '#00e6ff'
const PURPLE = '#7b61ff'

// Background with rounded corners
ctx.fillStyle = BG
ctx.beginPath()
ctx.roundRect(0, 0, SIZE, SIZE, 48)
ctx.fill()

// Center coordinates
const cx = SIZE / 2
const cy = SIZE / 2

// Scale factor (original SVG was 32x32, we scale to ~400px within 512)
const s = 15

// Shield shape
ctx.beginPath()
ctx.moveTo(cx, cy - 13 * s)
ctx.lineTo(cx + 11 * s, cy - 8 * s)
ctx.lineTo(cx + 11 * s, cy + 1 * s)
ctx.quadraticCurveTo(cx + 11 * s, cy + 9 * s, cx, cy + 13 * s)
ctx.quadraticCurveTo(cx - 11 * s, cy + 9 * s, cx - 11 * s, cy + 1 * s)
ctx.lineTo(cx - 11 * s, cy - 8 * s)
ctx.closePath()

// Shield fill
ctx.fillStyle = 'rgba(0, 230, 255, 0.1)'
ctx.fill()

// Shield stroke
ctx.strokeStyle = CYAN
ctx.lineWidth = 4
ctx.stroke()

// Upward arrow
ctx.beginPath()
ctx.moveTo(cx, cy - 6 * s)          // top point
ctx.lineTo(cx + 4 * s, cy)          // right wing
ctx.lineTo(cx + 1.5 * s, cy)        // right notch
ctx.lineTo(cx + 1.5 * s, cy + 6 * s) // right bottom
ctx.lineTo(cx - 1.5 * s, cy + 6 * s) // left bottom
ctx.lineTo(cx - 1.5 * s, cy)        // left notch
ctx.lineTo(cx - 4 * s, cy)          // left wing
ctx.closePath()

// Arrow fill - cyan
ctx.fillStyle = CYAN
ctx.globalAlpha = 0.9
ctx.fill()

// Purple glow overlay on arrow
ctx.fillStyle = PURPLE
ctx.globalAlpha = 0.25
ctx.fill()
ctx.globalAlpha = 1

// Subtle glow effect around shield
ctx.shadowColor = CYAN
ctx.shadowBlur = 30
ctx.beginPath()
ctx.moveTo(cx, cy - 13 * s)
ctx.lineTo(cx + 11 * s, cy - 8 * s)
ctx.lineTo(cx + 11 * s, cy + 1 * s)
ctx.quadraticCurveTo(cx + 11 * s, cy + 9 * s, cx, cy + 13 * s)
ctx.quadraticCurveTo(cx - 11 * s, cy + 9 * s, cx - 11 * s, cy + 1 * s)
ctx.lineTo(cx - 11 * s, cy - 8 * s)
ctx.closePath()
ctx.strokeStyle = CYAN
ctx.lineWidth = 2
ctx.stroke()
ctx.shadowBlur = 0

// Save
const desktopPath = path.join('C:', 'Users', 'Me', 'Desktop', 'raisegg-logo.png')
fs.writeFileSync(desktopPath, canvas.toBuffer('image/png'))
console.log(`Logo saved to ${desktopPath} (${SIZE}x${SIZE})`)

// Also save to public
const publicPath = path.join(__dirname, '..', 'public', 'logo.png')
fs.writeFileSync(publicPath, canvas.toBuffer('image/png'))
console.log(`Also saved to ${publicPath}`)
