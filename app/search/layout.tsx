import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Players',
  description: 'Find players on RaiseGG by username. View ELO ratings, win rates, and profiles across CS2, Dota 2, and Deadlock.',
  alternates: { canonical: 'https://raisegg.com/search' },
  openGraph: {
    title: 'Search Players — RaiseGG',
    description: 'Find players by username. View ELO ratings, win rates, and profiles across CS2, Dota 2, and Deadlock.',
    url: 'https://raisegg.com/search',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: '/api/og?title=Search+Players&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search Players — RaiseGG',
    description: 'Find players by username. View ELO ratings, win rates, and profiles across CS2, Dota 2, and Deadlock.',
    images: ['/api/og?title=Search+Players&sub=RaiseGG&color=7b61ff'],
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
