import Link from 'next/link'
import { Zap } from 'lucide-react'

const GAMES = [
  { href: '/games/cs2', label: 'CS2' },
  { href: '/games/dota2', label: 'Dota 2' },
  { href: '/games/deadlock', label: 'Deadlock' },
]

const PLATFORM = [
  { href: '/play', label: 'Find a Match' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/faq', label: 'FAQ' },
]

const LEGAL = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
]

export default function Footer() {
  return (
    <footer className="border-t border-border bg-space-950 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-accent-purple" />
              <span className="font-orbitron font-bold text-gradient">RaiseGG</span>
            </Link>
            <p className="text-sm text-muted leading-relaxed">
              Competitive stake platform for CS2, Dota 2 & Deadlock. Fair play for the Caucasus, Turkey and Balkans.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="https://discord.gg/raisegg" target="_blank" rel="noopener noreferrer"
                className="text-muted hover:text-accent-purple transition-colors text-sm">
                Discord
              </a>
              <a href="https://twitter.com/RaiseGG" target="_blank" rel="noopener noreferrer"
                className="text-muted hover:text-accent-purple transition-colors text-sm">
                Twitter/X
              </a>
            </div>
          </div>

          {/* Games */}
          <div>
            <h3 className="font-orbitron text-xs font-bold uppercase tracking-widest text-muted mb-4">Games</h3>
            <ul className="space-y-2">
              {GAMES.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-orbitron text-xs font-bold uppercase tracking-widest text-muted mb-4">Platform</h3>
            <ul className="space-y-2">
              {PLATFORM.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-orbitron text-xs font-bold uppercase tracking-widest text-muted mb-4">Legal</h3>
            <ul className="space-y-2">
              {LEGAL.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} RaiseGG.gg — All rights reserved.
          </p>
          <p className="text-xs text-muted">
            Skill-based competition platform. Play responsibly.
          </p>
        </div>
      </div>
    </footer>
  )
}
