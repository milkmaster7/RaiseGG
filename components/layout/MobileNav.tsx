'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Swords, Trophy, BarChart2, User } from 'lucide-react'

const MOBILE_NAV = [
  { href: '/',            label: 'Home',        icon: House     },
  { href: '/play',        label: 'Play',         icon: Swords    },
  { href: '/tournaments', label: 'Tournaments',  icon: Trophy    },
  { href: '/leaderboard', label: 'Leaderboard',  icon: BarChart2 },
  { href: '/profile',     label: 'Profile',      icon: User      },
]

export default function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav
      aria-label="Mobile navigation"
      className="
        md:hidden
        fixed bottom-0 left-0 right-0 z-50
        bg-space-950 border-t border-border
        flex items-stretch
        h-16
        safe-area-bottom
      "
    >
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className={`
              flex-1 flex flex-col items-center justify-center gap-1
              transition-colors duration-200
              ${active ? 'text-accent-purple' : 'text-muted hover:text-white'}
            `}
          >
            <Icon
              className={`w-5 h-5 flex-shrink-0 ${active ? 'drop-shadow-[0_0_6px_#7b61ff]' : ''}`}
            />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
