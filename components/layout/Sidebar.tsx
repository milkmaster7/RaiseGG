'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShieldCheck,
  House,
  Swords,
  Trophy,
  BarChart2,
  Gamepad2,
  Activity,
  BookOpen,
  Users,
  Gift,
  Target,
  Film,
  MessageSquare,
  Star,
  Palette,
  Crown,
  Megaphone,
  Shield,
  Award,
  Eye,
} from 'lucide-react'
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup'

// ─── Primary nav ─────────────────────────────────────────────────────────────
const PRIMARY_NAV = [
  { href: '/',             label: 'Home',        icon: House          },
  { href: '/play',         label: 'Play',         icon: Swords         },
  { href: '/tournaments',  label: 'Tournaments',  icon: Trophy         },
  { href: '/teams',        label: 'Teams',        icon: Users          },
  { href: '/hubs',         label: 'Hubs',         icon: Users          },
  { href: '/clans',        label: 'Clans',        icon: Shield         },
  { href: '/leaderboard',  label: 'Leaderboard',  icon: BarChart2      },
  { href: '/ladders',      label: 'Ladders',      icon: Activity       },
  { href: '/spectate',     label: 'Spectate',     icon: Eye            },
  { href: '/challenges',   label: 'Challenges',   icon: Target         },
  { href: '/missions',     label: 'Missions',     icon: Target         },
  { href: '/friends',      label: 'Friends',      icon: Users          },
  { href: '/demos',        label: 'Demos',        icon: Film           },
  { href: '/forum',        label: 'Community',    icon: MessageSquare  },
  { href: '/games',        label: 'Games',        icon: Gamepad2       },
  { href: '/feed',         label: 'Feed',         icon: Activity       },
  { href: '/blog',         label: 'Blog',         icon: BookOpen       },
  { href: '/battle-pass',  label: 'Battle Pass',  icon: Star           },
  { href: '/cosmetics',    label: 'Cosmetics',    icon: Palette        },
  { href: '/premium',      label: 'Premium',      icon: Crown          },
  { href: '/betting',      label: 'Betting',      icon: Gift           },
  { href: '/affiliate',    label: 'Affiliate',    icon: Megaphone      },
  { href: '/creators',     label: 'Creators',     icon: Star           },
  { href: '/achievements', label: 'Achievements', icon: Award          },
]

// ─── Secondary nav (bottom) ───────────────────────────────────────────────────
const SECONDARY_NAV = [
  { href: '/about',         label: 'About'        },
  { href: '/integrity',     label: 'Integrity'    },
  { href: '/faq',           label: 'FAQ'           },
  { href: '/how-it-works',  label: 'How It Works'  },
  { href: '/referral',      label: 'Referral'      },
  { href: '/roadmap',       label: 'Roadmap'       },
  { href: '/support',       label: 'Support'       },
  { href: '/disputes',      label: 'Disputes'      },
  { href: '/settings',      label: 'Settings'      },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside
      className="
        hidden md:flex
        w-60 flex-shrink-0
        flex-col
        min-h-screen h-screen sticky top-0
        bg-space-950 border-r border-border
        overflow-y-auto
      "
    >
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <ShieldCheck className="w-5 h-5 text-accent-cyan flex-shrink-0 group-hover:drop-shadow-[0_0_6px_#00e6ff] transition-all" aria-hidden="true" />
          <span className="font-orbitron font-bold text-lg text-gradient tracking-wide">
            RaiseGG
          </span>
        </Link>
      </div>

      {/* ── Primary nav ─────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="flex-1 px-3 space-y-0.5">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 group
                ${
                  active
                    ? 'bg-accent-cyan/10 text-white shadow-[0_0_10px_rgba(0,230,255,0.15)] border border-accent-cyan/30'
                    : 'text-muted hover:text-white hover:bg-space-800'
                }
              `}
            >
              <Icon
                className={`
                  w-4 h-4 flex-shrink-0 transition-colors duration-200
                  ${active ? 'text-accent-cyan' : 'text-muted group-hover:text-accent-cyan'}
                `}
              />
              <span className="text-sm font-medium">{label}</span>
              {active && (
                <span className="ml-auto w-1 h-4 rounded-full bg-accent-cyan shadow-glow-sm" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="mx-5 my-4 border-t border-border" />

      {/* ── Secondary nav ───────────────────────────────────────────────── */}
      <div className="px-3 pb-14 space-y-0.5">
        {SECONDARY_NAV.map(({ href, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center px-3 py-2 rounded text-xs font-medium transition-all duration-200
                ${
                  active
                    ? 'text-accent-cyan bg-accent-cyan/10'
                    : 'text-muted hover:text-white hover:bg-space-800'
                }
              `}
            >
              {label}
            </Link>
          )
        })}

        {/* Newsletter */}
        <div className="border-t border-border mt-3 pt-1">
          <NewsletterSignup compact />
        </div>

        {/* Social links */}
        <div className="pt-4 px-3 flex gap-4">
          <a
            href="https://t.me/raise_GG"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted hover:text-accent-cyan transition-colors font-semibold"
          >
            Telegram
          </a>
          <a
            href="https://twitter.com/RaiseGG"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted hover:text-accent-cyan transition-colors"
          >
            Twitter/X
          </a>
          <a
            href="https://discord.gg/ErWPgH7gd6"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted hover:text-accent-cyan transition-colors"
          >
            Discord
          </a>
        </div>
      </div>
    </aside>
  )
}
