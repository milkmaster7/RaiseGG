import type { Metadata } from 'next'
import { faqSchema, breadcrumbSchema } from '@/lib/schemas'
import { Accordion } from '@/components/ui/Accordion'

export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions',
  description: 'Answers to the most common questions about RaiseGG. Stakes, payouts, game eligibility, account security and more. Get started in seconds.',
  alternates: { canonical: 'https://raisegg.com/faq' },
  openGraph: {
    title: 'RaiseGG – FAQ',
    description: 'Everything you need to know about stake matches, payouts and account setup.',
    url: 'https://raisegg.com/faq',
    images: [{ url: '/api/og?title=Frequently+Asked+Questions&sub=RaiseGG&color=7b61ff', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RaiseGG – FAQ',
    images: ['/api/og?title=Frequently+Asked+Questions&sub=RaiseGG&color=7b61ff'],
  },
}

const FAQS = [
  { question: 'How does stake verification work?', answer: 'For Dota 2, submit your match ID after the game — our system pulls the result from Steam\'s API and pays out automatically within minutes. For CS2, matches are played on RaiseGG dedicated servers and results are recorded automatically via MatchZy.' },
  { question: 'Are my staked funds safe?', answer: 'Yes. Stake funds (USDC or USDT) are held in a Solana smart contract — code that neither us nor anyone else can touch. Funds are only released when a verified match result is confirmed by our backend after checking the Steam API.' },
  { question: 'What countries can play?', answer: 'We serve 44 countries across the Caucasus, Turkey, Balkans, and surrounding regions — specifically designed for players who have historically had poor server options on Western platforms like FACEIT.' },
  { question: 'What is the platform fee?', answer: 'We take 10% of the pot from each resolved match. The winner receives 90%. There are no other fees, no subscription, and no hidden charges.' },
  { question: 'What are the account requirements?', answer: 'Your Steam account must be at least 1 year old, have no active VAC bans, and have at least 100 hours played in CS2 or Dota 2. This is verified automatically when you connect your Steam account.' },
  { question: 'What happens if my opponent doesn\'t show up?', answer: 'If your opponent doesn\'t join within 30 minutes, the match is automatically cancelled and your full stake is returned. If a match starts but isn\'t resolved within 3 hours, both players are fully refunded.' },
  { question: 'Can I dispute a match result?', answer: 'Yes. You have 1 hour after match resolution to raise a dispute. Our team reviews the case and can override the result or issue refunds if a technical issue is found.' },
  { question: 'How do I deposit and withdraw USDC or USDT?', answer: 'Connect a Phantom or Solflare wallet to your account. Select USDC or USDT on the Wallet page, then deposit by sending from your wallet. Withdraw anytime — funds arrive in your wallet within seconds on Solana.' },
  { question: 'What wallets are supported?', answer: 'Phantom, Solflare, and Backpack. All major Solana wallets work via our wallet adapter integration.' },
  { question: 'Is there a minimum stake?', answer: 'Yes. Minimum stake amounts increase with rank to prevent high-ELO players from exploiting low-stakes games. Check your rank page for your current minimum.' },
  { question: 'How do I get USDC or USDT in Turkey, Georgia or the Caucasus?', answer: 'Buy USDC or USDT on Binance or OKX — both widely available in the region. Withdraw to your Phantom wallet on the Solana network (not Ethereum or BNB). Then deposit to RaiseGG from your Wallet page and select your preferred currency.' },
  { question: 'Do I need to complete KYC or verify my identity?', answer: 'No. RaiseGG uses Steam OpenID for authentication. We do not collect passport numbers, national IDs, or government documents. A Steam account in good standing is the only requirement.' },
  { question: 'Is RaiseGG legal in my country?', answer: 'RaiseGG operates as a skill-based competition platform — players compete directly against each other, and outcomes depend entirely on player skill, not chance. It is your responsibility to check local laws. We do not provide legal advice.' },
  { question: 'Can I play from my phone?', answer: 'The platform is fully responsive and works on mobile. However, depositing and withdrawing requires a Solana wallet browser extension (like Phantom), which works on desktop. The Phantom mobile app can also be used for wallet management.' },
  { question: 'What if I don\'t have a Phantom wallet yet?', answer: 'Install Phantom from phantom.app. It\'s a free browser extension. Create a wallet, write down your seed phrase (keep it safe offline), then buy USDC or USDT on any major exchange and send it to your Phantom address on the Solana network.' },
  { question: 'How are ELO ratings calculated?', answer: 'We use a modified Elo formula where K (points per match) scales by tier. Each game (CS2, Dota 2) has its own separate ELO. New players start at 1000 ELO (Silver tier). Beating higher-ranked opponents earns more ELO than beating equals.' },
  { question: 'What happens to my funds if RaiseGG shuts down?', answer: 'Funds locked in active match vaults remain in the smart contract — they can be returned via the cancel instruction. Your RaiseGG platform balance (unlocked funds) would need to be withdrawn manually if we ever gave notice of closure. We commit to providing at least 30 days notice for any shutdown.' },
  { question: 'Can I verify the smart contract on-chain?', answer: 'Yes. The RaiseGG escrow program is deployed at BqzXnsQCjBb7v9K4wMiFddfMa3dC1tFhxLEgBqyWpZGv on Solana mainnet. You can verify all vaults and transactions at solscan.io — every match vault, deposit and payout is publicly visible on-chain.' },
]

export default function FAQPage() {
  const faq = faqSchema(FAQS)
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'FAQ', url: 'https://raisegg.com/faq' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-4xl font-black mb-4 text-gradient">FAQ</h1>
        <p className="text-muted mb-12">Everything you need to know about RaiseGG.</p>

        <Accordion items={FAQS} />
      </div>
    </>
  )
}
