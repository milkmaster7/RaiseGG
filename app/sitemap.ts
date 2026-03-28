import type { MetadataRoute } from 'next'
import { getBlogPostSlugs } from '@/lib/blog'

const BASE = 'https://raisegg.gg'

const COUNTRIES = [
  // Caucasus & surroundings
  'georgia', 'turkey', 'armenia', 'azerbaijan', 'iran',
  // Central Asia
  'kazakhstan', 'uzbekistan', 'kyrgyzstan', 'tajikistan', 'turkmenistan',
  // Eastern Europe
  'ukraine', 'russia', 'belarus', 'moldova', 'poland', 'czech', 'slovakia',
  'hungary', 'austria',
  // Baltic
  'lithuania', 'latvia', 'estonia',
  // Balkans
  'romania', 'bulgaria', 'serbia', 'greece', 'croatia', 'slovenia',
  'bosnia', 'montenegro', 'albania', 'kosovo', 'north-macedonia',
  // Eastern Mediterranean
  'cyprus', 'israel', 'jordan',
  // Northern Europe
  'finland', 'sweden',
  // Western Europe
  'netherlands', 'belgium', 'switzerland', 'italy', 'spain', 'portugal',
]
const GAMES = ['cs2', 'dota2', 'deadlock']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: now, changeFrequency: 'hourly',  priority: 1    },
    { url: `${BASE}/play`,                lastModified: now, changeFrequency: 'always',  priority: 0.95 },
    { url: `${BASE}/leaderboard`,         lastModified: now, changeFrequency: 'hourly',  priority: 0.9  },
    { url: `${BASE}/tournaments`,         lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${BASE}/games/cs2`,           lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games/dota2`,         lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games/deadlock`,      lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/how-it-works`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.75 },
    { url: `${BASE}/faq`,                 lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${BASE}/blog`,                lastModified: now, changeFrequency: 'daily',   priority: 0.75 },
    { url: `${BASE}/about`,               lastModified: now, changeFrequency: 'monthly', priority: 0.4  },
    { url: `${BASE}/terms`,               lastModified: now, changeFrequency: 'monthly', priority: 0.3  },
    { url: `${BASE}/privacy`,             lastModified: now, changeFrequency: 'monthly', priority: 0.3  },
    { url: `${BASE}/responsible-play`,    lastModified: now, changeFrequency: 'monthly', priority: 0.3  },
    { url: `${BASE}/feed`,                lastModified: now, changeFrequency: 'always',  priority: 0.5  },
  ]

  // Country + game SEO landing pages
  const seoRoutes: MetadataRoute.Sitemap = COUNTRIES.flatMap((country) =>
    GAMES.map((game) => ({
      url: `${BASE}/${game}-platform-${country}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }))
  )

  // Blog article pages
  const blogRoutes: MetadataRoute.Sitemap = getBlogPostSlugs().map((slug) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: now,
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

  return [...staticRoutes, ...lbRoutes, ...blogRoutes, ...seoRoutes]
}
