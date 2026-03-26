// JSON-LD schema builders — used across all pages

const BASE = 'https://raisegg.gg'

export function videoGameSchema(game: 'cs2' | 'dota2' | 'deadlock') {
  const data = {
    cs2:      { name: 'Counter-Strike 2', alternate: 'CS2',      genre: ['First-person shooter', 'Esports'] },
    dota2:    { name: 'Dota 2',           alternate: 'Dota2',    genre: ['MOBA', 'Esports'] },
    deadlock: { name: 'Deadlock',         alternate: 'Deadlock', genre: ['Third-person shooter', 'Esports'] },
  }[game]

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: data.name,
    alternateName: data.alternate,
    genre: data.genre,
    gamePlatform: 'PC',
    url: `${BASE}/games/${game}`,
    publisher: { '@type': 'Organization', name: 'Valve Corporation', url: 'https://www.valvesoftware.com' },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      description: 'Free to play. Stake USDC on competitive matches.',
    },
  }
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function articleSchema(article: {
  title: string
  description: string
  image: string
  publishedAt: string
  modifiedAt?: string
  slug: string
  keywords?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    image: article.image,
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt ?? article.publishedAt,
    keywords: article.keywords?.join(', '),
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE}/blog/${article.slug}` },
    author: { '@type': 'Organization', name: 'RaiseGG', url: BASE },
    publisher: {
      '@type': 'Organization',
      name: 'RaiseGG',
      logo: { '@type': 'ImageObject', url: `${BASE}/logo-horizontal.svg` },
    },
    url: `${BASE}/blog/${article.slug}`,
  }
}

export function tournamentSchema(tournament: {
  name: string
  game: string
  startDate: string
  endDate?: string
  prizePool: number
  id: string
  image?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: tournament.name,
    sport: tournament.game,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    image: tournament.image,
    location: {
      '@type': 'VirtualLocation',
      url: `${BASE}/tournaments/${tournament.id}`,
    },
    organizer: { '@type': 'Organization', name: 'RaiseGG', url: BASE },
    url: `${BASE}/tournaments/${tournament.id}`,
    offers: {
      '@type': 'Offer',
      price: String(tournament.prizePool),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE}/tournaments/${tournament.id}`,
    },
  }
}

export function leaderboardSchema(players: { name: string; rank: number; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'RaiseGG Leaderboard',
    description: 'Top CS2, Dota 2 and Deadlock stake players on RaiseGG.gg',
    url: `${BASE}/leaderboard`,
    datePublished: new Date().toISOString(),
    itemListElement: players.map((p) => ({
      '@type': 'ListItem',
      position: p.rank,
      name: p.name,
      url: p.url,
    })),
  }
}

export function howToSchema(steps: { name: string; text: string; image?: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How RaiseGG.gg Works',
    description: 'Learn how to stake USDC on CS2, Dota 2 and Deadlock matches on RaiseGG.gg.',
    totalTime: 'PT2M',
    supply: [
      { '@type': 'HowToSupply', name: 'Steam Account' },
      { '@type': 'HowToSupply', name: 'Phantom Wallet (Solana)' },
      { '@type': 'HowToSupply', name: 'USDC' },
    ],
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      image: s.image,
      url: s.url ?? `${BASE}/how-it-works#step-${i + 1}`,
    })),
  }
}

export function personSchema(player: {
  username: string
  avatarUrl?: string
  steamUrl?: string
  games?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.username,
    url: `${BASE}/profile/${player.username}`,
    image: player.avatarUrl,
    knowsAbout: player.games ?? ['Counter-Strike 2', 'Dota 2', 'Deadlock'],
    sameAs: player.steamUrl ? [player.steamUrl] : [],
    memberOf: { '@type': 'Organization', name: 'RaiseGG', url: BASE },
  }
}

export function lobbyListSchema(count: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Open Stake Lobbies — RaiseGG.gg',
    description: `Browse ${count} open CS2, Dota 2 and Deadlock stake lobbies. Join and play now.`,
    url: `${BASE}/play`,
    numberOfItems: count,
  }
}

export function landingPageSchema(game: string, country: string) {
  const gameName = { cs2: 'Counter-Strike 2', dota2: 'Dota 2', deadlock: 'Deadlock' }[game] ?? game
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${gameName} Stake Platform in ${country} | RaiseGG.gg`,
    url: `${BASE}/${game}-platform-${country.toLowerCase()}`,
    description: `The leading ${gameName} stake platform for players in ${country}. Join RaiseGG.gg, compete in ranked lobbies and win real USDC.`,
    inLanguage: 'en-US',
    about: {
      '@type': 'VideoGame',
      name: gameName,
    },
    audience: {
      '@type': 'Audience',
      geographicArea: { '@type': 'Country', name: country },
    },
  }
}
