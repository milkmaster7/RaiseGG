import type { Metadata } from 'next'
import { howToSchema, faqSchema, breadcrumbSchema, priceSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'How It Works — Start Staking in 2 Minutes',
  description: 'Learn how RaiseGG works. Connect Steam, deposit USDC or USDT, find a match and compete. Winnings paid instantly via Solana smart contract. Takes 2 minutes to start.',
  alternates: { canonical: 'https://raisegg.com/how-it-works' },
  openGraph: {
    title: 'RaiseGG – How It Works',
    description: 'Connect Steam, stake USDC or USDT, play and win. Takes 2 minutes to start.',
    url: 'https://raisegg.com/how-it-works',
    images: [{ url: '/api/og?title=How+It+Works&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG – How It Works',
    images: ['/api/og?title=How+It+Works&sub=RaiseGG&color=7b61ff'],
  },
}

const STEPS = [
  {
    name: 'Connect your Steam account',
    text: 'Click "Connect Steam" and authorize via Steam OpenID. We verify your account age, VAC ban status, and hours played automatically. No passwords shared.',
    url: 'https://raisegg.com/how-it-works#step-1',
  },
  {
    name: 'Set up your wallet and deposit USDC or USDT',
    text: 'Connect a Phantom or Solflare wallet. Deposit USDC or USDT — your balance is held securely in a Solana smart contract. No middleman.',
    url: 'https://raisegg.com/how-it-works#step-2',
  },
  {
    name: 'Find or create a stake match',
    text: 'Browse open lobbies on the play page or create your own. Set your game (CS2, Dota 2, or Deadlock), format (1v1 or 5v5), and stake amount.',
    url: 'https://raisegg.com/how-it-works#step-3',
  },
  {
    name: 'Play the match',
    text: 'For Dota 2: play in your normal client. For CS2: connect to our dedicated server using the details sent after match creation.',
    url: 'https://raisegg.com/how-it-works#step-4',
  },
  {
    name: 'Result verified, payout instant',
    text: 'For Dota 2, submit your match ID — we verify via Steam API. For CS2, results are submitted automatically. Winner receives 90% of the pot instantly.',
    url: 'https://raisegg.com/how-it-works#step-5',
  },
]

const FAQS = [
  { question: 'How long does payout take?', answer: 'Seconds. Solana settles in under 1 second. Once the match result is verified, the smart contract releases funds immediately.' },
  { question: 'What if the Steam API is slow?', answer: 'We poll the Steam API every 2 minutes for up to 30 minutes. If a result can\'t be fetched, we attempt an OpenDota cross-check. If both fail, you can raise a dispute.' },
  { question: 'Can I cancel a match?', answer: 'You can cancel any time before an opponent joins. Once both players have staked, the match is locked — cancellation is only possible via dispute.' },
]

export default function HowItWorksPage() {
  const howTo = howToSchema(STEPS)
  const faqs = faqSchema(FAQS)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'How It Works', url: 'https://raisegg.com/how-it-works' },
  ])
  const price = priceSchema()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqs).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(price).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">How It Works</h1>
        <p className="text-muted mb-12 text-lg">Five steps. Two minutes. Real money on the line.</p>

        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <div key={step.name} id={`step-${i + 1}`} className="card flex gap-6">
              <div className="font-orbitron text-3xl font-black text-accent-cyan/20 flex-shrink-0 w-12">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <h2 className="font-orbitron font-bold text-white mb-2">{step.name}</h2>
                <p className="text-muted text-sm leading-relaxed">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="font-orbitron text-xl font-bold text-white mb-6">Still have questions?</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.question} className="card">
                <h3 className="font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
