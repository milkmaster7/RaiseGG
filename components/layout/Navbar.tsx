'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'

const NAV_LINKS = [
  { href: '/play', label: 'Play' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/games/cs2', label: 'CS2' },
  { href: '/games/dota2', label: 'Dota 2' },
  { href: '/games/deadlock', label: 'Deadlock' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-space-900/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Zap className="w-6 h-6 text-accent-purple group-hover:text-accent-purple-glow transition-colors" />
            <span className="font-orbitron font-bold text-lg text-gradient">
              RAISEGG
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-muted hover:text-white transition-colors rounded hover:bg-space-800"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/dashboard/wallet" className="text-sm text-muted hover:text-white transition-colors">
              Wallet
            </Link>
            <Link href="/api/auth/steam" className="btn-primary text-sm py-2 px-4">
              Connect Steam
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-muted hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-space-900 px-4 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2 text-sm text-muted hover:text-white hover:bg-space-800 rounded transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-border">
            <Link href="/api/auth/steam" className="btn-primary text-sm py-2 px-4 w-full text-center block">
              Connect Steam
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
