/**
 * lib/university-outreach.ts — University esports club finder and outreach email generator
 * Target regions: Turkey, Romania, Poland, Serbia, Georgia, Greece, Hungary, Bulgaria, Kazakhstan
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface University {
  name: string
  city: string
  country: string
  countryCode: string
  esportsClubEmail: string
  contactType: 'esports_club' | 'gaming_society' | 'student_union' | 'cs_department'
}

export type OutreachLanguage = 'en' | 'tr' | 'ro' | 'pl' | 'sr' | 'ru' | 'ka'

export interface OutreachEmail {
  to: string
  subject: string
  body: string
  university: University
  language: OutreachLanguage
}

// ─── University Database ────────────────────────────────────────────────────

const UNIVERSITIES: University[] = [
  // Turkey
  { name: 'Istanbul Technical University', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@itu.edu.tr', contactType: 'esports_club' },
  { name: 'Bogazici University', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@boun.edu.tr', contactType: 'gaming_society' },
  { name: 'METU (ODTU)', city: 'Ankara', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@metu.edu.tr', contactType: 'esports_club' },
  { name: 'Ankara University', city: 'Ankara', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@ankara.edu.tr', contactType: 'student_union' },
  { name: 'Bilkent University', city: 'Ankara', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@bilkent.edu.tr', contactType: 'gaming_society' },
  { name: 'Sabanci University', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@sabanciuniv.edu', contactType: 'esports_club' },
  { name: 'Koc University', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@ku.edu.tr', contactType: 'gaming_society' },
  { name: 'Hacettepe University', city: 'Ankara', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@hacettepe.edu.tr', contactType: 'student_union' },
  { name: 'Ege University', city: 'Izmir', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@ege.edu.tr', contactType: 'esports_club' },
  { name: 'Dokuz Eylul University', city: 'Izmir', country: 'Turkey', countryCode: 'TR', esportsClubEmail: 'esports@deu.edu.tr', contactType: 'student_union' },

  // Romania
  { name: 'University of Bucharest', city: 'Bucharest', country: 'Romania', countryCode: 'RO', esportsClubEmail: 'esports@unibuc.ro', contactType: 'gaming_society' },
  { name: 'Politehnica University of Bucharest', city: 'Bucharest', country: 'Romania', countryCode: 'RO', esportsClubEmail: 'esports@upb.ro', contactType: 'esports_club' },
  { name: 'Babes-Bolyai University', city: 'Cluj-Napoca', country: 'Romania', countryCode: 'RO', esportsClubEmail: 'esports@ubbcluj.ro', contactType: 'esports_club' },
  { name: 'West University of Timisoara', city: 'Timisoara', country: 'Romania', countryCode: 'RO', esportsClubEmail: 'esports@e-uvt.ro', contactType: 'student_union' },

  // Poland
  { name: 'University of Warsaw', city: 'Warsaw', country: 'Poland', countryCode: 'PL', esportsClubEmail: 'esports@uw.edu.pl', contactType: 'esports_club' },
  { name: 'AGH University of Krakow', city: 'Krakow', country: 'Poland', countryCode: 'PL', esportsClubEmail: 'esports@agh.edu.pl', contactType: 'gaming_society' },
  { name: 'Warsaw University of Technology', city: 'Warsaw', country: 'Poland', countryCode: 'PL', esportsClubEmail: 'esports@pw.edu.pl', contactType: 'esports_club' },
  { name: 'Wroclaw University of Science and Technology', city: 'Wroclaw', country: 'Poland', countryCode: 'PL', esportsClubEmail: 'esports@pwr.edu.pl', contactType: 'cs_department' },

  // Serbia
  { name: 'University of Belgrade', city: 'Belgrade', country: 'Serbia', countryCode: 'RS', esportsClubEmail: 'esports@bg.ac.rs', contactType: 'gaming_society' },
  { name: 'University of Novi Sad', city: 'Novi Sad', country: 'Serbia', countryCode: 'RS', esportsClubEmail: 'esports@uns.ac.rs', contactType: 'student_union' },

  // Georgia
  { name: 'Tbilisi State University', city: 'Tbilisi', country: 'Georgia', countryCode: 'GE', esportsClubEmail: 'esports@tsu.ge', contactType: 'student_union' },
  { name: 'Georgian Technical University', city: 'Tbilisi', country: 'Georgia', countryCode: 'GE', esportsClubEmail: 'esports@gtu.ge', contactType: 'cs_department' },
  { name: 'Free University of Tbilisi', city: 'Tbilisi', country: 'Georgia', countryCode: 'GE', esportsClubEmail: 'esports@freeuni.edu.ge', contactType: 'gaming_society' },

  // Greece
  { name: 'National Technical University of Athens', city: 'Athens', country: 'Greece', countryCode: 'GR', esportsClubEmail: 'esports@ntua.gr', contactType: 'esports_club' },
  { name: 'Aristotle University of Thessaloniki', city: 'Thessaloniki', country: 'Greece', countryCode: 'GR', esportsClubEmail: 'esports@auth.gr', contactType: 'gaming_society' },

  // Hungary
  { name: 'Budapest University of Technology and Economics', city: 'Budapest', country: 'Hungary', countryCode: 'HU', esportsClubEmail: 'esports@bme.hu', contactType: 'esports_club' },
  { name: 'ELTE Budapest', city: 'Budapest', country: 'Hungary', countryCode: 'HU', esportsClubEmail: 'esports@elte.hu', contactType: 'gaming_society' },

  // Bulgaria
  { name: 'Sofia University St. Kliment Ohridski', city: 'Sofia', country: 'Bulgaria', countryCode: 'BG', esportsClubEmail: 'esports@uni-sofia.bg', contactType: 'student_union' },
  { name: 'Technical University of Sofia', city: 'Sofia', country: 'Bulgaria', countryCode: 'BG', esportsClubEmail: 'esports@tu-sofia.bg', contactType: 'cs_department' },

  // Kazakhstan
  { name: 'Nazarbayev University', city: 'Astana', country: 'Kazakhstan', countryCode: 'KZ', esportsClubEmail: 'esports@nu.edu.kz', contactType: 'esports_club' },
  { name: 'Al-Farabi Kazakh National University', city: 'Almaty', country: 'Kazakhstan', countryCode: 'KZ', esportsClubEmail: 'esports@kaznu.kz', contactType: 'gaming_society' },
]

// ─── Regional Rivals (for email personalization) ────────────────────────────

const REGIONAL_RIVALS: Record<string, string[]> = {
  TR: ['Bogazici', 'ITU', 'METU', 'Bilkent', 'Koc'],
  RO: ['Politehnica', 'Babes-Bolyai', 'University of Bucharest'],
  PL: ['University of Warsaw', 'AGH', 'Warsaw Tech', 'Wroclaw'],
  RS: ['Belgrade', 'Novi Sad'],
  GE: ['TSU', 'GTU', 'Free University'],
  GR: ['NTUA', 'Aristotle'],
  HU: ['BME', 'ELTE'],
  BG: ['Sofia University', 'Technical University'],
  KZ: ['Nazarbayev', 'Al-Farabi'],
}

// ─── Email Templates ────────────────────────────────────────────────────────

const SUBJECTS: Record<OutreachLanguage, (uniName: string) => string> = {
  en: (n) => `${n} CS2 Championship — Free Entry, Real Prizes`,
  tr: (n) => `${n} CS2 Sampiyonasi — Ucretsiz Katilim, Gercek Oduller`,
  ro: (n) => `Campionatul CS2 ${n} — Inscriere Gratuita, Premii Reale`,
  pl: (n) => `Mistrzostwa CS2 ${n} — Darmowy Wstep, Prawdziwe Nagrody`,
  sr: (n) => `${n} CS2 Prvenstvo — Besplatan Ulaz, Prave Nagrade`,
  ru: (n) => `Chempionat CS2 ${n} — Besplatnyj Vhod, Real'nye Prizy`,
  ka: (n) => `${n} CS2 Chempionati — Ufaso Monawileoba, Namdvili Prizebi`,
}

const BODIES: Record<OutreachLanguage, (uni: University, rivals: string[]) => string> = {
  en: (uni, rivals) => `Hi ${uni.name} Esports Team,

We're RaiseGG (raisegg.com) — a competitive CS2 platform with stake matches, anti-cheat, and automated tournaments.

We'd like to offer your university a FREE named tournament:

  "${uni.name} CS2 Championship"

What you get:
- Zero cost — we host and manage everything
- $5+ prize pool (we fund it)
- Built-in anti-cheat and match verification
- Your university name featured on the platform
- Inter-university rivalry: compete against ${rivals.join(', ')}

All your players need is a Steam account. Sign up at raisegg.com, join the tournament, and play.

We're building the biggest university CS2 league in the ${uni.country} region. Your team could be the first to claim the title.

Interested? Just reply to this email and we'll set up your tournament within 24 hours.

Best regards,
RaiseGG Team
raisegg.com | t.me/raise_GG`,

  tr: (uni, rivals) => `Merhaba ${uni.name} Espor Takimi,

Biz RaiseGG (raisegg.com) — stake maclari, anti-cheat ve otomatik turnuvalar sunan rekabetci bir CS2 platformuyuz.

Universitenize UCRETSIZ isimli bir turnuva teklif etmek istiyoruz:

  "${uni.name} CS2 Sampiyonasi"

Ne kazanirsiniz:
- Sifir maliyet — her seyi biz yonetiyoruz
- $5+ odul havuzu (biz finanse ediyoruz)
- Entegre anti-cheat ve mac dogrulama
- Universite adiniz platformda one cikar
- Universiteler arasi rekabet: ${rivals.join(', ')} ile yarisma

Oyuncularinizin tek ihtiyaci bir Steam hesabi. raisegg.com'a kaydolun, turnuvaya katilip oynamaya baslayin.

${uni.country} bolgesindeki en buyuk universite CS2 ligini kuruyoruz. Tariminiz unvani ilk talep eden olabilir.

Ilgileniyor musunuz? Bu e-postaya yanit verin, 24 saat icinde turnuvanizi kuralim.

Saygilarla,
RaiseGG Ekibi
raisegg.com | t.me/raise_GG`,

  ro: (uni, rivals) => `Buna ziua, Echipa Esports ${uni.name},

Suntem RaiseGG (raisegg.com) — o platforma competitiva CS2 cu meciuri stake, anti-cheat si turnee automate.

Dorim sa oferim universitatii dvs. un turneu GRATUIT cu numele:

  "Campionatul CS2 ${uni.name}"

Ce primiti:
- Cost zero — noi gestionam totul
- Fond de premii $5+ (finantat de noi)
- Anti-cheat integrat si verificare meciuri
- Numele universitatii pe platforma
- Rivalitate inter-universitara: competiti cu ${rivals.join(', ')}

Jucatorii au nevoie doar de un cont Steam. Inregistrare pe raisegg.com.

Interesati? Raspundeti la acest email si configuram turnamentul in 24 de ore.

Cu stima,
Echipa RaiseGG
raisegg.com | t.me/raise_GG`,

  pl: (uni, rivals) => `Czesc, Druzyna Esportowa ${uni.name},

Jestesmy RaiseGG (raisegg.com) — konkurencyjna platforma CS2 z meczami stake, anti-cheatem i automatycznymi turniejami.

Chcielibysmy zaproponowac Waszej uczelni DARMOWY turniej:

  "Mistrzostwa CS2 ${uni.name}"

Co otrzymujecie:
- Zero kosztow — wszystkim zarzadzamy
- Pula nagrod $5+ (finansujemy)
- Wbudowany anti-cheat i weryfikacja meczy
- Nazwa uczelni na platformie
- Rywalizacja miedzyuczelniana: rywalizujcie z ${rivals.join(', ')}

Gracze potrzebuja tylko konta Steam. Rejestracja na raisegg.com.

Zainteresowani? Odpowiedzcie na ten email, a w 24 godziny uruchomimy turniej.

Pozdrawiamy,
Zespol RaiseGG
raisegg.com | t.me/raise_GG`,

  sr: (uni, rivals) => `Zdravo, ${uni.name} Esport Tim,

Mi smo RaiseGG (raisegg.com) — kompetitivna CS2 platforma sa stake mecevima, anti-cheat-om i automatskim turnirima.

Zelimo da ponudimo vasem univerzitetu BESPLATAN turnir:

  "${uni.name} CS2 Prvenstvo"

Sta dobijate:
- Nula troskova — mi organizujemo sve
- Nagradni fond $5+ (mi finansiramo)
- Ugradjen anti-cheat i verifikacija meceva
- Ime univerziteta na platformi
- Medjuuniverzitetsko rivalstvo: takmicite se protiv ${rivals.join(', ')}

Igracima je potreban samo Steam nalog. Registracija na raisegg.com.

Zainteresovani? Odgovorite na ovaj email i podesicemo turnir u roku od 24 sata.

Srdacno,
RaiseGG Tim
raisegg.com | t.me/raise_GG`,

  ru: (uni, rivals) => `Privet, Komanda ${uni.name},

My — RaiseGG (raisegg.com) — konkurentnaya CS2 platforma so stavochnymi matchami, anti-chitom i avtomaticheskimi turnirami.

My hotim predlozhit' vashemu universitetu BESPLATNYJ turnir:

  "Chempionat CS2 ${uni.name}"

Chto vy poluchaete:
- Nol' zatrat — my upravlyaem vsem
- Prizovoj fond $5+ (my finansiruem)
- Vstroennyj anti-chit i verifikaciya matchej
- Nazvanie universiteta na platforme
- Mezhuniversitetskoe sopernichestvo: sorevnujtes' s ${rivals.join(', ')}

Igrokam nuzhen tol'ko akkaunt Steam. Registraciya na raisegg.com.

Zainteresovany? Otvet'te na eto pis'mo i my nastroim turnir v techenie 24 chasov.

S uvazheniem,
Komanda RaiseGG
raisegg.com | t.me/raise_GG`,

  ka: (uni, rivals) => `Gamarjoba, ${uni.name} Esports Gundi,

Chven vart RaiseGG (raisegg.com) — konkurentuli CS2 platforma stake matchebit, anti-chit-it da avtomatur turnirebith.

Gvsurs tkven universitetis UFASO turniri shevtavazot:

  "${uni.name} CS2 Chempionati"

Ras miigebth:
- Nulovan kharji — chven vmartvavt qvelafers
- Saprizod fondi $5+ (chven vafinansebt)
- Chaშenebuli anti-chiti da matchis verifikacia
- Tkveni universitetis sakheli platformaze
- Universitetebshorisi metoqeoba: ibrdzoleth ${rivals.join(', ')}-than

Motamasheebs mkholvod Steam angarishi schirvebath. Registracia raisegg.com-ze.

Dainteresebulkharth? Upasukhet am emails da 24 saatshi turnirs davayenebt.

Pativiscemith,
RaiseGG Gundi
raisegg.com | t.me/raise_GG`,
}

// ─── Public Functions ───────────────────────────────────────────────────────

/** Returns the full list of target universities */
export function getUniversityList(): University[] {
  return UNIVERSITIES
}

