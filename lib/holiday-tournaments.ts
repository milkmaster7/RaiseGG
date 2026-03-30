/**
 * lib/holiday-tournaments.ts — Regional holiday tournament scheduler
 *
 * Auto-generates themed tournaments for major holidays across
 * target markets: Turkey, Georgia, Azerbaijan, Armenia, Romania,
 * Bulgaria, Serbia, Greece, Kazakhstan, Ukraine, Poland, Iran,
 * Hungary, Bosnia.
 */

import type { Game } from './tournaments'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Holiday {
  date: string          // YYYY-MM-DD
  name: string          // English name
  regions: string[]     // ISO country codes
  type: 'religious' | 'national' | 'gaming' | 'cultural'
  game?: Game           // preferred game, or random if unset
  lang: string          // primary language for promos
}

export interface HolidayTournament {
  name: string
  game: Game
  description: string
  regions: string[]
  entryFee: number
  prizePool: number
  bracketSize: 8 | 16
  startsAt: string      // ISO 8601
  holidayName: string
}

// ─── 2026 Holiday Calendar ─────────────────────────────────────────────────

export const HOLIDAYS: Holiday[] = [
  // ── Nowruz (March 20-21) ──
  { date: '2026-03-20', name: 'Nowruz', regions: ['IR', 'AZ', 'KZ'], type: 'cultural', lang: 'fa' },
  { date: '2026-03-21', name: 'Nowruz Day 2', regions: ['IR', 'AZ', 'KZ'], type: 'cultural', lang: 'fa' },

  // ── Ramadan 2026: approx Feb 18 – Mar 19; Eid al-Fitr ~Mar 20-22 ──
  { date: '2026-03-20', name: 'Eid al-Fitr', regions: ['TR', 'AZ', 'IR', 'KZ', 'BA'], type: 'religious', lang: 'tr' },
  { date: '2026-03-21', name: 'Eid al-Fitr Day 2', regions: ['TR', 'AZ', 'IR', 'KZ', 'BA'], type: 'religious', lang: 'tr' },
  { date: '2026-03-22', name: 'Eid al-Fitr Day 3', regions: ['TR', 'AZ', 'IR', 'KZ', 'BA'], type: 'religious', lang: 'tr' },

  // ── Orthodox Easter 2026: April 12 ──
  { date: '2026-04-12', name: 'Orthodox Easter', regions: ['GE', 'RO', 'RS', 'BG', 'GR', 'UA'], type: 'religious', lang: 'ru' },

  // ── Orthodox Christmas: Jan 7 ──
  { date: '2026-01-07', name: 'Orthodox Christmas', regions: ['GE', 'RS', 'UA'], type: 'religious', lang: 'ru' },

  // ── Catholic/Western Christmas: Dec 25 ──
  { date: '2026-12-25', name: 'Christmas', regions: ['RO', 'PL', 'HU', 'GR', 'BG', 'BA'], type: 'religious', lang: 'en' },

  // ── Eid al-Adha 2026: approx May 27-29 ──
  { date: '2026-05-27', name: 'Eid al-Adha', regions: ['TR', 'AZ', 'IR', 'KZ', 'BA'], type: 'religious', lang: 'tr' },
  { date: '2026-05-28', name: 'Eid al-Adha Day 2', regions: ['TR', 'AZ', 'IR', 'KZ', 'BA'], type: 'religious', lang: 'tr' },

  // ── National Days ──────────────────────────────────────────────────────

  // Turkey
  { date: '2026-04-23', name: 'National Sovereignty Day', regions: ['TR'], type: 'national', lang: 'tr' },
  { date: '2026-05-19', name: 'Commemoration of Ataturk', regions: ['TR'], type: 'national', lang: 'tr' },
  { date: '2026-08-30', name: 'Victory Day (Turkey)', regions: ['TR'], type: 'national', lang: 'tr' },
  { date: '2026-10-29', name: 'Republic Day (Turkey)', regions: ['TR'], type: 'national', lang: 'tr' },

  // Georgia
  { date: '2026-05-26', name: 'Independence Day (Georgia)', regions: ['GE'], type: 'national', lang: 'ka' },

  // Azerbaijan
  { date: '2026-05-28', name: 'Republic Day (Azerbaijan)', regions: ['AZ'], type: 'national', lang: 'az' },
  { date: '2026-10-18', name: 'Independence Day (Azerbaijan)', regions: ['AZ'], type: 'national', lang: 'az' },

  // Armenia
  { date: '2026-09-21', name: 'Independence Day (Armenia)', regions: ['AM'], type: 'national', lang: 'hy' },

  // Romania
  { date: '2026-12-01', name: 'National Day (Romania)', regions: ['RO'], type: 'national', lang: 'ro' },

  // Bulgaria
  { date: '2026-03-03', name: 'Liberation Day (Bulgaria)', regions: ['BG'], type: 'national', lang: 'bg' },

  // Serbia
  { date: '2026-02-15', name: 'Statehood Day (Serbia)', regions: ['RS'], type: 'national', lang: 'sr' },

  // Greece
  { date: '2026-03-25', name: 'Independence Day (Greece)', regions: ['GR'], type: 'national', lang: 'el' },
  { date: '2026-10-28', name: 'Oxi Day (Greece)', regions: ['GR'], type: 'national', lang: 'el' },

  // Kazakhstan
  { date: '2026-12-16', name: 'Independence Day (Kazakhstan)', regions: ['KZ'], type: 'national', lang: 'ru' },

  // Ukraine
  { date: '2026-08-24', name: 'Independence Day (Ukraine)', regions: ['UA'], type: 'national', lang: 'uk' },

  // Poland
  { date: '2026-05-03', name: 'Constitution Day (Poland)', regions: ['PL'], type: 'national', lang: 'pl' },
  { date: '2026-11-11', name: 'Independence Day (Poland)', regions: ['PL'], type: 'national', lang: 'pl' },

  // Iran
  { date: '2026-02-11', name: 'Revolution Day (Iran)', regions: ['IR'], type: 'national', lang: 'fa' },
  { date: '2026-04-01', name: 'Islamic Republic Day (Iran)', regions: ['IR'], type: 'national', lang: 'fa' },

  // Hungary
  { date: '2026-03-15', name: 'National Day (Hungary)', regions: ['HU'], type: 'national', lang: 'hu' },
  { date: '2026-08-20', name: "St. Stephen's Day (Hungary)", regions: ['HU'], type: 'national', lang: 'hu' },
  { date: '2026-10-23', name: 'Revolution Day (Hungary)', regions: ['HU'], type: 'national', lang: 'hu' },

  // Bosnia
  { date: '2026-03-01', name: 'Independence Day (Bosnia)', regions: ['BA'], type: 'national', lang: 'bs' },
  { date: '2026-11-25', name: 'Statehood Day (Bosnia)', regions: ['BA'], type: 'national', lang: 'bs' },

  // ── Gaming Events ──────────────────────────────────────────────────────

  // CS2 Majors 2026 (estimated dates)
  { date: '2026-05-04', name: 'CS2 Major Spring', regions: ['TR', 'GE', 'AZ', 'AM', 'RO', 'BG', 'RS', 'GR', 'KZ', 'UA', 'PL', 'IR', 'HU', 'BA'], type: 'gaming', game: 'cs2', lang: 'en' },
  { date: '2026-11-02', name: 'CS2 Major Fall', regions: ['TR', 'GE', 'AZ', 'AM', 'RO', 'BG', 'RS', 'GR', 'KZ', 'UA', 'PL', 'IR', 'HU', 'BA'], type: 'gaming', game: 'cs2', lang: 'en' },

  // The International (Dota 2) — estimated Aug/Sep 2026
  { date: '2026-08-15', name: 'The International', regions: ['TR', 'GE', 'AZ', 'AM', 'RO', 'BG', 'RS', 'GR', 'KZ', 'UA', 'PL', 'IR', 'HU', 'BA'], type: 'gaming', game: 'dota2', lang: 'en' },

  // Gaming Day / Esports celebrations
  { date: '2026-06-21', name: 'World Esports Day', regions: ['TR', 'GE', 'AZ', 'AM', 'RO', 'BG', 'RS', 'GR', 'KZ', 'UA', 'PL', 'IR', 'HU', 'BA'], type: 'gaming', lang: 'en' },

  // New Year (universal)
  { date: '2026-01-01', name: 'New Year', regions: ['TR', 'GE', 'AZ', 'AM', 'RO', 'BG', 'RS', 'GR', 'KZ', 'UA', 'PL', 'IR', 'HU', 'BA'], type: 'cultural', lang: 'en' },
]

