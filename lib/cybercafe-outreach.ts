/**
 * lib/cybercafe-outreach.ts — Cyber cafe discovery and outreach system
 * Generates Google Maps search links and outreach messages for gaming cafes
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CafeArea {
  city: string
  country: string
  countryCode: string
  districts: string[]
}

export interface CafeSearchLink {
  city: string
  district: string
  country: string
  searchType: string
  url: string
}

export type CafeLanguage = 'en' | 'tr' | 'ru' | 'ka' | 'ro' | 'sr'

export interface CafeOutreachMessage {
  cafeName: string
  city: string
  language: CafeLanguage
  subject: string
  body: string
}

export interface FlyerContent {
  cafeName: string
  headline: string
  subheadline: string
  bulletPoints: string[]
  qrUrl: string
  ctaText: string
  footer: string
}

// ─── Cafe Area Database ─────────────────────────────────────────────────────

const CAFE_AREAS: CafeArea[] = [
  // Turkey
  { city: 'Istanbul', country: 'Turkey', countryCode: 'TR', districts: ['Kadikoy', 'Besiktas', 'Sisli', 'Bakirkoy'] },
  { city: 'Ankara', country: 'Turkey', countryCode: 'TR', districts: ['Kizilay', 'Cankaya'] },
  { city: 'Izmir', country: 'Turkey', countryCode: 'TR', districts: [] },

  // Caucasus
  { city: 'Tbilisi', country: 'Georgia', countryCode: 'GE', districts: ['Vake', 'Saburtalo'] },
  { city: 'Baku', country: 'Azerbaijan', countryCode: 'AZ', districts: [] },
  { city: 'Yerevan', country: 'Armenia', countryCode: 'AM', districts: [] },

  // Balkans / Eastern Europe
  { city: 'Bucharest', country: 'Romania', countryCode: 'RO', districts: ['Unirii', 'Piata Romana'] },
  { city: 'Cluj-Napoca', country: 'Romania', countryCode: 'RO', districts: [] },
  { city: 'Belgrade', country: 'Serbia', countryCode: 'RS', districts: ['Knez Mihailova'] },
  { city: 'Sofia', country: 'Bulgaria', countryCode: 'BG', districts: [] },
  { city: 'Athens', country: 'Greece', countryCode: 'GR', districts: [] },

  // Middle East / Central Asia
  { city: 'Tehran', country: 'Iran', countryCode: 'IR', districts: ['Vanak', 'Valiasr'] },
  { city: 'Almaty', country: 'Kazakhstan', countryCode: 'KZ', districts: [] },
]

const SEARCH_TERMS = ['gaming+cafe', 'internet+cafe', 'cyber+cafe']

// ─── Search Link Generator ──────────────────────────────────────────────────

/** Returns Google Maps search URLs for gaming/internet/cyber cafes in all target areas */
export function getCafeSearchLinks(): CafeSearchLink[] {
  const links: CafeSearchLink[] = []

  for (const area of CAFE_AREAS) {
    const locations =
      area.districts.length > 0
        ? area.districts.map((d) => ({ district: d, query: `${area.city}+${d}` }))
        : [{ district: '', query: area.city }]

    for (const loc of locations) {
      for (const term of SEARCH_TERMS) {
        links.push({
          city: area.city,
          district: loc.district,
          country: area.country,
          searchType: term.replace(/\+/g, ' '),
          url: `https://www.google.com/maps/search/${term}+${loc.query.toLowerCase().replace(/\s+/g, '+')}`,
        })
      }
    }
  }

  return links
}

// ─── Outreach Message Templates ─────────────────────────────────────────────

