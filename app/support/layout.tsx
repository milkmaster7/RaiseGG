import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support — RaiseGG',
  description: 'Get help with your RaiseGG account, matches, wallet or withdrawals. Contact us via email or Telegram.',
  alternates: { canonical: 'https://raisegg.com/support' },
  openGraph: {
    title: 'Support — RaiseGG',
    description: 'Contact the RaiseGG support team for help with your account, matches or wallet.',
    url: 'https://raisegg.com/support',
    type: 'website',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
