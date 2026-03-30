/**
 * lib/countries.ts — Country codes, flag emojis, and names for player profiles
 */

export const COUNTRY_FLAGS: Record<string, string> = {
  TR: '\u{1F1F9}\u{1F1F7}', GE: '\u{1F1EC}\u{1F1EA}', AZ: '\u{1F1E6}\u{1F1FF}', AM: '\u{1F1E6}\u{1F1F2}', UA: '\u{1F1FA}\u{1F1E6}',
  RO: '\u{1F1F7}\u{1F1F4}', BG: '\u{1F1E7}\u{1F1EC}', RS: '\u{1F1F7}\u{1F1F8}', GR: '\u{1F1EC}\u{1F1F7}', IR: '\u{1F1EE}\u{1F1F7}',
  KZ: '\u{1F1F0}\u{1F1FF}', UZ: '\u{1F1FA}\u{1F1FF}', RU: '\u{1F1F7}\u{1F1FA}', PL: '\u{1F1F5}\u{1F1F1}', HU: '\u{1F1ED}\u{1F1FA}',
  IL: '\u{1F1EE}\u{1F1F1}', CZ: '\u{1F1E8}\u{1F1FF}', HR: '\u{1F1ED}\u{1F1F7}', BA: '\u{1F1E7}\u{1F1E6}', ME: '\u{1F1F2}\u{1F1EA}',
  AL: '\u{1F1E6}\u{1F1F1}', MK: '\u{1F1F2}\u{1F1F0}', MD: '\u{1F1F2}\u{1F1E9}', BY: '\u{1F1E7}\u{1F1FE}', LT: '\u{1F1F1}\u{1F1F9}',
  LV: '\u{1F1F1}\u{1F1FB}', EE: '\u{1F1EA}\u{1F1EA}', SK: '\u{1F1F8}\u{1F1F0}', SI: '\u{1F1F8}\u{1F1EE}', CY: '\u{1F1E8}\u{1F1FE}',
  MT: '\u{1F1F2}\u{1F1F9}', KG: '\u{1F1F0}\u{1F1EC}', TJ: '\u{1F1F9}\u{1F1EF}', TM: '\u{1F1F9}\u{1F1F2}', MN: '\u{1F1F2}\u{1F1F3}',
  US: '\u{1F1FA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}', DE: '\u{1F1E9}\u{1F1EA}', FR: '\u{1F1EB}\u{1F1F7}', SE: '\u{1F1F8}\u{1F1EA}',
  FI: '\u{1F1EB}\u{1F1EE}', NO: '\u{1F1F3}\u{1F1F4}', DK: '\u{1F1E9}\u{1F1F0}', BR: '\u{1F1E7}\u{1F1F7}', AR: '\u{1F1E6}\u{1F1F7}',
  CA: '\u{1F1E8}\u{1F1E6}', AU: '\u{1F1E6}\u{1F1FA}', NZ: '\u{1F1F3}\u{1F1FF}', JP: '\u{1F1EF}\u{1F1F5}', KR: '\u{1F1F0}\u{1F1F7}',
  CN: '\u{1F1E8}\u{1F1F3}', IN: '\u{1F1EE}\u{1F1F3}', PK: '\u{1F1F5}\u{1F1F0}', TH: '\u{1F1F9}\u{1F1ED}', VN: '\u{1F1FB}\u{1F1F3}',
  PH: '\u{1F1F5}\u{1F1ED}', ID: '\u{1F1EE}\u{1F1E9}', MY: '\u{1F1F2}\u{1F1FE}', SG: '\u{1F1F8}\u{1F1EC}', PT: '\u{1F1F5}\u{1F1F9}',
  ES: '\u{1F1EA}\u{1F1F8}', IT: '\u{1F1EE}\u{1F1F9}', NL: '\u{1F1F3}\u{1F1F1}', BE: '\u{1F1E7}\u{1F1EA}', AT: '\u{1F1E6}\u{1F1F9}',
  CH: '\u{1F1E8}\u{1F1ED}', IE: '\u{1F1EE}\u{1F1EA}', MX: '\u{1F1F2}\u{1F1FD}', CL: '\u{1F1E8}\u{1F1F1}', CO: '\u{1F1E8}\u{1F1F4}',
  PE: '\u{1F1F5}\u{1F1EA}', ZA: '\u{1F1FF}\u{1F1E6}', EG: '\u{1F1EA}\u{1F1EC}', SA: '\u{1F1F8}\u{1F1E6}', AE: '\u{1F1E6}\u{1F1EA}',
}

export const COUNTRY_NAMES: Record<string, string> = {
  TR: 'Turkey', GE: 'Georgia', AZ: 'Azerbaijan', AM: 'Armenia', UA: 'Ukraine',
  RO: 'Romania', BG: 'Bulgaria', RS: 'Serbia', GR: 'Greece', IR: 'Iran',
  KZ: 'Kazakhstan', UZ: 'Uzbekistan', RU: 'Russia', PL: 'Poland', HU: 'Hungary',
  IL: 'Israel', CZ: 'Czechia', HR: 'Croatia', BA: 'Bosnia', ME: 'Montenegro',
  AL: 'Albania', MK: 'North Macedonia', MD: 'Moldova', BY: 'Belarus', LT: 'Lithuania',
  LV: 'Latvia', EE: 'Estonia', SK: 'Slovakia', SI: 'Slovenia', CY: 'Cyprus',
  MT: 'Malta', KG: 'Kyrgyzstan', TJ: 'Tajikistan', TM: 'Turkmenistan', MN: 'Mongolia',
  US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France', SE: 'Sweden',
  FI: 'Finland', NO: 'Norway', DK: 'Denmark', BR: 'Brazil', AR: 'Argentina',
  CA: 'Canada', AU: 'Australia', NZ: 'New Zealand', JP: 'Japan', KR: 'South Korea',
  CN: 'China', IN: 'India', PK: 'Pakistan', TH: 'Thailand', VN: 'Vietnam',
  PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia', SG: 'Singapore', PT: 'Portugal',
  ES: 'Spain', IT: 'Italy', NL: 'Netherlands', BE: 'Belgium', AT: 'Austria',
  CH: 'Switzerland', IE: 'Ireland', MX: 'Mexico', CL: 'Chile', CO: 'Colombia',
  PE: 'Peru', ZA: 'South Africa', EG: 'Egypt', SA: 'Saudi Arabia', AE: 'UAE',
}

/** Get flag emoji for a country code. Returns empty string if unknown. */
export function getFlag(countryCode: string | null | undefined): string {
  if (!countryCode) return ''
  return COUNTRY_FLAGS[countryCode.toUpperCase()] ?? ''
}

/** Get country name for a code. Returns the code itself if unknown. */
export function getCountryName(countryCode: string | null | undefined): string {
  if (!countryCode) return ''
  return COUNTRY_NAMES[countryCode.toUpperCase()] ?? countryCode.toUpperCase()
}

/** Sorted list of countries for dropdown selectors */
export const COUNTRY_OPTIONS = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code, name, flag: COUNTRY_FLAGS[code] ?? '' }))
  .sort((a, b) => a.name.localeCompare(b.name))