// ─── Themed Tournament Names ───────────────────────────────────────────────

const THEMED_NAMES: Record<string, Record<Game, string>> = {
  'Eid al-Fitr': { cs2: 'Iftar Invitational CS2', dota2: 'Iftar Invitational Dota 2', deadlock: 'Iftar Invitational Deadlock' },
  'Eid al-Fitr Day 2': { cs2: 'Bayram Blitz CS2', dota2: 'Bayram Blitz Dota 2', deadlock: 'Bayram Blitz Deadlock' },
  'Eid al-Fitr Day 3': { cs2: 'Bayram Bash CS2', dota2: 'Bayram Bash Dota 2', deadlock: 'Bayram Bash Deadlock' },
  'Eid al-Adha': { cs2: 'Kurban Cup CS2', dota2: 'Kurban Cup Dota 2', deadlock: 'Kurban Cup Deadlock' },
  'Eid al-Adha Day 2': { cs2: 'Sacrifice Showdown CS2', dota2: 'Sacrifice Showdown Dota 2', deadlock: 'Sacrifice Showdown Deadlock' },
  'Nowruz': { cs2: 'Nowruz Cup CS2', dota2: 'Nowruz Cup Dota 2', deadlock: 'Nowruz Cup Deadlock' },
  'Nowruz Day 2': { cs2: 'Persian New Year Open CS2', dota2: 'Persian New Year Open Dota 2', deadlock: 'Persian New Year Open Deadlock' },
  'Orthodox Easter': { cs2: 'Easter Classic CS2', dota2: 'Easter Classic Dota 2', deadlock: 'Easter Classic Deadlock' },
  'Orthodox Christmas': { cs2: 'Orthodox Christmas Classic CS2', dota2: 'Orthodox Christmas Classic Dota 2', deadlock: 'Orthodox Christmas Classic Deadlock' },
  'Christmas': { cs2: 'Christmas Clash CS2', dota2: 'Christmas Clash Dota 2', deadlock: 'Christmas Clash Deadlock' },
  'New Year': { cs2: 'New Year Showdown CS2', dota2: 'New Year Showdown Dota 2', deadlock: 'New Year Showdown Deadlock' },
  'CS2 Major Spring': { cs2: 'Major Watch Party Cup', dota2: 'Major Hype Dota 2', deadlock: 'Major Hype Deadlock' },
  'CS2 Major Fall': { cs2: 'Major Watch Party Cup', dota2: 'Major Hype Dota 2', deadlock: 'Major Hype Deadlock' },
  'The International': { cs2: 'TI Hype CS2', dota2: 'TI Community Cup', deadlock: 'TI Hype Deadlock' },
  'World Esports Day': { cs2: 'Esports Day CS2 Open', dota2: 'Esports Day Dota 2 Open', deadlock: 'Esports Day Deadlock Open' },
}

