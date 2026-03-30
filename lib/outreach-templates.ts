/**
 * lib/outreach-templates.ts — Outreach message templates for streamer partnerships
 *
 * Pre-written DM templates in multiple languages for reaching out to
 * Twitch micro-influencers about RaiseGG partnership.
 */

// ─── Templates ──────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, (streamerName: string) => string> = {
  en: (name: string) => `Hey ${name}!

I'm from RaiseGG — a skill-based staking platform for CS2 and Dota 2. Players stake real money (USDC) on their own matches with blockchain escrow, anti-cheat, and instant payouts.

We're looking for streamers to partner with, and your channel caught our eye. Here's what we offer:

- Verified Streamer badge on RaiseGG
- Your own named tournament (e.g. "${name} Invitational") with prize pool
- Custom referral link — earn from every player you bring in
- Early access to new features

No cost, no commitment. Just stream what you already play, and your viewers can join your tournaments.

Check us out: https://raisegg.com

Interested? Just reply here or DM us on Twitter/X: @raise_GG

GG!`,

  tr: (name: string) => `Selam ${name}!

Ben RaiseGG'den yaziyorum. CS2 ve Dota 2 icin beceriye dayali bir staking platformuyuz. Oyuncular kendi maclarina gercek para (USDC) koyuyor — blockchain escrow, anti-cheat ve aninda odeme ile.

Kanalinizi gorduk ve partner olmak istiyoruz. Size sunduklarimiz:

- RaiseGG'de Onaylanmis Yayinci rozeti
- Kendi adiniza ozel turnuva (ornegin "${name} Invitational") ve odul havuzu
- Kisisel referans linki — getirdiginiz her oyuncudan kazanin
- Yeni ozelliklere erken erisim

Ucret yok, zorunluluk yok. Zaten oynadiginiz oyunlari yayinlayin, izleyicileriniz turnuvalariniza katilsin.

Bizi inceleyin: https://raisegg.com

Ilgileniyorsaniz buradan veya Twitter/X'ten yazin: @raise_GG

GG!`,

  ru: (name: string) => `Привет, ${name}!

Мы из RaiseGG — платформа для ставок на собственный скилл в CS2 и Dota 2. Игроки ставят реальные деньги (USDC) на свои матчи с блокчейн-эскроу, античитом и моментальными выплатами.

Мы ищем стримеров для партнерства, и ваш канал нас заинтересовал. Что мы предлагаем:

- Значок "Верифицированный стример" на RaiseGG
- Именной турнир (например, "${name} Invitational") с призовым фондом
- Персональная реферальная ссылка — зарабатывайте с каждого приведенного игрока
- Ранний доступ к новым функциям

Бесплатно, без обязательств. Просто стримьте то, что уже играете — ваши зрители смогут участвовать в ваших турнирах.

Заходите: https://raisegg.com

Заинтересовало? Ответьте здесь или напишите нам в Twitter/X: @raise_GG

GG!`,
}

// ─── Language display names ─────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Turkish',
  ru: 'Russian',
  ro: 'Romanian',
  sr: 'Serbian',
  pl: 'Polish',
  ka: 'Georgian',
  az: 'Azerbaijani',
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get a personalized outreach message for a streamer.
 *
 * @param language - ISO language code ('en', 'tr', 'ru')
 * @param streamerName - The streamer's display name for personalization
 * @returns The outreach message text
 */
export function getOutreachMessage(language: string, streamerName: string): string {
  // Fall back to English if the language isn't available
  const templateFn = TEMPLATES[language] ?? TEMPLATES.en
  return templateFn(streamerName)
}

/**
 * Get all available template languages
 */
export function getAvailableLanguages(): { code: string; name: string }[] {
  return Object.keys(TEMPLATES).map(code => ({
    code,
    name: LANGUAGE_NAMES[code] ?? code,
  }))
}
