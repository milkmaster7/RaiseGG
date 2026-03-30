import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Affiliate Program',
  description: 'Earn commissions when your referrals win matches on RaiseGG. Three tiers from 5% to 10% rake share on CS2, Dota 2, and Deadlock stakes.',
  alternates: { canonical: 'https://raisegg.com/affiliate' },
  openGraph: {
    title: 'Affiliate Program — RaiseGG',
    description: 'Earn commissions when your referrals win matches. Three tiers from 5% to 10% rake share.',
    url: 'https://raisegg.com/affiliate',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: '/api/og?title=Affiliate+Program&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Affiliate Program — RaiseGG',
    description: 'Earn commissions when your referrals win matches. Three tiers from 5% to 10% rake share.',
    images: ['/api/og?title=Affiliate+Program&sub=RaiseGG&color=7b61ff'],
  },
}

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  return children
}
