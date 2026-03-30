import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { videoGameSchema, faqSchema, breadcrumbSchema } from '@/lib/schemas'
import type { Game, Player, Match } from '@/types'
import { Trophy, Zap, Shield, Users } from 'lucide-react'

const GAME_CONFIG = {
  cs2: {
    name: 'Counter-Strike 2',
    short: 'CS2',
    eloCol: 'cs2_elo',
    winsCol: 'cs2_wins',
    lossesCol: 'cs2_losses',
    color: '00d4ff',
    badge: 'Most Popular',
    description: 'Counter-Strike 2 on dedicated servers. Stake USDC or USDT, play the match, get paid automatically.',
    heroImage: 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg',
    faqs: [
      { question: 'How do CS2 stake matches work on RaiseGG?', answer: 'Create a lobby with your desired stake amount in USDC or USDT. An opponent joins and deposits the same amount. Play on our dedicated CS2 server. The winner receives 90% of the total pot instantly via Solana.' },
      { question: 'What CS2 match formats are available?', answer: 'RaiseGG supports 1v1 and 5v5 CS2 stake matches. 1v1 matches are played as best-of-30 on competitive maps. 5v5 matches follow standard competitive rules.' },
      { question: 'Are CS2 results verified automatically?', answer: 'Yes. Matches run on our dedicated CS2 servers. Results are recorded automatically with no manual reporting needed.' },
      { question: 'What is the minimum stake for CS2?', answer: 'The minimum stake is $2 USDC or USDT. There is no maximum — you can stake as much as you want.' },
      { question: 'Do I need a VAC-clean account?', answer: 'Yes. All players are screened for VAC bans before they can stake. Your Steam account must be in good standing.' },
    ],
  },
  dota2: {
    name: 'Dota 2',
    short: 'Dota 2',
    eloCol: 'dota2_elo',
    winsCol: 'dota2_wins',
    lossesCol: 'dota2_losses',
    color: 'e74c3c',
    badge: 'MOBA',
    description: 'Dota 2 stake matches with auto-verified results via Steam API. Compete for USDC or USDT.',
    heroImage: 'https://cdn.akamai.steamstatic.com/steam/apps/570/library_hero.jpg',
    faqs: [
      { question: 'How do Dota 2 stake matches work on RaiseGG?', answer: 'Create a lobby, set your USDC or USDT stake. An opponent joins with an equal deposit. Play your Dota 2 match. Results are verified via Steam API and the winner receives 90% of the pot instantly.' },
      { question: 'What Dota 2 formats does RaiseGG support?', answer: 'RaiseGG supports 1v1 mid matches and full 5v5 Dota 2 matches. 1v1 matches use standard solo mid rules (first to 2 kills, first tower, or 10 min CS lead).' },
      { question: 'How are Dota 2 results verified?', answer: 'Results are automatically verified via the Steam Web API. Match IDs are tracked and outcomes confirmed without manual input.' },
      { question: 'What is the minimum Dota 2 stake?', answer: 'The minimum stake is $2 USDC or USDT per player. No maximum limit.' },
      { question: 'Can I play ranked Dota 2 for stakes?', answer: 'RaiseGG matches are separate from Valve ranked matchmaking. You play in custom lobbies tracked by our platform.' },
    ],
  },
  deadlock: {
    name: 'Deadlock',
    short: 'Deadlock',
    eloCol: 'deadlock_elo',
    winsCol: 'deadlock_wins',
    lossesCol: 'deadlock_losses',
    color: '9b59b6',
    badge: 'New',
    description: 'Deadlock stake matches — the first and only platform for competitive Deadlock staking.',
    heroImage: 'https://cdn.akamai.steamstatic.com/steam/apps/1422450/library_hero.jpg',
    faqs: [
      { question: 'How do Deadlock stake matches work?', answer: 'Create a lobby with your USDC or USDT stake amount. An opponent deposits an equal amount. Play your Deadlock match and the winner receives 90% of the pot via Solana smart contract.' },
      { question: 'Is RaiseGG the only platform for Deadlock staking?', answer: 'Yes. RaiseGG is currently the first and only platform offering competitive Deadlock matches with real USDC/USDT stakes.' },
      { question: 'What Deadlock formats are supported?', answer: 'RaiseGG supports 1v1 Deadlock matches. Team formats will be added as the game evolves.' },
      { question: 'How are Deadlock results tracked?', answer: 'Results are verified through game API integration. Both players confirm the outcome, with dispute resolution available if needed.' },
      { question: 'What is the minimum Deadlock stake?', answer: 'The minimum stake is $2 USDC or USDT. No KYC required — just a Steam account in good standing.' },
    ],
  },
} as const

