import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { TeamsPageInner } from '@/components/teams/TeamsPageInner'

export const metadata: Metadata = {
  title: 'Teams — 5v5 Competitive Squads',
  description: 'Create or join a team on RaiseGG. 5v5 team matches with captain picks, team rankings and USDC/USDT prize stakes.',
  alternates: { canonical: 'https://raisegg.com/teams' },
}

export default function TeamsPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Teams', url: 'https://raisegg.com/teams' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Teams</h1>
        <p className="text-muted mb-8">Create your squad, pick your captain, and compete in 5v5 stake matches.</p>
        <TeamsPageInner />
      </div>
    </>
  )
}
