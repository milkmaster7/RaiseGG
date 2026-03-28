import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Play — Find a Stake Match',
  description: 'Browse open CS2, Dota 2 and Deadlock stake lobbies or create your own. Real USDC/USDT on the line. Instant smart contract payout.',
  alternates: { canonical: 'https://raisegg.gg/play' },
  openGraph: {
    title: 'Play — RaiseGG.gg',
    description: 'Browse open stake lobbies or create your own. CS2, Dota 2 and Deadlock. Instant USDC/USDT payout.',
    url: 'https://raisegg.gg/play',
    images: [{ url: '/api/og?title=Open+Lobbies&sub=RaiseGG.gg&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Play — RaiseGG.gg',
    images: ['/api/og?title=Open+Lobbies&sub=RaiseGG.gg&color=7b61ff'],
  },
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
