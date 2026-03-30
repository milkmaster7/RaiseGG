import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET env var is required in production')
}
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-min-32-chars'
)

export async function signSession(playerId: string): Promise<string> {
  return new SignJWT({ playerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function readSession(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('rgg_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload.playerId as string
  } catch (_) {
    return null
  }
}

/** For use in server page components that call `cookies()` from next/headers */
export async function readSessionFromCookies(
  cookieStore: { get(name: string): { value: string } | undefined }
): Promise<string | null> {
  const token = cookieStore.get('rgg_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload.playerId as string
  } catch (_) {
    return null
  }
}
