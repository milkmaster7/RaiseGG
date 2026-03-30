import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { MissionsClient } from '@/components/missions/MissionsClient'

export const metadata: Metadata = {
  title: 'Daily & Weekly Missions — Earn RaisePoints',
  description:
    'Complete daily and weekly missions on RaiseGG to earn RaisePoints. Play CS2, Dota 2, and Deadlock matches to unlock RP rewards every day.',
  alternates: { canonical: 'https://raisegg.com/missions' },
  openGraph: {
    title: 'Daily & Weekly Missions — Earn RaisePoints | RaiseGG',
    description:
      'Complete missions to earn RaisePoints. New daily missions every 24 hours, weekly missions every Monday.',
    url: 'https://raisegg.com/missions',
    type: 'website',
    images: [
      {
        url: '/api/og?title=Missions&sub=Earn+RaisePoints+Every+Day&color=7b61ff',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daily & Weekly Missions — Earn RaisePoints | RaiseGG',
    description:
      'Complete missions to earn RaisePoints on RaiseGG. New challenges every day.',
    images: ['/api/og?title=Missions&sub=Earn+RaisePoints+Every+Day&color=7b61ff'],
  },
}

export default function MissionsPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Missions', url: 'https://raisegg.com/missions' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(crumbs).replace(/</g, '\\u003c'),
        }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">
          Missions
        </h1>
        <p className="text-muted mb-8">
          Complete daily and weekly missions to earn RaisePoints. New missions
          rotate every day and every week.
        </p>
        <MissionsClient />
      </div>
    </>
  )
}
