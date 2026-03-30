import type { MetadataRoute } from 'next'
import { getAllBlogPosts } from '@/lib/blog'
import { supabase } from '@/lib/supabase'
import { COUNTRY_NAMES } from '@/lib/countries'

const BASE = 'https://raisegg.com'

// Only include the top 15 indexed countries in sitemap — others have noindex
const COUNTRIES = [
  'turkey', 'georgia', 'armenia', 'azerbaijan', 'ukraine', 'russia',
  'kazakhstan', 'romania', 'bulgaria', 'serbia', 'greece', 'poland',
  'iran', 'uzbekistan', 'israel',
]
const GAMES = ['cs2', 'dota2', 'deadlock']

// Country code to slug helper
function countryCodeToSlug(code: string): string | null {
  const name = COUNTRY_NAMES[code]
  if (!name) return null
  return name.toLowerCase().replace(/\s+/g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticDate = new Date('2026-03-15')
  const monthlyDate = new Date('2026-03-01')

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: now,        changeFrequency: 'hourly',  priority: 1    },
    { url: `${BASE}/play`,                lastModified: now,        changeFrequency: 'always',  priority: 0.95 },
    { url: `${BASE}/leaderboard`,         lastModified: now,        changeFrequency: 'hourly',  priority: 0.9  },
    { url: `${BASE}/tournaments`,         lastModified: now,        changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games`,               lastModified: staticDate, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${BASE}/games/cs2`,           lastModified: staticDate, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games/dota2`,         lastModified: staticDate, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games/deadlock`,      lastModified: staticDate, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/how-it-works`,        lastModified: staticDate, changeFrequency: 'weekly',  priority: 0.75 },
    { url: `${BASE}/faq`,                 lastModified: staticDate, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${BASE}/blog`,                lastModified: now,        changeFrequency: 'daily',   priority: 0.75 },
    { url: `${BASE}/about`,               lastModified: staticDate, changeFrequency: 'monthly', priority: 0.4  },
    { url: `${BASE}/terms`,               lastModified: staticDate, changeFrequency: 'monthly', priority: 0.3  },
    { url: `${BASE}/privacy`,             lastModified: staticDate, changeFrequency: 'monthly', priority: 0.3  },
    { url: `${BASE}/responsible-play`,    lastModified: staticDate, changeFrequency: 'monthly', priority: 0.3  },
    { url: `${BASE}/feed`,                lastModified: now,        changeFrequency: 'always',  priority: 0.5  },
    { url: `${BASE}/teams`,               lastModified: now,        changeFrequency: 'daily',   priority: 0.7  },
    { url: `${BASE}/search`,              lastModified: now,        changeFrequency: 'daily',   priority: 0.5  },
    { url: `${BASE}/referral`,            lastModified: staticDate, changeFrequency: 'monthly', priority: 0.6  },
    { url: `${BASE}/reviews`,             lastModified: now,        changeFrequency: 'weekly',  priority: 0.6  },
    { url: `${BASE}/roadmap`,             lastModified: staticDate, changeFrequency: 'monthly', priority: 0.5  },
    { url: `${BASE}/challenges`,          lastModified: now,        changeFrequency: 'daily',   priority: 0.7  },
    { url: `${BASE}/forum`,               lastModified: now,        changeFrequency: 'daily',   priority: 0.6  },
    { url: `${BASE}/friends`,             lastModified: now,        changeFrequency: 'daily',   priority: 0.5  },
    { url: `${BASE}/premium`,             lastModified: staticDate, changeFrequency: 'monthly', priority: 0.6  },
    { url: `${BASE}/hubs`,                lastModified: now,        changeFrequency: 'daily',   priority: 0.8  },
    { url: `${BASE}/clans`,               lastModified: now,        changeFrequency: 'daily',   priority: 0.7  },
    { url: `${BASE}/achievements`,        lastModified: staticDate, changeFrequency: 'weekly',  priority: 0.5  },
    { url: `${BASE}/cosmetics`,           lastModified: staticDate, changeFrequency: 'weekly',  priority: 0.5  },
    { url: `${BASE}/demos`,               lastModified: now,        changeFrequency: 'daily',   priority: 0.6  },
    { url: `${BASE}/spectate`,            lastModified: now,        changeFrequency: 'always',  priority: 0.7  },
    { url: `${BASE}/creators`,            lastModified: staticDate, changeFrequency: 'monthly', priority: 0.6  },
    { url: `${BASE}/affiliate`,           lastModified: staticDate, changeFrequency: 'monthly', priority: 0.5  },
    { url: `${BASE}/ladders`,              lastModified: now,        changeFrequency: 'daily',   priority: 0.7  },
    { url: `${BASE}/missions`,             lastModified: now,        changeFrequency: 'daily',   priority: 0.7  },
    { url: `${BASE}/battle-pass`,          lastModified: now,        changeFrequency: 'daily',   priority: 0.75 },
    { url: `${BASE}/integrity`,            lastModified: staticDate, changeFrequency: 'monthly', priority: 0.4  },
    { url: `${BASE}/support`,              lastModified: staticDate, changeFrequency: 'monthly', priority: 0.4  },
  ]

  // Country + game SEO landing pages
  const seoRoutes: MetadataRoute.Sitemap = COUNTRIES.flatMap((country) =>
    GAMES.map((game) => ({
      url: `${BASE}/${game}-platform-${country}`,
      lastModified: monthlyDate,
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }))
  )

  // Blog article pages (static + AI-generated from Supabase)
  const allPosts = await getAllBlogPosts()
  const blogRoutes: MetadataRoute.Sitemap = allPosts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Leaderboard per-game
  const lbRoutes: MetadataRoute.Sitemap = ['cs2', 'dota2', 'deadlock'].map((game) => ({
    url: `${BASE}/leaderboard?game=${game}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }))

  // Dynamic hub pages
  let hubRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: hubs } = await supabase
      .from('hubs')
      .select('slug, updated_at')
      .eq('active', true)
    if (hubs) {
      hubRoutes = hubs.map((hub) => ({
        url: `${BASE}/hubs/${hub.slug}`,
        lastModified: hub.updated_at ? new Date(hub.updated_at) : now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }))
    }
  } catch {
    // Supabase unavailable — skip dynamic hubs
  }

  // /play/[game] landing pages
  const playGameRoutes: MetadataRoute.Sitemap = GAMES.map((game) => ({
    url: `${BASE}/play/${game}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))

  // /leaderboard/[country] pages — from distinct countries in DB
  let countryLbRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: countryPlayers } = await supabase
      .from('players')
      .select('country')
      .not('country', 'is', null)
      .eq('eligible', true)
      .eq('banned', false)

    if (countryPlayers) {
      const codes = new Set(countryPlayers.map((p) => p.country).filter(Boolean) as string[])
      countryLbRoutes = Array.from(codes)
        .map((code) => {
          const slug = countryCodeToSlug(code)
          if (!slug) return null
          return {
            url: `${BASE}/leaderboard/${slug}`,
            lastModified: now,
            changeFrequency: 'daily' as const,
            priority: 0.7,
          }
        })
        .filter(Boolean) as MetadataRoute.Sitemap
    }
  } catch {
    // Supabase unavailable — skip country leaderboard routes
  }

  // /city/[city] pages — from distinct cities in DB
  let cityRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: cityPlayers } = await supabase
      .from('players')
      .select('city')
      .not('city', 'is', null)
      .eq('eligible', true)
      .eq('banned', false)

    if (cityPlayers) {
      const cities = new Set(
        (cityPlayers.map((p) => p.city).filter(Boolean) as string[]).map((c) =>
          c.toLowerCase().replace(/\s+/g, '-')
        )
      )
      cityRoutes = Array.from(cities).map((slug) => ({
        url: `${BASE}/city/${slug}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.65,
      }))
    }
  } catch {
    // Supabase unavailable — skip city routes
  }

  return [...staticRoutes, ...lbRoutes, ...playGameRoutes, ...countryLbRoutes, ...cityRoutes, ...blogRoutes, ...seoRoutes, ...hubRoutes]
}
