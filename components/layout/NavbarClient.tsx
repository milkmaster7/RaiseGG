'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ShieldCheck } from 'lucide-react'

const NAV_LINKS = [
  { href: '/play', label: 'Play', soon: false },
  { href: '/tournaments', label: 'Tournaments', soon: false },
  { href: '/leaderboard', label: 'Leaderboard', soon: false },
  { href: '/games/cs2', label: 'CS2', soon: false },
  { href: '/games/dota2', label: 'Dota 2', soon: false },
  { href: '/games/deadlock', label: 'Deadlock', soon: true },
]

export default function NavbarClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-space-900/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <ShieldCheck className="w-6 h-6 text-accent-cyan group-hover:text-accent-cyan-glow transition-colors" />
            <span className="font-orbitron font-bold text-lg text-gradient">RAISEGG</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-muted hover:text-white transition-colors rounded hover:bg-space-800 flex items-center gap-1.5"
              >
                {link.label}
                {link.soon && (
                  <span className="text-[9px] font-bold bg-accent-purple/20 text-accent-purple border border-accent-purple/40 rounded px-1 py-0.5 leading-none">SOON</span>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard/wallet" className="text-sm text-muted hover:text-white transition-colors">
                  Wallet
                </Link>
                <Link href="/dashboard" className="text-sm text-muted hover:text-white transition-colors">
                  Dashboard
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="btn-primary text-sm py-2 px-4">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <Link href="/api/auth/steam" className="btn-primary text-sm py-2 px-4">
                Connect Steam
              </Link>
            )}
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
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-white hover:bg-space-800 rounded transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
              {link.soon && (
                <span className="text-[9px] font-bold bg-accent-purple/20 text-accent-purple border border-accent-purple/40 rounded px-1 py-0.5 leading-none">SOON</span>
              )}
            </Link>
          ))}
          <div className="pt-3 border-t border-border space-y-2">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="block px-3 py-2 text-sm text-muted hover:text-white hover:bg-space-800 rounded transition-colors">
                  Dashboard
                </Link>
                <Link href="/dashboard/wallet" className="block px-3 py-2 text-sm text-muted hover:text-white hover:bg-space-800 rounded transition-colors">
                  Wallet
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="btn-primary text-sm py-2 px-4 w-full text-center">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <Link href="/api/auth/steam" className="btn-primary text-sm py-2 px-4 w-full text-center block">
                Connect Steam
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
