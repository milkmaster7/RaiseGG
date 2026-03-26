import type { MetadataRoute } from 'next'

const BASE = 'https://raisegg.gg'

const COUNTRIES = [
  'georgia', 'turkey', 'armenia', 'azerbaijan', 'ukraine',
  'romania', 'bulgaria', 'serbia', 'greece', 'iran',
  'kazakhstan', 'uzbekistan', 'russia', 'poland', 'hungary',
  'croatia', 'slovenia', 'moldova', 'belarus',
  'lithuania', 'latvia', 'estonia',
]
const GAMES = ['cs2', 'dota2', 'deadlock']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: now, changeFrequency: 'hourly',  priority: 1    },
    { url: `${BASE}/play`,                lastModified: now, changeFrequency: 'always',  priority: 0.95 },
    { url: `${BASE}/leaderboard`,         lastModified: now, changeFrequency: 'hourly',  priority: 0.9  },
    { url: `${BASE}/tournaments`,         lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games/cs2`,           lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games/dota2`,         lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/games/deadlock`,      lastModified: now, changeFrequency: 'daily',   priority: 0.85 },
    { url: `${BASE}/how-it-works`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.75 },
    { url: `${BASE}/faq`,                 lastModified: now, changeFrequency: 'weekly',  priority: 0.7  },
    { url: `${BASE}/blog`,                lastModified: now, changeFrequency: 'daily',   priority: 0.75 },
    { url: `${BASE}/about`,               lastModified: now, changeFrequency: 'monthly', priority: 0.4  },
    { url: `${BASE}/terms`,               lastModified: now, changeFrequency: 'monthly', priority: 0.3  },
    { url: `${BASE}/privacy`,             lastModified: now, changeFrequency: 'monthly', priority: 0.3  },
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

  return [...staticRoutes, ...seoRoutes]
}
