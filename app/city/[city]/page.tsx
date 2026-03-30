import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { leaderboardSchema, breadcrumbSchema } from '@/lib/schemas'
import type { Player } from '@/types'

function titleCase(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-')
}

type Props = { params: Promise<{ city: string }> }

export async function generateStaticParams() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('players')
    .select('city')
    .not('city', 'is', null)
    .eq('eligible', true)
    .eq('banned', false)

  if (!data) return []

  const cities = new Set(
    (data.map((p) => p.city).filter(Boolean) as string[]).map(toSlug)
  )
  return Array.from(cities).map((city) => ({ city }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params
  const cityName = titleCase(slug)

  // Verify city exists in DB
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .ilike('city', cityName.replace(/-/g, ' '))
    .eq('eligible', true)
    .eq('banned', false)

  if (!count || count === 0) notFound()

  return {
    title: `Best Esports Players in ${cityName} | RaiseGG`,
    description: `Discover the top CS2, Dota 2, and Deadlock players in ${cityName}. City leaderboard with ELO rankings, win rates, and match stats on RaiseGG.`,
    alternates: { canonical: `https://raisegg.com/city/${slug}` },
    openGraph: {
      title: `Best Esports Players in ${cityName} | RaiseGG`,
      description: `Top competitive gamers in ${cityName}. CS2, Dota 2 & Deadlock rankings.`,
      url: `https://raisegg.com/city/${slug}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(cityName)}&sub=City+Leaderboard&color=00e6ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Best Esports Players in ${cityName} | RaiseGG`,
      images: [`/api/og?title=${encodeURIComponent(cityName)}&sub=City+Leaderboard&color=00e6ff`],
    },
  }
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params
  const cityName = titleCase(slug)

  const supabase = createServiceClient()

  // Get all players in this city
  const { data } = await supabase
    .from('players')
    .select('*')
    .ilike('city', cityName.replace(/-/g, ' '))
    .eq('eligible', true)
    .eq('banned', false)
    .order('cs2_elo', { ascending: false })
    .limit(100)

  const players = (data ?? []) as Player[]
  if (players.length === 0) notFound()

  // Sort by best ELO
  const sorted = players.sort((a, b) => {
    const bestA = Math.max(a.cs2_elo, a.dota2_elo, a.deadlock_elo)
    const bestB = Math.max(b.cs2_elo, b.dota2_elo, b.deadlock_elo)
    return bestB - bestA
  })

  // City aggregate stats
  const totalWins = players.reduce((s, p) => s + p.cs2_wins + p.dota2_wins + p.deadlock_wins, 0)
  const totalLosses = players.reduce((s, p) => s + p.cs2_losses + p.dota2_losses + p.deadlock_losses, 0)
  const totalMatches = totalWins + totalLosses
  const avgElo = players.length > 0
    ? Math.round(players.reduce((s, p) => s + Math.max(p.cs2_elo, p.dota2_elo, p.deadlock_elo), 0) / players.length)
    : 0

  const lbSchema = leaderboardSchema(
    sorted.slice(0, 10).map((p, i) => ({
      name: p.username,
      rank: i + 1,
      url: `https://raisegg.com/profile/${p.username}`,
    }))
  )
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Leaderboard', url: 'https://raisegg.com/leaderboard' },
    { name: cityName, url: `https://raisegg.com/city/${slug}` },
  ])

  // Get other cities for cross-linking
  const { data: otherCities } = await supabase
    .from('players')
    .select('city')
    .not('city', 'is', null)
    .eq('eligible', true)
    .eq('banned', false)

  const citySet = new Set(
    ((otherCities ?? []).map((p) => p.city).filter(Boolean) as string[])
      .map((c) => c.trim())
      .filter((c) => c.toLowerCase() !== cityName.toLowerCase().replace(/-/g, ' '))
  )
  const otherCityLinks = Array.from(citySet).sort().slice(0, 20)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lbSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb nav */}
        <nav className="text-sm text-muted mb-6">
          <Link href="/leaderboard" className="text-accent-cyan hover:underline">Leaderboard</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{cityName}</span>
        </nav>

        <h1 className="font-orbitron text-3xl md:text-4xl font-black mb-2">
          Best Esports Players in <span className="text-gradient">{cityName}</span>
        </h1>
        <p className="text-muted text-sm mb-8">
          {sorted.length} ranked player{sorted.length !== 1 ? 's' : ''} competing from {cityName} on RaiseGG.
        </p>

        {/* City stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Players', value: String(sorted.length) },
            { label: 'Total Wins', value: totalWins.toLocaleString() },
            { label: 'Total Matches', value: totalMatches.toLocaleString() },
            { label: 'Avg Best ELO', value: String(avgElo) },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className="font-orbitron text-2xl font-bold text-gradient">{stat.value}</div>
              <div className="text-xs text-muted uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Player table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3 px-4">Player</th>
                <th className="text-right py-3 px-4">CS2</th>
                <th className="text-right py-3 px-4">Dota 2</th>
                <th className="text-right py-3 px-4">Deadlock</th>
                <th className="text-right py-3 px-4">Best ELO</th>
                <th className="text-right py-3 px-4">W/L</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const bestElo = Math.max(p.cs2_elo, p.dota2_elo, p.deadlock_elo)
                const totalW = p.cs2_wins + p.dota2_wins + p.deadlock_wins
                const totalL = p.cs2_losses + p.dota2_losses + p.deadlock_losses
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-orbitron text-muted">{i + 1}</td>
                    <td className="py-3 px-4">
                      <Link href={`/profile/${p.username}`} className="text-accent-cyan hover:underline font-semibold">
                        {p.username}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right text-muted">{p.cs2_elo}</td>
                    <td className="py-3 px-4 text-right text-muted">{p.dota2_elo}</td>
                    <td className="py-3 px-4 text-right text-muted">{p.deadlock_elo}</td>
                    <td className="py-3 px-4 text-right font-orbitron font-bold text-white">{bestElo}</td>
                    <td className="py-3 px-4 text-right text-muted">{totalW}W / {totalL}L</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Cross-link to other cities */}
        {otherCityLinks.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title mb-4">Explore Other Cities</h2>
            <div className="flex flex-wrap gap-2">
              {otherCityLinks.map((c) => (
                <Link
                  key={c}
                  href={`/city/${toSlug(c)}`}
                  className="inline-flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-accent-cyan hover:underline transition-colors"
                >
                  {c}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Internal links */}
        <section className="mt-12 flex justify-center gap-4 text-sm flex-wrap">
          <Link href="/play" className="text-accent-cyan hover:underline">Play Now</Link>
          <span className="text-gray-600">&bull;</span>
          <Link href="/leaderboard" className="text-accent-cyan hover:underline">Global Leaderboard</Link>
          <span className="text-gray-600">&bull;</span>
          <Link href="/play/cs2" className="text-accent-cyan hover:underline">CS2 Matches</Link>
          <span className="text-gray-600">&bull;</span>
          <Link href="/play/dota2" className="text-accent-cyan hover:underline">Dota 2 Matches</Link>
          <span className="text-gray-600">&bull;</span>
          <Link href="/play/deadlock" className="text-accent-cyan hover:underline">Deadlock Matches</Link>
          <span className="text-gray-600">&bull;</span>
          <Link href="/tournaments" className="text-accent-cyan hover:underline">Tournaments</Link>
        </section>
      </div>
    </>
  )
}
