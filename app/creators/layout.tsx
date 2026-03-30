import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Program',
  description: 'Join the RaiseGG Creator Program and earn 5% revenue share for 6 months on every referred player. Streamers, YouTubers, and community leaders welcome.',
  alternates: { canonical: 'https://raisegg.com/creators' },
  openGraph: {
    title: 'Creator Program — RaiseGG',
    description: 'Earn 5% revenue share for 6 months on every referred player. Apply to the RaiseGG Creator Program.',
    url: 'https://raisegg.com/creators',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: '/api/og?title=Creator+Program&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Creator Program — RaiseGG',
    description: 'Earn 5% revenue share for 6 months on every referred player. Apply to the RaiseGG Creator Program.',
    images: ['/api/og?title=Creator+Program&sub=RaiseGG&color=7b61ff'],
  },
}

export default function CreatorsLayout({ children }: { children: React.ReactNode }) {
  return children
}