function getThemedName(holiday: Holiday, game: Game): string {
  const themed = THEMED_NAMES[holiday.name]
  if (themed) return themed[game]

  // Fallback: generate from holiday name
  const cleanName = holiday.name.replace(/\s*\(.*\)/, '')
  return `${cleanName} ${game === 'dota2' ? 'Dota 2' : game === 'cs2' ? 'CS2' : 'Deadlock'} Cup`
}

// ─── Core Functions ────────────────────────────────────────────────────────

/** Returns holidays occurring within the next N days from today */
export function getUpcomingHolidays(days: number): Holiday[] {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const cutoff = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

  return HOLIDAYS.filter(h => {
    const hDate = new Date(h.date + 'T00:00:00Z')
    return hDate >= today && hDate <= cutoff
  })
}

/** Pick a game — use holiday's preferred game or rotate by day */
function pickGame(holiday: Holiday): Game {
  if (holiday.game) return holiday.game
  const games: Game[] = ['cs2', 'dota2', 'deadlock']
  const dayNum = new Date(holiday.date).getUTCDate()
  return games[dayNum % 3]
}

/** Generate a tournament config for a holiday */
export function generateHolidayTournament(holiday: Holiday): HolidayTournament {
  const game = pickGame(holiday)
  const name = getThemedName(holiday, game)

  // Holiday tournaments are free with bigger prize pools
  const isGaming = holiday.type === 'gaming'
  const prizePool = isGaming ? 15 : 10
  const bracketSize = isGaming ? 16 : 8

  // Start at 8PM UTC on the holiday
  const startsAt = holiday.date + 'T20:00:00Z'

  const regionNames = holiday.regions.join(', ')
  const description = `Special ${holiday.name} tournament! Free entry, $${prizePool} USDC prize pool. ` +
    `${bracketSize} players, single elimination, best-of-1. ` +
    `Open to players from ${regionNames}. Celebrate with RaiseGG!`

  return {
    name,
    game,
    description,
    regions: holiday.regions,
    entryFee: 0,
    prizePool,
    bracketSize: bracketSize as 8 | 16,
    startsAt,
    holidayName: holiday.name,
  }
}