type GameSlug = keyof typeof GAME_CONFIG

type Props = { params: Promise<{ game: string }> }

export function generateStaticParams() {
  return [{ game: 'cs2' }, { game: 'dota2' }, { game: 'deadlock' }]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params
  const config = GAME_CONFIG[game as GameSlug]
  if (!config) notFound()

  return {
    title: `Play ${config.short} 1v1 Matches for Real Stakes | RaiseGG`,
    description: `${config.description} Join ${config.short} lobbies on RaiseGG, the skill-based esports staking platform. $2 minimum, instant payouts, no KYC.`,
    alternates: { canonical: `https://raisegg.com/play/${game}` },
    openGraph: {
      title: `Play ${config.short} for Real Stakes | RaiseGG`,
      description: `${config.short} stake matches with instant USDC/USDT payouts. Join now.`,
      url: `https://raisegg.com/play/${game}`,
      type: 'website',
      images: [{ url: `/api/og?title=Play+${encodeURIComponent(config.short)}&sub=Real+Stakes+%E2%80%A2+Instant+Payout&color=${config.color}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Play ${config.short} for Real Stakes | RaiseGG`,
      images: [`/api/og?title=Play+${encodeURIComponent(config.short)}&sub=Real+Stakes+%E2%80%A2+Instant+Payout&color=${config.color}`],
    },
  }
}

const OTHER_GAMES: Record<GameSlug, { slug: GameSlug; name: string; desc: string }[]> = {
  cs2: [
    { slug: 'dota2', name: 'Dota 2', desc: 'Auto-verified results via Steam API' },
    { slug: 'deadlock', name: 'Deadlock', desc: 'First & only stake platform' },
  ],
  dota2: [
    { slug: 'cs2', name: 'CS2', desc: 'Dedicated servers, instant payout' },
    { slug: 'deadlock', name: 'Deadlock', desc: 'First & only stake platform' },
  ],
  deadlock: [
    { slug: 'cs2', name: 'CS2', desc: 'Dedicated servers, instant payout' },
    { slug: 'dota2', name: 'Dota 2', desc: 'Auto-verified results via Steam API' },
  ],
}

export default async function PlayGamePage({ params }: Props) {
  const { game } = await params
  const config = GAME_CONFIG[game as GameSlug]
  if (!config) notFound()

  const supabase = createServiceClient()

  // Top 10 players for this game
  const { data: topPlayers } = await supabase
    .from('players')
    .select('id, username, avatar_url, cs2_elo, dota2_elo, deadlock_elo, cs2_wins, cs2_losses, dota2_wins, dota2_losses, deadlock_wins, deadlock_losses, country')
    .eq('eligible', true)
    .eq('banned', false)
    .order(config.eloCol, { ascending: false })
    .limit(10)

  // Recent completed matches for this game
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('id, game, format, stake_amount, currency, status, created_at, resolved_at, winner_id, player_a:players!player_a_id(username), player_b:players!player_b_id(username)')
    .eq('game', game)
    .eq('status', 'completed')
    .order('resolved_at', { ascending: false })
    .limit(10)

  const players = (topPlayers ?? []) as Player[]
  const matches = (recentMatches ?? []) as unknown as (Match & { player_a: { username: string } | null; player_b: { username: string } | null })[]

  const gameSchema = videoGameSchema(game as Game)
  const faqJsonLd = faqSchema([...config.faqs])
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Play', url: 'https://raisegg.com/play' },
    { name: config.short, url: `https://raisegg.com/play/${game}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section className="relative bg-gradient-hero border-b border-border overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-accent-cyan/8 rounded-full blur-3xl" />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none hidden lg:block">
          <img
            src={config.heroImage}
            alt={`${config.name} gameplay artwork`}
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-space-900 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <span className="badge-purple mb-4 inline-block text-xs">{config.short} — {config.badge}</span>
          <h1 className="font-orbitron text-5xl md:text-6xl font-black mb-4">
            Play <span className="text-gradient">{config.short}</span> <span className="text-white">for Real Stakes</span>
          </h1>
          <p className="text-xl text-muted max-w-xl mb-8 leading-relaxed">
            {config.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={`/play?game=${game}`} className="btn-primary px-8 py-4 text-base">
              Browse {config.short} Lobbies
            </Link>
            <Link href="/api/auth/steam" className="btn-secondary px-8 py-4 text-base">
              Connect Steam
            </Link>
          </div>
          <p className="text-xs text-muted mt-4">$2 minimum stake · No KYC · Instant payouts</p>
        </div>
      </section>

      {/* Key stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Trophy, label: 'Platform Fee', value: '10%' },
            { icon: Zap, label: 'Payout Speed', value: 'Instant' },
            { icon: Shield, label: 'Min Stake', value: '$2' },
            { icon: Users, label: 'Formats', value: '1v1 & 5v5' },
          ].map((s) => (
            <div key={s.label} className="card text-center">
              <s.icon className="w-6 h-6 text-accent-cyan mx-auto mb-2" />
              <div className="font-orbitron text-xl font-bold text-gradient">{s.value}</div>
              <div className="text-xs text-muted uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Top 10 Players */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">Top {config.short} Players</h2>
          <Link href={`/leaderboard?game=${game}`} className="text-sm text-accent-cyan hover:underline">
            Full leaderboard &rarr;
          </Link>
        </div>
        {players.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted">No ranked players yet. Be the first to compete.</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">Player</th>
                  <th className="text-right py-3 px-4">ELO</th>
                  <th className="text-right py-3 px-4">W/L</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const elo = p[config.eloCol as keyof Player] as number
                  const wins = p[config.winsCol as keyof Player] as number
                  const losses = p[config.lossesCol as keyof Player] as number
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-orbitron text-muted">{i + 1}</td>
                      <td className="py-3 px-4">
                        <Link href={`/profile/${p.username}`} className="text-accent-cyan hover:underline font-semibold">
                          {p.username}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right font-orbitron font-bold text-white">{elo}</td>
                      <td className="py-3 px-4 text-right text-muted">{wins}W / {losses}L</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Matches */}
      <section className="bg-space-800 border-y border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title mb-6">Recent {config.short} Matches</h2>
          {matches.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-muted">No completed matches yet. Create the first lobby.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {matches.map((m) => (
                <div key={m.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="badge-cyan text-xs">{m.format}</span>
                    <span className="text-white font-semibold">
                      {m.player_a?.username ?? 'Unknown'}
                    </span>
                    <span className="text-muted text-xs">vs</span>
                    <span className="text-white font-semibold">
                      {m.player_b?.username ?? 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-accent-cyan font-orbitron text-sm">
                      ${m.stake_amount} {m.currency?.toUpperCase()}
                    </span>
                    {m.resolved_at && (
                      <span className="text-muted text-xs">
                        {new Date(m.resolved_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title text-center mb-8">{config.short} Frequently Asked Questions</h2>
        <div className="space-y-3">
          {config.faqs.map((faq) => (
            <div key={faq.question} className="card">
              <h3 className="font-semibold text-white text-sm mb-2">{faq.question}</h3>
              <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Also on RaiseGG */}
      <section className="bg-space-800 border-y border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-6">Also on RaiseGG</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {OTHER_GAMES[game as GameSlug].map((g) => (
              <Link key={g.slug} href={`/play/${g.slug}`} className="card-hover block text-center py-6">
                <h3 className="font-orbitron font-bold text-white mb-1">{g.name}</h3>
                <p className="text-muted text-sm">{g.desc}</p>
              </Link>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-6 text-sm">
            <Link href="/leaderboard" className="text-accent-cyan hover:underline">Leaderboard</Link>
            <span className="text-gray-600">&bull;</span>
            <Link href="/how-it-works" className="text-accent-cyan hover:underline">How It Works</Link>
            <span className="text-gray-600">&bull;</span>
            <Link href="/faq" className="text-accent-cyan hover:underline">FAQ</Link>
            <span className="text-gray-600">&bull;</span>
            <Link href="/tournaments" className="text-accent-cyan hover:underline">Tournaments</Link>
          </div>
        </div>
      </section>
    </>
  )
}
