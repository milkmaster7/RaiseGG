/**
 * lib/meme-templates.ts — Gaming meme content for social posting
 *
 * 30+ meme text templates for CS2, Dota 2, Deadlock in English, Turkish, and Russian.
 * Mix of trash talk, city rivalries, frustrations, wins, and noob moments.
 */

import type { Game } from './tournaments'

interface MemeTemplate {
  text: string
  lang: 'en' | 'tr' | 'ru'
  game?: Game   // undefined = generic gaming
}

// ─── Templates ─────────────────────────────────────────────────────────────

const MEMES: MemeTemplate[] = [
  // ── English — CS2 ──
  { text: 'When your teammate says "trust me I\'ll awp" and goes 2-15', lang: 'en', game: 'cs2' },
  { text: 'POV: You finally beat the guy who\'s been trash talking all week', lang: 'en', game: 'cs2' },
  { text: '"Don\'t peek" he said. He peeked. He died. Every. Single. Round.', lang: 'en', game: 'cs2' },
  { text: 'When you clutch a 1v4 and nobody is spectating you', lang: 'en', game: 'cs2' },
  { text: 'My aim in warmup vs my aim in the actual match', lang: 'en', game: 'cs2' },
  { text: 'When the bottom fragger says "I\'m just having an off day"... bro it\'s been 6 months', lang: 'en', game: 'cs2' },
  { text: '"Rush B don\'t stop" *entire team stops*', lang: 'en', game: 'cs2' },
  { text: 'When you hear the bomb beeping and you just accept your fate', lang: 'en', game: 'cs2' },
  { text: 'That feeling when you finally rank up and immediately lose 5 games in a row', lang: 'en', game: 'cs2' },
  { text: 'When your teammate buys a negev in a crucial round and somehow gets 3 kills', lang: 'en', game: 'cs2' },

  // ── English — Dota 2 ──
  { text: 'When your carry has 30 min battlefury and says "we can win late"', lang: 'en', game: 'dota2' },
  { text: 'POV: Your support just took the last hit on the siege creep', lang: 'en', game: 'dota2' },
  { text: '"gg end" at minute 8 then proceeds to play 50 more minutes', lang: 'en', game: 'dota2' },
  { text: 'When the enemy picks Techies and you know the next 60 minutes of your life are ruined', lang: 'en', game: 'dota2' },
  { text: 'When your mid says "ez mid" and he\'s 0-5 at 10 minutes', lang: 'en', game: 'dota2' },

  // ── English — Deadlock ──
  { text: 'Deadlock aim duels feel like a cowboy standoff where both cowboys miss', lang: 'en', game: 'deadlock' },
  { text: 'Me: "Deadlock is easy, it\'s just a shooter"\nAlso me: 0-8 in lane', lang: 'en', game: 'deadlock' },
  { text: 'When you finally understand Deadlock\'s item system after 200 hours', lang: 'en', game: 'deadlock' },

  // ── English — Generic ──
  { text: 'When your internet dies at 14-14', lang: 'en' },
  { text: '"One more game" — me at 4am, 6 games ago', lang: 'en' },
  { text: 'The difference between "I\'m warming up" and "I\'m washed" is about 3 games', lang: 'en' },

  // ── Turkish — CS2 ──
  { text: 'Takimda "ben awplarim" diyen var. Sonuc: 2-15', lang: 'tr', game: 'cs2' },
  { text: 'Butun hafta laf atan adami sonunda yendigin an', lang: 'tr', game: 'cs2' },
  { text: '"Peek atma" dedi. Peek atti. Oldu. Her. Tur.', lang: 'tr', game: 'cs2' },
  { text: '1v4 clutch atiyorsun ama kimse seni izlemiyor', lang: 'tr', game: 'cs2' },
  { text: '"Rush B dur" *tum takim duruyor*', lang: 'tr', game: 'cs2' },
  { text: 'Isindirmada aim tanrisi, macta aim engelli', lang: 'tr', game: 'cs2' },
  { text: 'Bombayı duyunca kaderini kabul ettigin an', lang: 'tr', game: 'cs2' },
  { text: 'Rank atladigin gibi 5 mac ust uste kaybediyorsun', lang: 'tr', game: 'cs2' },

  // ── Turkish — Dota 2 ──
  { text: 'Carry 30 dakikada battlefury aliyor: "late kazaniriz"', lang: 'tr', game: 'dota2' },
  { text: '"gg bitti" 8. dakikada yazdi. 50 dakika daha oynadi.', lang: 'tr', game: 'dota2' },
  { text: 'Support son vurus aldi. Carry nin ruhu cikti.', lang: 'tr', game: 'dota2' },

  // ── Turkish — Generic ──
  { text: '"Bir mac daha" — saat 4, 6 mac once de ayni seyi soylemistim', lang: 'tr' },
  { text: 'Internet 14-14 de gidince hayat anlamini kaybeder', lang: 'tr' },
  { text: 'Istanbul vs Ankara — hangi sehir daha cok ragequit atar?', lang: 'tr' },

  // ── Russian — CS2 ──
  { text: 'Когда тиммейт говорит "я снайпер" и идет 2-15', lang: 'ru', game: 'cs2' },
  { text: 'Когда ты клатчишь 1v4, но никто не наблюдает', lang: 'ru', game: 'cs2' },
  { text: '"Не пикай" — сказал он. Он пикнул. Он умер. Каждый. Раунд.', lang: 'ru', game: 'cs2' },
  { text: '"Раш Б не останавливайся" *вся команда встала*', lang: 'ru', game: 'cs2' },
  { text: 'Мой прицел на разминке vs мой прицел в матче — два разных человека', lang: 'ru', game: 'cs2' },
  { text: 'Когда нижний фраггер говорит "просто не мой день"... брат, уже полгода', lang: 'ru', game: 'cs2' },
  { text: 'Когда ранкнулся вверх и сразу проиграл 5 матчей подряд', lang: 'ru', game: 'cs2' },

  // ── Russian — Dota 2 ──
  { text: 'Керри: battlefury на 30 минуте. "Поздно выиграем"\nРассказчик: они не выиграли.', lang: 'ru', game: 'dota2' },
  { text: '"gg конец" на 8 минуте. Потом играет еще 50 минут.', lang: 'ru', game: 'dota2' },
  { text: 'Когда саппорт забирает ласт хит на сидж крипе', lang: 'ru', game: 'dota2' },
  { text: 'Когда враг берет Techies и ты знаешь: следующий час жизни потерян', lang: 'ru', game: 'dota2' },

  // ── Russian — Deadlock ──
  { text: 'Дуэли в Deadlock как ковбойская перестрелка где оба промазали', lang: 'ru', game: 'deadlock' },

  // ── Russian — Generic ──
  { text: '"Еще одна игра" — я в 4 утра, 6 игр назад', lang: 'ru' },
  { text: 'Когда интернет падает на 14-14', lang: 'ru' },
]

