import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'RaiseGG.gg Privacy Policy. How we handle your data, Steam account information and wallet addresses.',
  alternates: { canonical: 'https://raisegg.gg/privacy' },
}

export default function PrivacyPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Privacy Policy', url: 'https://raisegg.gg/privacy' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-8 text-gradient">Privacy Policy</h1>
        <p className="text-muted text-sm mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="space-y-6 text-muted leading-relaxed text-sm">
          <p>We collect your Steam ID, wallet address, and match data to operate the platform. We do not sell your data. Steam OAuth is read-only.</p>
          {/* Full privacy policy — fill in before launch */}
        </div>
      </div>
    </>
  )
}
