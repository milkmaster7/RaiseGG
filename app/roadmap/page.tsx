import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { CheckCircle2, Clock, Rocket, Calendar } from 'lucide-react'

export const metadata: Metadata = {
  title: "Roadmap — What We're Building Next",
  description: "See what's live, in progress and planned for RaiseGG. Transparent development — no hidden agendas.",
  alternates: { canonical: 'https://raisegg.com/roadmap' },
  openGraph: {
    title: 'RaiseGG – Public Roadmap',
    description: "What's live, in progress, and planned. Full transparency.",
    url: 'https://raisegg.com/roadmap',
    images: [{ url: '/api/og?title=Public+Roadmap&sub=Full+Transparency&color=7b61ff', width: 1200, height: 630 }],
  },
}

type RoadmapItem = { title: string; description: string }

const SHIPPED: RoadmapItem[] = [
  { title: 'CS2 1v1 Stake Matches', description: 'Dedicated servers with MatchZy, automated results, USDC/USDT payouts.' },
  { title: 'Dota 2 Stake Matches', description: 'Submit match ID, Steam API verifies result, instant payout.' },
  { title: 'Deadlock Support', description: 'First platform to support Valve\'s newest game for competitive stakes.' },
  { title: 'Solana Smart Contract Escrow', description: 'Trustless vaults — funds locked until match resolves.' },
  { title: 'ELO Rating System', description: 'Per-game rankings with tier badges (Bronze → Champion).' },
  { title: 'Steam Account Verification', description: 'Automatic VAC check, hours played, account age.' },
  { title: 'Live Match Feed', description: 'Real-time lobby browser with game filters.' },
  { title: 'Leaderboard', description: 'Global and per-game leaderboards by ELO.' },
]

const IN_PROGRESS: RoadmapItem[] = [
  { title: 'Friends & Chat', description: 'Add friends, send messages, invite to matches via Supabase Realtime.' },
  { title: 'Free Play Mode (Pioneer League)', description: 'Play for ELO only — no stake required. Perfect for warming up or new players.' },
  { title: 'Matchmaking Queue', description: 'Press "Find Match" and get auto-paired by ELO, game and region.' },
  { title: 'Tournaments', description: 'Bracket tournaments with prize pools. 1v1 and 5v5 formats.' },
  { title: 'Map Veto System', description: 'Pick/ban maps before CS2 matches — competitive format.' },
]

const PLANNED: RoadmapItem[] = [
  { title: 'Duo Queue', description: '2v2 stake matches with shared ELO.' },
  { title: '5v5 Team System', description: 'Create teams, captain picks, team rankings, scrims.' },
  { title: 'Weekly Challenges', description: 'Complete challenges to earn bonus USDC rewards and XP.' },
  { title: 'Referral Rewards', description: 'Invite friends, earn a % of their first stakes as a bonus.' },
  { title: 'Demo Storage', description: '90-day replay storage for all matches. Download .dem files anytime.' },
  { title: 'Skill Verification', description: 'Import stats from FACEIT and Leetify to verify true skill level.' },
  { title: 'Community Forum', description: 'Discussion threads, team recruitment, match highlights.' },
  { title: 'Mobile App', description: 'Native iOS and Android app with wallet integration.' },
  { title: 'Practice/Warmup Servers', description: 'Free aim training and DM servers before your match.' },
]

function Section({
  icon: Icon,
  title,
  color,
  items,
}: {
  icon: typeof CheckCircle2
  title: string
  color: string
  items: RoadmapItem[]
}) {
  return (
    <div className="mb-12">
      <h2 className="font-orbitron text-xl font-bold text-white mb-6 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        {title}
        <span className="text-xs text-muted font-normal ml-1">({items.length})</span>
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.title} className="card">
            <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
            <p className="text-muted text-xs leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RoadmapPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Roadmap', url: 'https://raisegg.com/roadmap' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="font-orbitron text-4xl sm:text-5xl font-black mb-4">
            <span className="text-gradient">Roadmap</span>
          </h1>
          <p className="text-muted text-lg max-w-2xl">
            Everything we've shipped, what we're building now, and what's next. No hidden agendas — this is the full picture.
          </p>
        </div>

        <Section icon={CheckCircle2} title="Shipped" color="text-green-400" items={SHIPPED} />
        <Section icon={Clock} title="In Progress" color="text-yellow-400" items={IN_PROGRESS} />
        <Section icon={Calendar} title="Planned" color="text-accent-purple" items={PLANNED} />

        <div className="card text-center py-8 mt-4">
          <Rocket className="w-6 h-6 text-accent-cyan mx-auto mb-3" />
          <h2 className="font-orbitron text-lg font-bold text-white mb-2">Got a Feature Request?</h2>
          <p className="text-muted text-sm mb-4">Tell us what you want built — we listen to our community.</p>
          <div className="flex gap-3 justify-center">
            <a href="https://t.me/raisegg" target="_blank" rel="noopener noreferrer" className="btn-primary px-6 py-2.5 text-sm">
              Telegram
            </a>
            <a href="mailto:hello@raisegg.com" className="btn-secondary px-6 py-2.5 text-sm">
              Email Us
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