const CAFE_SUBJECTS: Record<CafeLanguage, (cafeName: string) => string> = {
  en: (n) => `Free CS2 Tournaments for ${n} — Partner with RaiseGG`,
  tr: (n) => `${n} icin Ucretsiz CS2 Turnuvalari — RaiseGG Ortakligi`,
  ru: (n) => `Besplatnye turniry CS2 dlya ${n} — Partnyorstvo s RaiseGG`,
  ka: (n) => `Ufaso CS2 Turnirebi ${n}-istvis — Partnioroba RaiseGG-tan`,
  ro: (n) => `Turnee CS2 Gratuite pentru ${n} — Parteneriat cu RaiseGG`,
  sr: (n) => `Besplatni CS2 Turniri za ${n} — Partnerstvo sa RaiseGG`,
}

const CAFE_BODIES: Record<CafeLanguage, (cafeName: string, city: string) => string> = {
  en: (cafeName, city) => `Hi ${cafeName} Team,

We're RaiseGG — a competitive CS2 platform where players compete in stake matches with real prizes.

We'd like to partner with your cafe and offer:

  "${cafeName} Weekly CS2 Cup"

Your cafe gets:
- Named tournament on our platform (free promotion)
- Free printed flyers/posters with QR code for your venue
- Your cafe featured on raisegg.com as an official partner
- Bring more gamers through your door — tournaments run daily
- $5+ prizes attract competitive players to your cafe

How it works:
1. Players at your cafe sign up at raisegg.com
2. They join the "${cafeName} Weekly CS2 Cup"
3. Winners get real prizes — your cafe gets the credit and foot traffic

Zero cost to you. We handle everything online. You just display our poster.

We're building a network of gaming cafes across ${city} and want ${cafeName} to be our first partner.

Interested? Reply to this email or message us on Telegram: t.me/raise_GG

Best regards,
RaiseGG Team
raisegg.com`,

  tr: (cafeName, city) => `Merhaba ${cafeName} Ekibi,

Biz RaiseGG — oyuncularin gercek odullerle stake maclarinda yaristigi rekabetci bir CS2 platformuyuz.

Kafenizle ortaklik kurmak ve sunmak istiyoruz:

  "${cafeName} Haftalik CS2 Kupasi"

Kafeniz ne kazanir:
- Platformumuzda isimli turnuva (ucretsiz tanitim)
- Mekaniniz icin QR kodlu ucretsiz afis/poster
- Kafeniz raisegg.com'da resmi ortak olarak listelenir
- Gunluk turnuvalar ile daha fazla oyuncu cekin
- $5+ oduller rekabetci oyunculari kafenize ceker

Nasil calisir:
1. Kafenizdeki oyuncular raisegg.com'a kaydolur
2. "${cafeName} Haftalik CS2 Kupasi"na katilirlar
3. Kazananlar gercek odul alir — kafeniz taninirlik kazanir

Size sifir maliyet. Online her seyi biz yonetiyoruz. Siz sadece posterimizi asarsiniz.

${city} genelinde bir oyun kafesi agi kuruyoruz ve ${cafeName}'in ilk ortagimiz olmasini istiyoruz.

Ilgileniyor musunuz? Bu emaile yanit verin veya Telegram: t.me/raise_GG

Saygilarla,
RaiseGG Ekibi
raisegg.com`,

  ru: (cafeName, city) => `Privet, Komanda ${cafeName},

My — RaiseGG — konkurentnaya CS2 platforma gde igroki sorevnuyutsya v matchah s real'nymi prizami.

My hotim predlozhit' partnyorstvo:

  "Ezhenedel'nyj Kubok CS2 ${cafeName}"

Chto poluchaet vashe kafe:
- Imennoj turnir na nashej platforme (besplatnaya reklama)
- Besplatnye flaery/postery s QR-kodom
- Vashe kafe na raisegg.com kak oficial'nyj partner
- Bol'she gejmerov — turniry kazhdyj den'
- Prizy $5+ privlekayut igrokiv

Kak eto rabotaet:
1. Igroki v vashem kafe registriruyutsya na raisegg.com
2. Prisоedinyayutsya k kubku "${cafeName}"
3. Pobediteli poluchayut real'nye prizy

Nol' zatrat dlya vas. Zainteresovany? Otvet'te ili pishite v Telegram: t.me/raise_GG

S uvazheniem,
Komanda RaiseGG
raisegg.com`,

  ka: (cafeName, city) => `Gamarjoba, ${cafeName} Gundi,

Chven vart RaiseGG — konkurentuli CS2 platforma sadac motamasheebi namdvil prizebze asparezobent.

Gvsurs partnioroba shevtavazot:

  "${cafeName} Qovelkvireuli CS2 Tasi"

Tkveni kafe miigebs:
- Dasakhelebul turnirs chvens platformaze
- Ufaso flaerebs/posterebs QR kodit
- Tkveni kafe raisegg.com-ze rogorc oficialuri partniari

Kharji nulovani. Dainteresebulkharth? Upasukhet an mogvwereth Telegram-ze: t.me/raise_GG

Pativiscemith,
RaiseGG Gundi
raisegg.com`,

  ro: (cafeName, city) => `Buna ziua, Echipa ${cafeName},

Suntem RaiseGG — o platforma competitiva CS2 unde jucatorii concureaza in meciuri cu premii reale.

Dorim sa va propunem un parteneriat:

  "Cupa CS2 Saptamanala ${cafeName}"

Ce primeste cafeneaua dvs.:
- Turneu cu numele dvs. pe platforma (promovare gratuita)
- Flyere/postere gratuite cu cod QR
- Cafeneaua listata pe raisegg.com ca partener oficial
- Mai multi gameri — turnee zilnice
- Premii $5+ atrag jucatori competitivi

Cum functioneaza:
1. Jucatorii se inregistreaza pe raisegg.com
2. Se alatura cupei "${cafeName}"
3. Castigatorii primesc premii reale

Cost zero pentru dvs. Interesati? Raspundeti sau scrieti pe Telegram: t.me/raise_GG

Cu stima,
Echipa RaiseGG
raisegg.com`,

  sr: (cafeName, city) => `Zdravo, ${cafeName} Tim,

Mi smo RaiseGG — kompetitivna CS2 platforma gde se igraci takmice za prave nagrade.

Zelimo da ponudimo partnerstvo:

  "${cafeName} Nedeljni CS2 Kup"

Sta vas kafe dobija:
- Imenovani turnir na nasoj platformi (besplatna promocija)
- Besplatni flajeri/posteri sa QR kodom
- Vas kafe na raisegg.com kao zvanicni partner
- Vise gejmera — turniri svaki dan
- Nagrade $5+ privlace kompetitivne igrace

Kako funkcionise:
1. Igraci se registruju na raisegg.com
2. Pridruze se kupu "${cafeName}"
3. Pobednici dobijaju nagrade

Nula troskova za vas. Zainteresovani? Odgovorite ili nam pisite na Telegram: t.me/raise_GG

Srdacno,
RaiseGG Tim
raisegg.com`,
}

/** Generates an outreach message for a specific cafe */
export function generateCafeOutreachMessage(
  cafeName: string,
  city: string,
  language: CafeLanguage = 'en',
): CafeOutreachMessage {
  return {
    cafeName,
    city,
    language,
    subject: CAFE_SUBJECTS[language](cafeName),
    body: CAFE_BODIES[language](cafeName, city),
  }
}

/** Generates promotional flyer text content for a cafe */
export function generateFlyerContent(cafeName: string): FlyerContent {
  return {
    cafeName,
    headline: 'FREE CS2 Tournament Every Day',
    subheadline: '$5+ Prize Pool — Zero Entry Fee',
    bulletPoints: [
      'Compete against real players for real prizes',
      'Built-in anti-cheat — fair matches guaranteed',
      'Sign up in 30 seconds with your Steam account',
      `Exclusive: ${cafeName} Weekly CS2 Cup`,
      'Join thousands of players across the region',
    ],
    qrUrl: 'https://raisegg.com/tournaments',
    ctaText: 'Scan QR Code or visit raisegg.com/tournaments',
    footer: `Powered by RaiseGG — ${cafeName} Official Partner`,
  }
}
