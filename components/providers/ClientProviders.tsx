'use client'

import dynamic from 'next/dynamic'

const SolanaWalletProvider = dynamic(
  () => import('@/components/providers/WalletProvider').then(m => m.SolanaWalletProvider),
  { ssr: false }
)
const MatchNotifications = dynamic(
  () => import('@/components/matches/MatchNotifications').then(m => m.MatchNotifications),
  { ssr: false }
)
const LiveWinTicker = dynamic(() => import('@/components/ui/LiveWinTicker'), { ssr: false })
const NotificationPrompt = dynamic(() => import('@/components/notifications/NotificationPrompt'), { ssr: false })

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      {children}
      <LiveWinTicker />
      <MatchNotifications />
      <NotificationPrompt />
    </SolanaWalletProvider>
  )
}