/** Generates a personalized outreach email for a university */
export function generateOutreachEmail(
  university: University,
  language: OutreachLanguage = 'en',
): OutreachEmail {
  const rivals = REGIONAL_RIVALS[university.countryCode] ?? []
  const filteredRivals = rivals.filter((r) => !university.name.includes(r)).slice(0, 3)

  return {
    to: university.esportsClubEmail,
    subject: SUBJECTS[language](university.name),
    body: BODIES[language](university, filteredRivals),
    university,
    language,
  }
}

/** Returns the default language for a country code */
function getDefaultLanguage(countryCode: string): OutreachLanguage {
  const map: Record<string, OutreachLanguage> = {
    TR: 'tr',
    RO: 'ro',
    PL: 'pl',
    RS: 'sr',
    GE: 'ka',
    GR: 'en', // no Greek template, use English
    HU: 'en', // no Hungarian template, use English
    BG: 'en', // no Bulgarian template, use English
    KZ: 'ru',
  }
  return map[countryCode] ?? 'en'
}

/** Generates outreach emails for ALL universities in their default languages */
export function generateAllEmails(): OutreachEmail[] {
  return UNIVERSITIES.map((uni) =>
    generateOutreachEmail(uni, getDefaultLanguage(uni.countryCode)),
  )
}
