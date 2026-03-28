import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Players — RaiseGG.gg',
  description: 'Search for players on RaiseGG.gg. Find any player by username, check their rank, ELO and match history.',
  alternates: { canonical: 'https://raisegg.gg/search' },
  openGraph: {
    title: 'Search Players — RaiseGG.gg',
    description: 'Find any player by username. Check rank, ELO and match history.',
    url: 'https://raisegg.gg/search',
    images: [{ url: '/api/og?title=Player+Search&sub=RaiseGG.gg&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search Players — RaiseGG.gg',
    images: ['/api/og?title=Player+Search&sub=RaiseGG.gg&color=7b61ff'],
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
