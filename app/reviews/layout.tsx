import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Match Reviews | RaiseGG',
  description: 'Review disputed matches as a community reviewer.',
  robots: { index: false, follow: false },
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
