import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { leaderboardSchema, breadcrumbSchema } from '@/lib/schemas'
import { COUNTRY_NAMES, COUNTRY_FLAGS } from '@/lib/countries'
import type { Player } from '@/types'

// Build a slug-to-code map: "turkey" -> "TR", "united-states" -> "US", etc.
const SLUG_TO_CODE: Record<string, string> = {}
const CODE_TO_SLUG: Record<string, string> = {}
for (const [code, name] of Object.entries(COUNTRY_NAMES)) {
  const slug = name.toLowerCase().replace(/\s+/g, '-')
  SLUG_TO_CODE[slug] = code
  CODE_TO_SLUG[code] = slug
}

type Props = { params: Promise<{ country: string }> }

export async function generateStaticParams() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('players')
    .select('country')
    .not('country', 'is', null)
    .eq('eligible', true)
    .eq('banned', false)

  if (!data) return []

  const codes = new Set(data.map((p) => p.country).filter(Boolean) as string[])
  return Array.from(codes)
    .filter((code) => CODE_TO_SLUG[code])
    .map((code) => ({ country: CODE_TO_SLUG[code] }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country: slug } = await params
  const code = SLUG_TO_CODE[slug]
  if (!code) notFound()

  const name = COUNTRY_NAMES[code]
  const flag = COUNTRY_FLAGS[code] ?? ''

  return {
    title: `Top CS2 & Dota 2 Players from ${name} ${flag} | RaiseGG`,
    description: `Leaderboard of the best CS2, Dota 2, and Deadlock players from ${name} on RaiseGG. See who ranks highest by ELO, win rate, and total matches.`,
    alternates: { canonical: `https://raisegg.com/leaderboard/${slug}` },
    openGraph: {
      title: `${name} Esports Leaderboard | RaiseGG`,
      description: `Top CS2, Dota 2 & Deadlock players from ${name}. Updated live.`,
      url: `https://raisegg.com/leaderboard/${slug}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(name + ' Leaderboard')}&sub=Top+Players&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} Esports Leaderboard | RaiseGG`,
      images: [`/api/og?title=${encodeURIComponent(name + ' Leaderboard')}&sub=Top+Players&color=7b61ff`],
    },
  }
}

export default async function CountryLeaderboardPage({ params }: Props) {
  const { country: slug } = await params
  const code = SLUG_TO_CODE[slug]
  if (!code) notFound()

  const name = COUNTRY_NAMES[code]
  const flag = COUNTRY_FLAGS[code] ?? ''

  const supabase = createServiceClient()

  // All eligible players from this country, sorted by highest ELO across any game
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('country', code)
    .eq('eligible', true)
    .eq('banned', false)
    .order('cs2_elo', { ascending: false })
    .limit(100)

  const players = (data ?? []) as Player[]

  // Sort by best ELO across all games
  const sorted = players.sort((a, b) => {
    const bestA = Math.max(a.cs2_elo, a.dota2_elo, a.deadlock_elo)
    const bestB = Math.max(b.cs2_elo, b.dota2_elo, b.deadlock_elo)
    return bestB - bestA
  })

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
    { name: name, url: `https://raisegg.com/leaderboard/${slug}` },
  ])

  // Get other countries that have players for cross-linking
  const { data: otherCountries } = await supabase
    .from('players')
    .select('country')
    .not('country', 'is', null)
    .eq('eligible', true)
    .eq('banned', false)
    .neq('country', code)

  const neighborCodes = new Set((otherCountries ?? []).map((p) => p.country).filter(Boolean) as string[])
  const neighborLinks = Array.from(neighborCodes)
    .filter((c) => CODE_TO_SLUG[c] && COUNTRY_NAMES[c])
    .sort((a, b) => (COUNTRY_NAMES[a] ?? '').localeCompare(COUNTRY_NAMES[b] ?? ''))
    .slice(0, 20)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lbSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb nav */}
        <nav className="text-sm text-muted mb-6">
          <Link href="/leaderboard" className="text-accent-cyan hover:underline">Leaderboard</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{name}</span>
        </nav>

        <h1 className="font-orbitron text-3xl md:text-4xl font-black mb-2">
          {flag && <span className="mr-2">{flag}</span>}
          <span className="text-gradient">{name}</span> <span className="text-white">Leaderboard</span>
        </h1>
        <p className="text-muted text-sm mb-8">
          Top CS2, Dota 2, and Deadlock players from {name} ranked by highest ELO. {sorted.length} player{sorted.length !== 1 ? 's' : ''} ranked.
        </p>

        {/* Game filter links */}
        <div className="flex gap-3 mb-8 text-sm">
          <Link href={`/leaderboard?game=cs2`} className="px-3 py-1.5 rounded bg-space-800 border border-border text-muted hover:text-white">CS2</Link>
          <Link href={`/leaderboard?game=dota2`} className="px-3 py-1.5 rounded bg-space-800 border border-border text-muted hover:text-white">Dota 2</Link>
          <Link href={`/leaderboard?game=deadlock`} className="px-3 py-1.5 rounded bg-space-800 border border-border text-muted hover:text-white">Deadlock</Link>
          <Link href={`/play`} className="px-3 py-1.5 rounded bg-space-800 border border-border text-muted hover:text-white">Play Now</Link>
        </div>

        {sorted.length === 0 ? (
          <div className="card text-center py-20">
            <p className="text-muted mb-4">No ranked players from {name} yet.</p>
            <Link href="/api/auth/steam" className="btn-primary px-6 py-3">Be the First — Connect Steam</Link>
          </div>
        ) : (
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
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => {
                  const bestElo = Math.max(p.cs2_elo, p.dota2_elo, p.deadlock_elo)
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Cross-links to other countries */}
        {neighborLinks.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title mb-4">Leaderboards by Country</h2>
            <div className="flex flex-wrap gap-2">
              {neighborLinks.map((c) => (
                <Link
                  key={c}
                  href={`/leaderboard/${CODE_TO_SLUG[c]}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-accent-cyan hover:underline transition-colors"
                >
                  {COUNTRY_FLAGS[c] ?? ''} {COUNTRY_NAMES[c]}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Internal links */}
        <section className="mt-12 flex justify-center gap-4 text-sm">
          <Link href="/play" className="text-accent-cyan hover:underline">Play Now</Link>
          <span className="text-gray-600">&bull;</span>
          <Link href="/leaderboard" className="text-accent-cyan hover:underline">Global Leaderboard</Link>
          <span className="text-gray-600">&bull;</span>
          <Link href="/tournaments" className="text-accent-cyan hover:underline">Tournaments</Link>
          <span className="text-gray-600">&bull;</span>
          <Link href="/how-it-works" className="text-accent-cyan hover:underline">How It Works</Link>
        </section>
      </div>
    </>
  )
}
