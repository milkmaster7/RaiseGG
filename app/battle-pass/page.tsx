import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { SEASON_CONFIG } from '@/lib/battle-pass'
import { BattlePassClient } from './BattlePassClient'

export const metadata: Metadata = {
  title: `Battle Pass — Season ${SEASON_CONFIG.season}: ${SEASON_CONFIG.name}`,
  description: 'Level up your Season Battle Pass by playing matches. Unlock exclusive rewards, badges, USDC prizes, and more on the free and premium tracks.',
  alternates: { canonical: 'https://raisegg.com/battle-pass' },
}

export default function BattlePassPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Battle Pass', url: 'https://raisegg.com/battle-pass' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BattlePassClient />
      </div>
    </>
  )
}
