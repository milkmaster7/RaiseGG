import type { Metadata } from 'next'
import { faqSchema, breadcrumbSchema } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions',
  description: 'Answers to the most common questions about RaiseGG.gg. Stakes, payouts, game eligibility, account security and more. Get started in seconds.',
  alternates: { canonical: 'https://raisegg.gg/faq' },
  openGraph: {
    title: 'RaiseGG.gg – FAQ',
    description: 'Everything you need to know about stake matches, payouts and account setup.',
    url: 'https://raisegg.gg/faq',
    images: [{ url: '/api/og?title=Frequently+Asked+Questions&sub=RaiseGG.gg&color=7b61ff', width: 1200, height: 630 }],
  },
}

const FAQS = [
  { question: 'How does stake verification work?', answer: 'For Dota 2, submit your match ID after the game — our system pulls the result from Steam\'s API and pays out automatically within minutes. For CS2, matches are played on RaiseGG dedicated servers and results are recorded automatically via MatchZy.' },
  { question: 'Is my USDC safe?', answer: 'Yes. Stake funds are held in a Solana smart contract — code that neither us nor anyone else can touch. Funds are only released when a verified match result is confirmed by our backend after checking the Steam API.' },
  { question: 'What countries can play?', answer: 'We serve 44 countries across the Caucasus, Turkey, Balkans, and surrounding regions — specifically designed for players who have historically had poor server options on Western platforms like FACEIT.' },
  { question: 'What is the platform fee?', answer: 'We take 10% of the pot from each resolved match. The winner receives 90%. There are no other fees, no subscription, and no hidden charges.' },
  { question: 'What are the account requirements?', answer: 'Your Steam account must be at least 1 year old, have no active VAC bans, and have at least 100 hours played in CS2 or Dota 2. This is verified automatically when you connect your Steam account.' },
  { question: 'What happens if my opponent doesn\'t show up?', answer: 'If your opponent doesn\'t join within 30 minutes, the match is automatically cancelled and your full stake is returned. If a match starts but isn\'t resolved within 3 hours, both players are fully refunded.' },
  { question: 'Can I dispute a match result?', answer: 'Yes. You have 1 hour after match resolution to raise a dispute. Our team reviews the case and can override the result or issue refunds if a technical issue is found.' },
  { question: 'How do I deposit and withdraw USDC?', answer: 'Connect a Phantom or Solflare wallet to your account. Deposit by sending USDC from your wallet. Withdraw anytime — funds arrive in your wallet within seconds on Solana.' },
  { question: 'What wallets are supported?', answer: 'Phantom, Solflare, and Backpack. All major Solana wallets work via our wallet adapter integration.' },
  { question: 'Is there a minimum stake?', answer: 'Yes. Minimum stake amounts increase with rank to prevent high-ELO players from exploiting low-stakes games. Check your rank page for your current minimum.' },
]

export default function FAQPage() {
  const faq = faqSchema(FAQS)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.gg' },
    { name: 'FAQ', url: 'https://raisegg.gg/faq' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">FAQ</h1>
        <p className="text-muted mb-12">Everything you need to know about RaiseGG.gg.</p>

        <div className="space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.question} className="card">
              <h2 className="font-semibold text-white mb-2">{faq.question}</h2>
              <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
