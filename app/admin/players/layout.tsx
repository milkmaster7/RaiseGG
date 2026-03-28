import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manage Players — Admin',
  robots: { index: false, follow: false },
}

export default function AdminPlayersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
