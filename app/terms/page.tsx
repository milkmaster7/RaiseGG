import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'RaiseGG.gg Terms of Service. Read our rules, eligibility requirements and platform policies.',
  alternates: { canonical: 'https://raisegg.gg/terms' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Terms of Service — RaiseGG.gg',
    description: 'RaiseGG.gg rules, eligibility requirements and platform policies.',
    url: 'https://raisegg.gg/terms',
    images: [{ url: '/api/og?title=Terms+of+Service&sub=RaiseGG.gg&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service — RaiseGG.gg',
    images: ['/api/og?title=Terms+of+Service&sub=RaiseGG.gg&color=7b61ff'],
  },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-orbitron text-base font-bold text-white mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
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
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">Terms of Service</h1>
        <p className="text-muted text-sm mb-10">Last updated: March 27, 2026</p>

        <div className="space-y-10 text-muted leading-relaxed text-sm">

          <p className="text-white">
            By accessing or using RaiseGG.gg you agree to be bound by these Terms of Service.
            If you do not agree, do not use the platform.
          </p>

          <Section title="1. Eligibility">
            <p>To use RaiseGG.gg you must:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Be at least 18 years of age</li>
              <li>Have a valid Steam account in good standing</li>
              <li>Have a Solana-compatible wallet for USDC transactions</li>
              <li>Not be a resident of a jurisdiction where skill-based stake competitions are prohibited by law</li>
              <li>Not be under an active ban on the platform</li>
            </ul>
            <p>
              It is your sole responsibility to determine whether using this platform is legal in your jurisdiction.
              We make no representations about legality in any specific country.
            </p>
          </Section>

          <Section title="2. Account Registration">
            <p>
              Accounts are created via Steam OpenID. You may only hold one account. Creating multiple accounts to
              circumvent bans or manipulate ELO ratings is strictly prohibited and will result in a permanent ban
              of all associated accounts.
            </p>
            <p>
              You are responsible for all activity under your account. If you believe your account has been
              compromised, contact us immediately at{' '}
              <a href="mailto:hello@raisegg.gg" className="text-accent-purple hover:underline">hello@raisegg.gg</a>.
            </p>
          </Section>

          <Section title="3. Stake Matches">
            <p>
              RaiseGG.gg facilitates skill-based 1v1 and team competitions where players stake USDC against
              each other. These are not gambling — outcomes are determined entirely by player skill within the
              game, with no element of chance introduced by the platform.
            </p>
            <p>
              When you create or join a match:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>The staked amount is locked in a smart contract escrow</li>
              <li>Match results are verified automatically via the game's API or MatchZy webhook</li>
              <li>The winner receives the combined stake minus the platform fee (currently 10%)</li>
              <li>The platform fee is non-refundable once a match is completed</li>
            </ul>
          </Section>

          <Section title="4. Platform Fee">
            <p>
              RaiseGG.gg charges a <span className="text-white font-semibold">10% fee</span> on the total
              stake pot of each completed match (5% from each side). This fee is deducted automatically at
              payout. The fee may change with 14 days notice posted on our Telegram channel.
            </p>
          </Section>

          <Section title="5. Deposits and Withdrawals">
            <p>
              All funds are held and transferred in USDC on the Solana blockchain. By depositing funds you
              acknowledge:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Blockchain transactions are irreversible once confirmed</li>
              <li>Deposits must be made to the correct treasury address — lost funds cannot be recovered</li>
              <li>Withdrawals are processed on-chain and may take 1-60 seconds depending on network conditions</li>
              <li>We are not responsible for loss of funds due to incorrect wallet addresses provided by you</li>
            </ul>
          </Section>

          <Section title="6. Refunds and Cancellations">
            <p>
              Stakes are refunded in full (minus any gas fees) in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>A match is cancelled before both players confirm readiness</li>
              <li>A match expires without the opponent joining (after 24 hours)</li>
              <li>An admin cancels a match as part of dispute resolution</li>
            </ul>
            <p>
              <span className="text-white font-semibold">No refunds are issued for completed matches</span>, including
              losses due to disconnection, hardware failure, or poor performance. The match result stands.
            </p>
          </Section>

          <Section title="7. Fair Play">
            <p>The following are strictly prohibited and will result in immediate permanent ban:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Use of cheats, hacks, aimbots, wallhacks or any third-party software that provides an unfair advantage</li>
              <li>Match fixing or collusion with opponents</li>
              <li>Creating multiple accounts (smurfing) to manipulate ELO</li>
              <li>Attempting to manipulate the smart contract, platform API, or match resolution system</li>
              <li>Exploiting bugs — report them to <a href="mailto:hello@raisegg.gg" className="text-accent-purple hover:underline">hello@raisegg.gg</a> instead</li>
            </ul>
            <p>
              Players with active VAC bans or Game Bans on CS2 are ineligible to play on the platform.
              Eligibility is checked at match creation.
            </p>
          </Section>

          <Section title="8. Disputes">
            <p>
              If you believe a match result is incorrect, you may raise a dispute within 24 hours of the
              match completing. To raise a dispute, go to your match history and click "Dispute".
            </p>
            <p>
              Admin decisions on disputes are final. We will review available evidence including game
              server logs, MatchZy data, and on-chain records. Fraudulent or bad-faith disputes may
              result in account suspension.
            </p>
          </Section>

          <Section title="9. Account Bans">
            <p>
              We reserve the right to ban any account at our sole discretion for violations of these Terms.
              Banned players forfeit any ongoing match stakes. Platform balances of banned players will
              be reviewed; funds may be withheld if the ban is related to fraud or cheating.
            </p>
            <p>
              To appeal a ban, email{' '}
              <a href="mailto:hello@raisegg.gg" className="text-accent-purple hover:underline">hello@raisegg.gg</a>{' '}
              with your Steam ID and reason for appeal.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              RaiseGG.gg is provided "as is". We are not liable for:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Loss of funds due to blockchain network failures or congestion</li>
              <li>Loss due to smart contract exploits beyond our reasonable control</li>
              <li>Service downtime or technical issues during a match</li>
              <li>Actions taken by third-party services (Steam, Solana, etc.)</li>
            </ul>
            <p>
              Our total liability to any user is capped at the amount of USDC held in their platform balance
              at the time of the incident.
            </p>
          </Section>

          <Section title="11. Intellectual Property">
            <p>
              All platform content, branding, and code is owned by RaiseGG. CS2, Dota 2, Deadlock and Steam
              are trademarks of Valve Corporation. We are not affiliated with, endorsed by, or sponsored by Valve.
            </p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>
              We may update these terms at any time. Material changes will be announced on our Telegram
              with at least 7 days notice. Continued use after the effective date constitutes acceptance.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These terms are governed by the laws of Georgia (the country). Any disputes arising from
              these terms shall be subject to the exclusive jurisdiction of the courts of Tbilisi, Georgia.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              Questions about these terms?{' '}
              <a href="mailto:hello@raisegg.gg" className="text-accent-purple hover:underline">hello@raisegg.gg</a>
            </p>
          </Section>

        </div>
      </div>
    </>
  )
}
