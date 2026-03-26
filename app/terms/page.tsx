import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'RaiseGG.gg Terms of Service. Read our rules, eligibility requirements and platform policies.',
  alternates: { canonical: 'https://raisegg.gg/terms' },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Terms of Service', url: 'https://raisegg.gg/terms' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-8 text-gradient">Terms of Service</h1>
        <p className="text-muted text-sm mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="space-y-6 text-muted leading-relaxed text-sm">
          <p>By using RaiseGG.gg you agree to these terms. Stake matches are skill-based competitions. You must be 18+ and comply with your local laws.</p>
          {/* Full terms — fill in before launch */}
        </div>
      </div>
    </>
  )
}
