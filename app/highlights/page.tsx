import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { readSessionFromCookies } from '@/lib/session'
import { HighlightsClient } from './HighlightsClient'

export const metadata: Metadata = {
  title: 'Your Week in Review — RaiseGG',
  description: 'See your weekly esports performance highlights and share them.',
  alternates: { canonical: 'https://raisegg.com/highlights' },
  robots: { index: false, follow: false },
}

export default async function HighlightsPage() {
  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)
  if (!playerId) redirect('/api/auth/steam')

  return <HighlightsClient />
}
