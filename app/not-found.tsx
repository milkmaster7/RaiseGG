import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, Swords, Trophy, BarChart2, Gamepad2, BookOpen, Users, HelpCircle, Shield, Home } from 'lucide-react'

export const metadata: Metadata = {
  title: '404 — Page Not Found',
  description: 'The page you are looking for does not exist. Browse CS2, Dota 2 and Deadlock stake matches, tournaments, leaderboards and more on RaiseGG.',
  robots: { index: false, follow: true },
}

const POPULAR_PAGES = [
  { href: '/play', label: 'Find a Match', description: 'Browse open stake matches', icon: Swords },
  { href: '/tournaments', label: 'Tournaments', description: 'Compete in organized events', icon: Trophy },
  { href: '/leaderboard', label: 'Leaderboard', description: 'Top players by ELO', icon: BarChart2 },
  { href: '/games', label: 'Games', description: 'CS2, Dota 2 & Deadlock', icon: Gamepad2 },
  { href: '/teams', label: 'Teams', description: 'Find or create a team', icon: Users },
  { href: '/blog', label: 'Blog', description: 'News and updates', icon: BookOpen },
  { href: '/faq', label: 'FAQ', description: 'Common questions', icon: HelpCircle },
  { href: '/how-it-works', label: 'How It Works', description: 'Platform guide', icon: Shield },
]

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
      {/* Big 404 */}
      <div className="font-orbitron text-8xl md:text-9xl font-black text-gradient mb-2 select-none">404</div>
      <h1 className="font-orbitron text-2xl md:text-3xl font-bold text-white mb-3">Page Not Found</h1>
      <p className="text-muted mb-8 max-w-md text-center">
        This page doesn't exist or was moved. Try searching or pick a page below.
      </p>

      {/* Search box */}
      <form action="/search" method="GET" className="w-full max-w-md mb-12">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            name="q"
            placeholder="Search players, matches, games..."
            className="input pl-10 pr-4"
            autoFocus
            aria-label="Search RaiseGG"
          />
        </div>
      </form>

      {/* Popular pages grid */}
      <div className="w-full max-w-3xl">
        <h2 className="text-sm text-muted uppercase tracking-wider font-semibold mb-4 text-center">Popular Pages</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {POPULAR_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="card-hover flex flex-col items-center text-center p-4 gap-2 group"
            >
              <page.icon className="w-6 h-6 text-accent-cyan group-hover:text-accent-cyan-glow transition-colors" aria-hidden="true" />
              <span className="text-sm font-semibold text-white">{page.label}</span>
              <span className="text-xs text-muted">{page.description}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Back home CTA */}
      <div className="mt-10">
        <Link href="/" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
          <Home className="w-4 h-4" aria-hidden="true" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
