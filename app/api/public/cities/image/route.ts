import { NextRequest, NextResponse } from 'next/server'
import { createCanvas } from 'canvas'
import { createServiceClient } from '@/lib/supabase'
import { drawBackground, drawRoundedRect, truncateText } from '@/lib/social-graphics'

// Palette
const BG_CARD    = '#151630'
const TEXT       = '#e0e6ef'
const CYAN       = '#00e6ff'
const PURPLE     = '#7b61ff'
const DIM        = '#6b7280'
const WIN_GREEN  = '#22c55e'

const W = 1200
const H = 630

// Country code → flag emoji
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '\u{1F3F3}'
  const upper = code.toUpperCase()
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

/**
 * GET /api/public/cities/image?game=cs2
 *
 * Generates a 1200x630 PNG showing top 10 cities with bar chart visualization.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const game = searchParams.get('game') // optional

    const supabase = createServiceClient()

    const { data: players, error } = await supabase
      .from('players')
      .select('city, country, cs2_wins, dota2_wins, deadlock_wins')
      .not('city', 'is', null)

    if (error || !players || players.length === 0) {
      // Return a fallback "no data" image
      const canvas = createCanvas(W, H)
      const ctx = canvas.getContext('2d')
      drawBackground(ctx)
      ctx.font = 'bold 36px sans-serif'
      ctx.fillStyle = TEXT
      ctx.textAlign = 'center'
      ctx.fillText('No city data available yet', W / 2, H / 2)
      const buf = canvas.toBuffer('image/png')
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
          ...CORS,
        },
      })
    }

    // Aggregate wins per city
    function getWins(p: NonNullable<typeof players>[0]): number {
      if (game === 'cs2') return p.cs2_wins ?? 0
      if (game === 'dota2') return p.dota2_wins ?? 0
      if (game === 'deadlock') return p.deadlock_wins ?? 0
      return (p.cs2_wins ?? 0) + (p.dota2_wins ?? 0) + (p.deadlock_wins ?? 0)
    }

    const cityMap = new Map<string, { city: string; country: string; wins: number }>()

    for (const p of players) {
      const key = (p.city as string).toLowerCase().trim()
      if (!key) continue
      const wins = getWins(p)
      if (!cityMap.has(key)) {
        cityMap.set(key, { city: p.city as string, country: (p.country as string) ?? '', wins: 0 })
      }
      cityMap.get(key)!.wins += wins
    }

    const top10 = Array.from(cityMap.values())
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)

    if (top10.length === 0) {
      const canvas = createCanvas(W, H)
      const ctx = canvas.getContext('2d')
      drawBackground(ctx)
      ctx.font = 'bold 36px sans-serif'
      ctx.fillStyle = TEXT
      ctx.textAlign = 'center'
      ctx.fillText('No city data available yet', W / 2, H / 2)
      const buf = canvas.toBuffer('image/png')
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
          ...CORS,
        },
      })
    }

    // Generate the image
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    drawBackground(ctx)

    // Title
    ctx.font = 'bold 36px sans-serif'
    ctx.fillStyle = TEXT
    ctx.textAlign = 'center'
    ctx.fillText('City Leaderboard', W / 2, 52)

    // Subtitle
    ctx.font = 'bold 18px sans-serif'
    ctx.fillStyle = CYAN
    const gameLabel = game ? game.toUpperCase() : 'ALL GAMES'
    ctx.fillText(`Top 10 Cities by Wins \u2014 ${gameLabel}`, W / 2, 80)

    // Accent line
    ctx.fillStyle = CYAN
    ctx.fillRect(W / 2 - 50, 90, 100, 2)

    // Bar chart area
    const maxWins = top10[0].wins || 1
    const barAreaLeft = 300
    const barAreaRight = W - 80
    const barMaxW = barAreaRight - barAreaLeft
    const rowH = 44
    const startY = 110
    const gap = 4

    top10.forEach((city, i) => {
      const y = startY + i * (rowH + gap)
      const isTop3 = i < 3

      // Row background
      drawRoundedRect(ctx, 40, y, W - 80, rowH, 6)
      ctx.fillStyle = isTop3 ? 'rgba(0, 230, 255, 0.06)' : BG_CARD
      ctx.fill()
      if (i === 0) {
        ctx.strokeStyle = CYAN
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Rank
      ctx.font = 'bold 18px sans-serif'
      ctx.fillStyle = isTop3 ? CYAN : DIM
      ctx.textAlign = 'center'
      ctx.fillText(`#${i + 1}`, 75, y + 29)

      // Flag + city name
      const flag = countryFlag(city.country)
      ctx.font = '18px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(flag, 100, y + 29)

      ctx.font = `bold 17px sans-serif`
      ctx.fillStyle = isTop3 ? CYAN : TEXT
      const displayCity = truncateText(ctx, city.city, 160)
      ctx.fillText(displayCity, 130, y + 29)

      // Bar
      const barW = Math.max(4, (city.wins / maxWins) * barMaxW)
      const barY = y + 10
      const barH = rowH - 20

      // Bar gradient
      drawRoundedRect(ctx, barAreaLeft, barY, barW, barH, 4)
      const barGrd = ctx.createLinearGradient(barAreaLeft, barY, barAreaLeft + barW, barY)
      if (isTop3) {
        barGrd.addColorStop(0, PURPLE)
        barGrd.addColorStop(1, CYAN)
      } else {
        barGrd.addColorStop(0, 'rgba(123, 97, 255, 0.5)')
        barGrd.addColorStop(1, 'rgba(0, 230, 255, 0.5)')
      }
      ctx.fillStyle = barGrd
      ctx.fill()

      // Win count at end of bar
      ctx.font = 'bold 15px sans-serif'
      ctx.fillStyle = WIN_GREEN
      ctx.textAlign = 'left'
      ctx.fillText(`${city.wins}W`, barAreaLeft + barW + 8, y + 29)
    })

    // Footer divider
    ctx.strokeStyle = 'rgba(0, 230, 255, 0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(60, H - 50)
    ctx.lineTo(W - 60, H - 50)
    ctx.stroke()

    // Logo
    ctx.font = 'bold 18px sans-serif'
    ctx.fillStyle = CYAN
    ctx.textAlign = 'left'
    ctx.fillText('raisegg.com', 60, H - 22)

    // Tagline
    ctx.font = '14px sans-serif'
    ctx.fillStyle = DIM
    ctx.textAlign = 'right'
    ctx.fillText('Stake. Compete. Win.', W - 60, H - 22)

    const buf = canvas.toBuffer('image/png')

    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
        ...CORS,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500, headers: CORS }
    )
  }
}
