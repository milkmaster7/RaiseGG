import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clans',
  description: 'Browse and join competitive gaming clans on RaiseGG. Build your organization, compete as a unit in CS2, Dota 2, and Deadlock, and climb the clan leaderboard.',
  alternates: { canonical: 'https://raisegg.com/clans' },
  openGraph: {
    title: 'Clans — RaiseGG',
    description: 'Browse and join competitive gaming clans. Build your organization and climb the clan leaderboard.',
    url: 'https://raisegg.com/clans',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: '/api/og?title=Clans&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clans — RaiseGG',
    description: 'Browse and join competitive gaming clans. Build your organization and climb the clan leaderboard.',
    images: ['/api/og?title=Clans&sub=RaiseGG&color=7b61ff'],
  },
}

export default function ClansLayout({ children }: { children: React.ReactNode }) {
  return children
}
