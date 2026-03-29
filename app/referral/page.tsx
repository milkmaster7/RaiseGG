import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { ReferralPageInner } from '@/components/referral/ReferralPageInner'

export const metadata: Metadata = {
  title: 'Referral Program — Invite Friends, Earn Rewards',
  description: 'Share your referral link and earn bonus rewards when your friends play their first stake matches on RaiseGG.',
  alternates: { canonical: 'https://raisegg.com/referral' },
}

export default function ReferralPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Referral', url: 'https://raisegg.com/referral' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Referral Program</h1>
        <p className="text-muted mb-8">Invite friends and earn rewards when they play.</p>
        <ReferralPageInner />
      </div>
    </>
  )
}
