import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { SolanaWalletProvider } from '@/components/providers/WalletProvider'
import { MatchNotifications } from '@/components/matches/MatchNotifications'
import LiveWinTicker from '@/components/ui/LiveWinTicker'

// ─── Viewport ────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0d0d1a' },
    { media: '(prefers-color-scheme: light)', color: '#7b61ff' },
  ],
  colorScheme: 'dark',
}

// ─── Base Metadata ────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL('https://raisegg.com'),

  title: {
    template: '%s | RaiseGG',
    default: 'CS2, Dota 2 & Deadlock Stake Matches — Win Real USDC/USDT',
  },

  description:
    'Stake USDC or USDT on CS2, Dota 2 and Deadlock matches. The first competitive wagering platform for the Caucasus, Turkey and Balkans — fair play, instant payouts, no trust required.',

  keywords: [
    'cs2 stake matches', 'dota 2 stake', 'deadlock competitive',
    'cs2 georgia', 'dota2 turkey', 'cs2 caucasus', 'esports wagering',
    'faceit alternative', 'competitive cs2 caucasus', 'stake gaming',
    'cs2 bet', 'dota2 bet', 'esports stake platform',
  ],

  alternates: { canonical: 'https://raisegg.com' },

  openGraph: {
    title: 'RaiseGG – CS2, Dota 2 & Deadlock Stake Matches',
    description: 'Stake USDC/USDT on competitive matches. Instant payouts. 44 countries.',
    type: 'website',
    siteName: 'RaiseGG',
    locale: 'en_US',
    url: 'https://raisegg.com',
    images: [
      {
        url: '/api/og?title=CS2,+Dota+2+%26+Deadlock+Stake+Matches&sub=RaiseGG&color=7b61ff',
        width: 1200,
        height: 630,
        alt: 'RaiseGG — Competitive Stake Platform',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@RaiseGG',
    creator: '@RaiseGG',
    title: 'RaiseGG – CS2, Dota 2 & Deadlock Stake Matches',
    description: 'Stake USDC/USDT on competitive matches. Instant payouts. 44 countries.',
    images: ['/api/og?title=CS2,+Dota+2+%26+Deadlock+Stake+Matches&sub=RaiseGG&color=7b61ff'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/icon-192.png',
  },

  manifest: '/manifest.webmanifest',
}

// ─── Site-wide JSON-LD ────────────────────────────────────────────────────────
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'RaiseGG',
  alternateName: 'RaiseGG',
  url: 'https://raisegg.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://raisegg.com/logo-horizontal.svg',
    width: 600,
    height: 60,
  },
  image: 'https://raisegg.com/og-default.png',
  description: 'Competitive CS2, Dota 2 and Deadlock stake platform for the Caucasus, Turkey and Balkans. USDC/USDT payouts via trustless Solana smart contract.',
  areaServed: [
    'Georgia', 'Turkey', 'Armenia', 'Azerbaijan', 'Ukraine',
    'Romania', 'Bulgaria', 'Serbia', 'Greece', 'Iran',
    'Kazakhstan', 'Uzbekistan', 'Russia', 'Poland', 'Hungary',
  ],
  sameAs: [
    'https://twitter.com/RaiseGG',
    'https://t.me/raisegg',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'hello@raisegg.com',
  },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'RaiseGG',
  alternateName: 'RaiseGG',
  url: 'https://raisegg.com',
  description: 'Competitive CS2, Dota 2 and Deadlock stake matches. Win real USDC or USDT. Serving 44 countries across the Caucasus, Turkey and Balkans.',
  inLanguage: 'en-US',
  creator: { '@type': 'Organization', name: 'RaiseGG', url: 'https://raisegg.com' },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://raisegg.com/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://avatars.steamstatic.com" />
        <link rel="alternate" type="application/rss+xml" title="RaiseGG Blog" href="/feed.xml" />
      </head>
      <body className="min-h-screen bg-space-900 flex">
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-BSDK3JMC7Y" strategy="afterInteractive" />
        <Script id="ga" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-BSDK3JMC7Y');`}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema).replace(/</g, '\\u003c'),
          }}
        />
        <SolanaWalletProvider>
          {/* Persistent left sidebar — hidden on mobile */}
          <Sidebar />

          {/* Main content area fills remaining space */}
          <div className="flex-1 min-w-0 flex flex-col">
            <main className="flex-1 pb-20 md:pb-9">{children}</main>

            <LiveWinTicker />

            <MatchNotifications />

            {/* Bottom mobile nav — hidden on desktop */}
            <MobileNav />
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  )
}
