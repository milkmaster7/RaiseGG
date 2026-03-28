import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wallet — Deposit & Withdraw USDC/USDT',
  robots: { index: false, follow: false },
}

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
