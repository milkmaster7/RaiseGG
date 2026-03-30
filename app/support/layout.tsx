import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support & Contact',
  description: 'Get help with your RaiseGG account, matches, or payouts. Contact us via email or Telegram, or send a message directly from this page.',
  alternates: { canonical: 'https://raisegg.com/support' },
  openGraph: {
    title: 'Support & Contact — RaiseGG',
    description: 'Get help with your account, matches, or payouts. Contact us via email or Telegram.',
    url: 'https://raisegg.com/support',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: '/api/og?title=Support&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support & Contact — RaiseGG',
    description: 'Get help with your account, matches, or payouts. Contact us via email or Telegram.',
    images: ['/api/og?title=Support&sub=RaiseGG&color=7b61ff'],
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