// ─── Promotional Messages ──────────────────────────────────────────────────

const PROMO_MESSAGES: Record<string, Record<string, (h: Holiday, t: HolidayTournament) => string>> = {
  // Eid messages
  'Eid al-Fitr': {
    tr: (h, t) => `<b>Bayram kutlu olsun! Iftar Invitational basliyor!</b>\n\nUcretsiz ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'} turnuvasi.\n$${t.prizePool} USDC odul. ${t.bracketSize} oyuncu.\n\nRamazan Bayrami serefi icin!\nhttps://raisegg.com/tournaments`,
    ru: (h, t) => `<b>C праздником Ураза-байрам!</b>\n\nБесплатный турнир ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'}.\n$${t.prizePool} USDC приз. ${t.bracketSize} игроков.\n\nhttps://raisegg.com/tournaments`,
    en: (h, t) => `<b>Eid Mubarak! Free ${t.name} tournament!</b>\n\n$${t.prizePool} USDC prize pool. ${t.bracketSize} players.\nCelebrate Eid with competitive gaming!\n\nhttps://raisegg.com/tournaments`,
  },
  // Nowruz
  'Nowruz': {
    fa: (h, t) => `<b>نوروز مبارک! جام نوروزی RaiseGG</b>\n\nتورنومنت رایگان ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'}.\n$${t.prizePool} USDC جایزه. ${t.bracketSize} بازیکن.\n\nhttps://raisegg.com/tournaments`,
    tr: (h, t) => `<b>Nevruz kutlu olsun! Nowruz Cup basliyor!</b>\n\nUcretsiz turnuva. $${t.prizePool} USDC odul.\n\nhttps://raisegg.com/tournaments`,
    ru: (h, t) => `<b>С Наврузом! Nowruz Cup на RaiseGG!</b>\n\nБесплатный турнир. $${t.prizePool} USDC приз.\n\nhttps://raisegg.com/tournaments`,
    en: (h, t) => `<b>Happy Nowruz! Free ${t.name}!</b>\n\n$${t.prizePool} USDC prize pool. ${t.bracketSize} players.\nCelebrate Persian New Year with gaming!\n\nhttps://raisegg.com/tournaments`,
  },
  // Orthodox Easter
  'Orthodox Easter': {
    ru: (h, t) => `<b>Христос Воскресе! Пасхальный турнир!</b>\n\nБесплатный ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'} турнир.\n$${t.prizePool} USDC приз.\n\nhttps://raisegg.com/tournaments`,
    ro: (h, t) => `<b>Hristos a Inviat! Turneu de Paste!</b>\n\nTurneu gratuit ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'}.\n$${t.prizePool} USDC premiu.\n\nhttps://raisegg.com/tournaments`,
    sr: (h, t) => `<b>Hristos Voskrese! Uskrsnji turnir!</b>\n\nBesplatan ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'} turnir.\n$${t.prizePool} USDC nagrada.\n\nhttps://raisegg.com/tournaments`,
    el: (h, t) => `<b>Christos Anesti! Easter Classic!</b>\n\nFree ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'} tournament.\n$${t.prizePool} USDC prize.\n\nhttps://raisegg.com/tournaments`,
    en: (h, t) => `<b>Happy Orthodox Easter! ${t.name}!</b>\n\n$${t.prizePool} USDC prize pool. Free entry.\n\nhttps://raisegg.com/tournaments`,
  },
  // Orthodox Christmas
  'Orthodox Christmas': {
    ru: (h, t) => `<b>С Рождеством Христовым!</b>\n\nРождественский турнир ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'}.\n$${t.prizePool} USDC приз. Бесплатно!\n\nhttps://raisegg.com/tournaments`,
    sr: (h, t) => `<b>Srecan Bozic!</b>\n\nBozicni ${t.game === 'cs2' ? 'CS2' : t.game === 'dota2' ? 'Dota 2' : 'Deadlock'} turnir.\n$${t.prizePool} USDC nagrada.\n\nhttps://raisegg.com/tournaments`,
    en: (h, t) => `<b>Merry Orthodox Christmas! ${t.name}!</b>\n\n$${t.prizePool} USDC prize pool. Free entry.\n\nhttps://raisegg.com/tournaments`,
  },
  // Gaming events
  'CS2 Major Spring': {
    en: (h, t) => `<b>CS2 Major is HERE! Community Cup on RaiseGG!</b>\n\nWatch the Major, play the Major Watch Party Cup!\n$${t.prizePool} USDC prize. Free entry.\n\nhttps://raisegg.com/tournaments`,
    tr: (h, t) => `<b>CS2 Major basladi! RaiseGG de Major Cup!</b>\n\nUcretsiz turnuva. $${t.prizePool} USDC odul.\n\nhttps://raisegg.com/tournaments`,
    ru: (h, t) => `<b>CS2 Major начался! Community Cup на RaiseGG!</b>\n\nБесплатный турнир. $${t.prizePool} USDC приз.\n\nhttps://raisegg.com/tournaments`,
  },
  'CS2 Major Fall': {
    en: (h, t) => `<b>Fall Major is HERE! Community Cup on RaiseGG!</b>\n\n$${t.prizePool} USDC prize. Free entry. Show your Major hype!\n\nhttps://raisegg.com/tournaments`,
    tr: (h, t) => `<b>Sonbahar Major basladi! RaiseGG Community Cup!</b>\n\n$${t.prizePool} USDC odul. Ucretsiz.\n\nhttps://raisegg.com/tournaments`,
    ru: (h, t) => `<b>Осенний Major! Community Cup на RaiseGG!</b>\n\n$${t.prizePool} USDC приз. Бесплатно.\n\nhttps://raisegg.com/tournaments`,
  },
  'The International': {
    en: (h, t) => `<b>TI season is here! TI Community Cup on RaiseGG!</b>\n\nDota 2 tournament inspired by The International.\n$${t.prizePool} USDC prize. Free entry.\n\nhttps://raisegg.com/tournaments`,
    ru: (h, t) => `<b>TI начался! TI Community Cup на RaiseGG!</b>\n\nТурнир Dota 2. $${t.prizePool} USDC приз. Бесплатно.\n\nhttps://raisegg.com/tournaments`,
    tr: (h, t) => `<b>TI basliyor! TI Community Cup RaiseGG de!</b>\n\nDota 2 turnuvasi. $${t.prizePool} USDC odul.\n\nhttps://raisegg.com/tournaments`,
  },
}

