import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cosmetics Shop',
  description: 'Customize your RaiseGG profile with borders, badges, animated avatars, and seasonal collectibles. Stand out in the competitive scene.',
  alternates: { canonical: 'https://raisegg.com/cosmetics' },
  openGraph: {
    title: 'Cosmetics Shop — RaiseGG',
    description: 'Customize your profile with borders, badges, animated avatars, and seasonal collectibles.',
    url: 'https://raisegg.com/cosmetics',
    siteName: 'RaiseGG',
    type: 'website',
    images: [{ url: '/api/og?title=Cosmetics+Shop&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cosmetics Shop — RaiseGG',
    description: 'Customize your profile with borders, badges, animated avatars, and seasonal collectibles.',
    images: ['/api/og?title=Cosmetics+Shop&sub=RaiseGG&color=7b61ff'],
  },
}

export default function CosmeticsLayout({ children }: { children: React.ReactNode }) {
  return children
}
