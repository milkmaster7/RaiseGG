import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Premium Membership',
  description: 'Upgrade to RaiseGG Premium for $2/month. Get priority matchmaking, 2% rake discount, advanced stats, exclusive badge, and early access to new features.',
  alternates: { canonical: 'https://raisegg.com/premium' },
  openGraph: {
    title: 'Premium Membership — RaiseGG',
    description: 'Priority matchmaking, 2% rake discount, advanced stats, and exclusive badge for just $2/month.',
    url: 'https://raisegg.com/premium',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: '/api/og?title=Premium&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Premium Membership — RaiseGG',
    description: 'Priority matchmaking, 2% rake discount, advanced stats, and exclusive badge for just $2/month.',
    images: ['/api/og?title=Premium&sub=RaiseGG&color=7b61ff'],
  },
}

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children
}