/** Get promotional messages for a holiday in the appropriate language(s) */
export function getHolidayMessages(holiday: Holiday): { lang: string; text: string }[] {
  const tournament = generateHolidayTournament(holiday)
  const results: { lang: string; text: string }[] = []

  // Try exact holiday name match first
  const templates = PROMO_MESSAGES[holiday.name]
  if (templates) {
    // Return all available language variants
    for (const [lang, fn] of Object.entries(templates)) {
      results.push({ lang, text: fn(holiday, tournament) })
    }
    return results
  }

  // Check if the base name matches (e.g. "Eid al-Fitr Day 2" -> "Eid al-Fitr")
  for (const [baseName, langTemplates] of Object.entries(PROMO_MESSAGES)) {
    if (holiday.name.startsWith(baseName)) {
      for (const [lang, fn] of Object.entries(langTemplates)) {
        results.push({ lang, text: fn(holiday, tournament) })
      }
      return results
    }
  }

  // Fallback: generic message in English and holiday's primary language
  const fallbackEn = `<b>${holiday.name} — Special Tournament on RaiseGG!</b>\n\n` +
    `Free ${tournament.game === 'cs2' ? 'CS2' : tournament.game === 'dota2' ? 'Dota 2' : 'Deadlock'} tournament.\n` +
    `$${tournament.prizePool} USDC prize pool. ${tournament.bracketSize} players.\n\n` +
    `https://raisegg.com/tournaments`
  results.push({ lang: 'en', text: fallbackEn })

  return results
}
