import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter keyed by IP + route bucket
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  rateLimitMap.forEach((entry, key) => {
    if (entry.resetAt < now) rateLimitMap.delete(key)
  })
}

type RateLimitRule = { window: number; max: number }

const rules: { pattern: string; limit: RateLimitRule }[] = [
  { pattern: '/api/auth/',       limit: { window: 60_000, max: 10 } },
  { pattern: '/api/wallet/',     limit: { window: 60_000, max: 5 } },
  { pattern: '/api/match-chat',  limit: { window: 60_000, max: 30 } },
  { pattern: '/api/',            limit: { window: 60_000, max: 60 } }, // default
]

function getRuleForPath(pathname: string): RateLimitRule {
  for (const rule of rules) {
    if (pathname.startsWith(rule.pattern)) return rule.limit
  }
  return { window: 60_000, max: 60 }
}

export function middleware(req: NextRequest) {
  cleanup()

  const pathname = req.nextUrl.pathname
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? (req as any).ip ?? '127.0.0.1'
  const rule = getRuleForPath(pathname)
  const bucket = rules.find(r => pathname.startsWith(r.pattern))?.pattern ?? '/api/'
  const key = `${ip}::${bucket}`

  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + rule.window })
    return NextResponse.next()
  }

  entry.count++

  if (entry.count > rule.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
