import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { ChallengesWidget } from '@/components/ui/ChallengesWidget'

export const metadata: Metadata = {
  title: 'Daily Challenges — Earn Rewards',
  description: 'Complete daily challenges on RaiseGG to earn bonus XP and rewards. New challenges every day at midnight UTC.',
  alternates: { canonical: 'https://raisegg.com/challenges' },
}

export default function ChallengesPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Challenges', url: 'https://raisegg.com/challenges' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Daily Challenges</h1>
        <p className="text-muted mb-8">Complete challenges to earn bonus rewards. Resets at midnight UTC.</p>
        <ChallengesWidget />
        <div className="card mt-6">
          <h2 className="font-orbitron text-sm font-bold text-white mb-3">How It Works</h2>
          <ul className="space-y-2 text-muted text-sm">
            <li>• 3 new challenges appear every day at 00:00 UTC</li>
            <li>• Complete them by playing matches and winning stakes</li>
            <li>• Earn bonus XP toward your profile level</li>
            <li>• Weekly challenges coming soon with USDC rewards</li>
          </ul>
        </div>
      </div>
    </>
  )
}
