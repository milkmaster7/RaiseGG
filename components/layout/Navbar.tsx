import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import NavbarClient from './NavbarClient'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-min-32-chars'
)

export default async function Navbar() {
  const cookieStore = await cookies()
  const token = cookieStore.get('rgg_session')?.value
  let isLoggedIn = false
  if (token) {
    try {
      await jwtVerify(token, SECRET)
      isLoggedIn = true
    } catch (_) {}
  }
  return <NavbarClient isLoggedIn={isLoggedIn} />
}
