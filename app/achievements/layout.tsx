import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Achievements',
  description: 'Track your RaiseGG achievements across CS2, Dota 2, and Deadlock. Unlock badges from common to legendary as you compete and win.',
  alternates: { canonical: 'https://raisegg.com/achievements' },
  openGraph: {
    title: 'Achievements — RaiseGG',
    description: 'Track your RaiseGG achievements across CS2, Dota 2, and Deadlock. Unlock badges from common to legendary.',
    url: 'https://raisegg.com/achievements',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: '/api/og?title=Achievements&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Achievements — RaiseGG',
    description: 'Track your RaiseGG achievements across CS2, Dota 2, and Deadlock. Unlock badges from common to legendary.',
    images: ['/api/og?title=Achievements&sub=RaiseGG&color=7b61ff'],
  },
}

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return children
}
