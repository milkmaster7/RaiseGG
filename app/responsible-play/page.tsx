import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Responsible Play — RaiseGG.gg',
  description: 'RaiseGG is committed to responsible play. Learn about setting limits, recognising warning signs, and self-exclusion.',
  robots: { index: false, follow: false },
}

export default function ResponsiblePlayPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'Responsible Play', url: 'https://raisegg.gg/responsible-play' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">Responsible Play</h1>
        <p className="text-muted text-lg mb-12 leading-relaxed">
          RaiseGG is a skill-based competition platform. We want everyone who plays to enjoy it responsibly. Please read the guidance below.
        </p>

        {/* Introduction */}
        <div className="card mb-6">
          <h2 className="font-orbitron text-xl font-bold text-white mb-3">Introduction</h2>
          <p className="text-muted text-sm leading-relaxed">
            Competitive stake matches are intended to be an enjoyable way to test your skill and earn rewards. However, like any activity involving money, it is possible to develop unhealthy habits. RaiseGG encourages all players to set clear limits and play within their means.
          </p>
          <p className="text-muted text-sm leading-relaxed mt-3">
            Only stake money you can afford to lose. A stake match is not a guaranteed income — skill matters, but variance is real.
          </p>
        </div>

        {/* Set Limits */}
        <div className="card mb-6">
          <h2 className="font-orbitron text-xl font-bold text-white mb-3">Set Limits</h2>
          <p className="text-muted text-sm leading-relaxed mb-3">
            Before you start playing, decide on your limits and stick to them:
          </p>
          <ul className="space-y-2 text-sm text-muted list-disc list-inside leading-relaxed">
            <li><strong className="text-white">Deposit limit:</strong> Set a maximum amount you will deposit per week or month. Never chase losses with a fresh deposit.</li>
            <li><strong className="text-white">Session limit:</strong> Decide how long you will play in one sitting. Taking breaks reduces impulsive decisions.</li>
            <li><strong className="text-white">Stake limit:</strong> Start small. There is no reason to jump into high-stakes lobbies before you are comfortable with the platform.</li>
            <li><strong className="text-white">Loss limit:</strong> If you lose a set amount in a session, stop. Do not try to win it back immediately.</li>
          </ul>
        </div>

        {/* Warning Signs */}
        <div className="card mb-6">
          <h2 className="font-orbitron text-xl font-bold text-white mb-3">Warning Signs</h2>
          <p className="text-muted text-sm leading-relaxed mb-3">
            It may be time to take a break if you recognise any of the following:
          </p>
          <ul className="space-y-2 text-sm text-muted list-disc list-inside leading-relaxed">
            <li>Staking more than you can afford to lose</li>
            <li>Feeling frustrated or angry after losses and wanting to play again immediately to recover</li>
            <li>Spending more time on the platform than you planned</li>
            <li>Thinking about stake matches constantly — even when away from the platform</li>
            <li>Borrowing money or using funds intended for other purposes to stake</li>
            <li>Neglecting work, school, or personal relationships because of time spent playing</li>
          </ul>
          <p className="text-muted text-sm leading-relaxed mt-3">
            If any of the above apply to you, we strongly encourage you to take a break and seek support.
          </p>
        </div>

        {/* Self-Exclusion */}
        <div className="card mb-6">
          <h2 className="font-orbitron text-xl font-bold text-white mb-3">Self-Exclusion</h2>
          <p className="text-muted text-sm leading-relaxed mb-3">
            If you feel you need to stop using RaiseGG for a period of time, you can request self-exclusion by emailing us. We will disable your account for a minimum of 30 days. During this period you will not be able to deposit, place stakes, or register for tournaments.
          </p>
          <p className="text-sm text-muted mb-4">
            To request self-exclusion, email:{' '}
            <a href="mailto:hello@raisegg.gg" className="text-accent-cyan hover:text-accent-cyan transition-colors">
              hello@raisegg.gg
            </a>{' '}
            with the subject line <strong className="text-white">"Self-Exclusion Request"</strong>.
          </p>
          <p className="text-muted text-sm leading-relaxed">
            We will process all self-exclusion requests within 24 hours and confirm via email when complete.
          </p>
        </div>

        {/* Resources */}
        <div className="card mb-6">
          <h2 className="font-orbitron text-xl font-bold text-white mb-3">Resources</h2>
          <p className="text-muted text-sm leading-relaxed mb-4">
            If you are concerned about your relationship with online competition and money, the following organisations can help:
          </p>
          <ul className="space-y-2 text-sm text-muted list-disc list-inside leading-relaxed">
            <li>
              <a href="https://www.gamblingtherapy.org" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:text-accent-cyan transition-colors">
                GamblingTherapy.org
              </a>{' '}
              — free, confidential support available in multiple languages
            </li>
            <li>
              <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:text-accent-cyan transition-colors">
                GamblersAnonymous.org
              </a>{' '}
              — peer support groups worldwide
            </li>
            <li>
              <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:text-accent-cyan transition-colors">
                BeGambleAware.org
              </a>{' '}
              — practical advice and tools for managing risk
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted text-center">
          RaiseGG.gg — questions about responsible play? Contact us at{' '}
          <a href="mailto:hello@raisegg.gg" className="text-accent-cyan hover:text-accent-cyan transition-colors">
            hello@raisegg.gg
          </a>
        </p>
      </div>
    </>
  )
}
