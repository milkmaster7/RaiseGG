import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Linked Accounts',
  description: 'Manage your linked FACEIT and Leetify accounts on RaiseGG.',
  robots: { index: false, follow: false },
}

export default function LinkedAccountsLayout({ children }: { children: React.ReactNode }) {
  return children
}
