interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

/**
 * Simple in-memory rate limiter.
 *
 * @param key       Unique identifier (e.g. IP address, user ID, or route+IP combo)
 * @param maxRequests Maximum requests allowed within the window
 * @param windowMs  Time window in milliseconds
 * @returns { allowed, remaining } — allowed=false means the request should be rejected
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  // No entry or window expired — start fresh
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  // Within window
  entry.count++
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: maxRequests - entry.count }
}

/**
 * Get a rate-limit key from an IP + route path.
 * Use in API routes: rateLimitKey(req, '/api/auth/steam')
 */
export function rateLimitKey(
  req: { headers: { get(name: string): string | null }; nextUrl?: { pathname: string } },
  route?: string
): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
  const path = route ?? req.nextUrl?.pathname ?? 'unknown'
  return `${path}:${ip}`
}