// ─── Public API ────────────────────────────────────────────────────────────

/** Get a random meme text filtered by language and optionally by game */
export function getRandomMeme(lang: 'en' | 'tr' | 'ru', game?: Game): string {
  let pool = MEMES.filter(m => m.lang === lang)
  if (game) {
    // Prefer game-specific, but fall back to generic if empty
    const gameSpecific = pool.filter(m => m.game === game || !m.game)
    if (gameSpecific.length > 0) pool = gameSpecific
  }
  if (pool.length === 0) pool = MEMES.filter(m => m.lang === 'en') // ultimate fallback
  return pool[Math.floor(Math.random() * pool.length)].text
}

/** RaiseGG promotional suffixes — subtle, not obnoxious */
const RAISEGG_TAGS = {
  en: [
    '\n\n— Settle it on RaiseGG',
    '\n\nProve it on raisegg.com',
    '\n\nTalk is cheap. Play for USDC on RaiseGG.',
    '\n\nFree tournaments daily on raisegg.com',
  ],
  tr: [
    '\n\n— RaiseGG de ispat et',
    '\n\nLaf degil, USDC icin oyna. raisegg.com',
    '\n\nHer gun ucretsiz turnuva: raisegg.com',
  ],
  ru: [
    '\n\n— Докажи на RaiseGG',
    '\n\nСлова ничего не стоят. Играй на USDC. raisegg.com',
    '\n\nБесплатные турниры каждый день: raisegg.com',
  ],
}

/**
 * Get a meme ready for posting.
 * Roughly 1 in 5 memes include a subtle RaiseGG mention.
 */
export function getMemeForPosting(): { text: string; lang: 'en' | 'tr' | 'ru'; game?: Game } {
  const langs: Array<'en' | 'tr' | 'ru'> = ['en', 'tr', 'ru']
  const lang = langs[Math.floor(Math.random() * langs.length)]

  const pool = MEMES.filter(m => m.lang === lang)
  const meme = pool[Math.floor(Math.random() * pool.length)]

  let text = meme.text

  // ~20% chance to add a RaiseGG tag
  if (Math.random() < 0.2) {
    const tags = RAISEGG_TAGS[lang]
    text += tags[Math.floor(Math.random() * tags.length)]
  }

  return { text, lang, game: meme.game }
}
