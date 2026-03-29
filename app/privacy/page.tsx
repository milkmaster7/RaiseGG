import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'RaiseGG Privacy Policy. How we handle your data, Steam account information and wallet addresses.',
  alternates: { canonical: 'https://raisegg.com/privacy' },
  openGraph: {
    title: 'Privacy Policy — RaiseGG',
    description: 'How we handle your Steam account data, wallet addresses and match history.',
    url: 'https://raisegg.com/privacy',
    images: [{ url: '/api/og?title=Privacy+Policy&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy — RaiseGG',
    images: ['/api/og?title=Privacy+Policy&sub=RaiseGG&color=7b61ff'],
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

export default function PrivacyPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Privacy Policy', url: 'https://raisegg.com/privacy' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">Privacy Policy</h1>
        <p className="text-muted text-sm mb-10">Last updated: March 27, 2026</p>

        <div className="space-y-10 text-muted leading-relaxed text-sm">

          <Section title="1. Who We Are">
            <p>
              RaiseGG is operated by RaiseGG ("we", "us", "our"). We run a skill-based competitive
              stake platform for CS2, Dota 2 and Deadlock. Questions? Contact us at{' '}
              <a href="mailto:hello@raisegg.com" className="text-accent-cyan hover:underline">hello@raisegg.com</a>.
            </p>
          </Section>

          <Section title="2. Data We Collect">
            <p>We collect the minimum data required to operate the platform:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-white font-medium">Steam account data</span> — your Steam ID, public display name, and avatar URL, obtained via Steam OpenID. We request read-only access. We never receive your Steam password.</li>
              <li><span className="text-white font-medium">Wallet addresses</span> — your Solana and/or EVM public wallet address, used for USDC deposits and withdrawals.</li>
              <li><span className="text-white font-medium">Match data</span> — match history, ELO ratings, stake amounts, win/loss records.</li>
              <li><span className="text-white font-medium">Transaction records</span> — USDC deposit, withdrawal, win and loss amounts for accounting and dispute resolution.</li>
              <li><span className="text-white font-medium">Country</span> — optionally provided on your profile for leaderboard display. Never used for restriction or profiling.</li>
              <li><span className="text-white font-medium">Session data</span> — an encrypted session token stored in a browser cookie, used to keep you logged in. Expires after 30 days of inactivity.</li>
            </ul>
          </Section>

          <Section title="3. Data We Do NOT Collect">
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Email address (unless you contact us directly)</li>
              <li>Phone number, national ID, or government documents</li>
              <li>Payment card information (all payments are on-chain via USDC)</li>
              <li>Private keys or seed phrases — never share these with anyone</li>
              <li>IP address logging beyond standard server access logs</li>
            </ul>
          </Section>

          <Section title="4. How We Use Your Data">
            <p>Your data is used exclusively to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Authenticate you via Steam OpenID</li>
              <li>Credit and debit your platform USDC balance</li>
              <li>Match you with opponents and record match outcomes</li>
              <li>Resolve disputes fairly using transaction and match history</li>
              <li>Calculate ELO rankings and display leaderboards</li>
              <li>Enforce bans in response to confirmed cheating or ToS violations</li>
            </ul>
          </Section>

          <Section title="5. Data Sharing">
            <p>
              We do not sell, rent, or trade your personal data to any third party.
            </p>
            <p>
              We use the following infrastructure providers who process data on our behalf under appropriate
              data processing terms:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-white font-medium">Supabase</span> — database and authentication infrastructure (EU region)</li>
              <li><span className="text-white font-medium">Vercel</span> — web hosting and serverless functions</li>
              <li><span className="text-white font-medium">Solana blockchain</span> — your wallet address and transaction data are public on-chain by nature</li>
              <li><span className="text-white font-medium">Steam</span> — your public Steam profile is fetched at login and cached</li>
            </ul>
            <p>
              On-chain USDC transfers are recorded on the Solana public ledger and are permanently visible.
              This is inherent to blockchain technology and not within our control.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain match history, transaction records and ELO data indefinitely as they form the
              core historical record of the platform. Session tokens expire after 30 days of inactivity.
            </p>
            <p>
              If you request account deletion, we will remove your username, Steam ID and avatar from our
              database. Match and transaction records will be anonymised (player ID replaced with a deleted
              placeholder) rather than deleted, as they are required for financial accounting and dispute records.
            </p>
          </Section>

          <Section title="7. Your Rights (GDPR)">
            <p>If you are in the EEA, UK or Switzerland, you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-white font-medium">Access</span> — request a copy of your personal data</li>
              <li><span className="text-white font-medium">Rectification</span> — correct inaccurate data</li>
              <li><span className="text-white font-medium">Erasure</span> — request deletion of your account (subject to retention obligations above)</li>
              <li><span className="text-white font-medium">Portability</span> — receive your data in a machine-readable format</li>
              <li><span className="text-white font-medium">Objection</span> — object to processing in certain circumstances</li>
            </ul>
            <p>
              To exercise any of these rights, email{' '}
              <a href="mailto:hello@raisegg.com" className="text-accent-cyan hover:underline">hello@raisegg.com</a>{' '}
              with the subject line "Data Request".
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              We use a single first-party session cookie (<code className="text-accent-cyan bg-space-800 px-1 rounded text-xs">rgg_session</code>)
              that is strictly necessary for authentication. We do not use advertising cookies, tracking pixels, or third-party analytics cookies.
            </p>
          </Section>

          <Section title="9. Children">
            <p>
              RaiseGG is strictly for users aged 18 and over. We do not knowingly collect data from
              anyone under 18. If you believe a minor has registered, contact us immediately at{' '}
              <a href="mailto:hello@raisegg.com" className="text-accent-cyan hover:underline">hello@raisegg.com</a>.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this policy. Material changes will be announced on our Telegram. Continued use
              of the platform after the effective date constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For privacy questions or data requests:{' '}
              <a href="mailto:hello@raisegg.com" className="text-accent-cyan hover:underline">hello@raisegg.com</a>
            </p>
          </Section>

        </div>
      </div>
    </>
  )
}
