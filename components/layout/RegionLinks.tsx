import Link from 'next/link'

type RegionLinksProps = {
  currentGame: string
  currentCountry?: string
}

const REGIONS: { name: string; countries: { slug: string; label: string }[] }[] = [
  {
    name: 'Caucasus',
    countries: [
      { slug: 'georgia', label: 'Georgia' },
      { slug: 'turkey', label: 'Turkey' },
      { slug: 'armenia', label: 'Armenia' },
      { slug: 'azerbaijan', label: 'Azerbaijan' },
    ],
  },
  {
    name: 'Balkans',
    countries: [
      { slug: 'serbia', label: 'Serbia' },
      { slug: 'romania', label: 'Romania' },
      { slug: 'bulgaria', label: 'Bulgaria' },
      { slug: 'greece', label: 'Greece' },
    ],
  },
  {
    name: 'Eastern Europe',
    countries: [
      { slug: 'ukraine', label: 'Ukraine' },
      { slug: 'poland', label: 'Poland' },
      { slug: 'russia', label: 'Russia' },
      { slug: 'kazakhstan', label: 'Kazakhstan' },
    ],
  },
]

export function RegionLinks({ currentGame, currentCountry }: RegionLinksProps) {
  return (
    <div className="mt-12">
      <h3 className="font-orbitron text-sm font-bold text-muted uppercase tracking-widest mb-4">
        Popular Regions
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        {REGIONS.map((region) => {
          const links = region.countries.filter((c) => c.slug !== currentCountry)
          if (links.length === 0) return null
          return (
            <div key={region.name} className="card">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">{region.name}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {links.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${currentGame}-platform-${c.slug}`}
                    className="text-sm text-accent-cyan hover:underline"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
