// Cron: VK marketing auto-poster
// Posts tournament announcements in Russian to configured VK groups.
// Schedule: Every 12 hours

import { NextResponse } from 'next/server'
import { isConfigured, postToMultipleGroups } from '@/lib/vk-poster'
import { recordCronRun } from '@/lib/monitor'

export const maxDuration = 60

// Russian message templates for VK communities — CS2, Dota 2, Deadlock
const VK_MESSAGES = [
  // ─── CS2 ──────────────────────────────────────────────────────────
  '🎮 Бесплатный турнир CS2 сегодня!\n\n' +
  'Призовой фонд: $5 USDC\n' +
  '8 игроков, Single Elimination\n' +
  'Вход бесплатный. Античит включён.\n\n' +
  'Представь свой город!\n' +
  '👉 https://raisegg.com/tournaments',

  '🔥 RaiseGG — ставь на свой скилл в CS2!\n\n' +
  'Блокчейн эскроу — деньги в безопасности\n' +
  'Встроенный античит\n' +
  'Мгновенные выплаты в USDC/USDT\n' +
  'Бесплатные турниры каждый день\n\n' +
  '👉 https://raisegg.com',

  '⚔️ Город против города — CS2!\n\n' +
  'Москва vs Питер\n' +
  'Астана vs Алматы\n' +
  'Минск vs Киев\n\n' +
  'Бесплатные турниры, реальные призы.\n' +
  '👉 https://raisegg.com/tournaments',

  '💰 Ищем игроков CS2 из СНГ!\n\n' +
  '1v1, 2v2, 5v5 на реальные деньги\n' +
  'Блокчейн эскроу (USDC/USDT)\n' +
  'Ежедневные бесплатные турниры с призами\n\n' +
  'Зарегистрируйся и играй:\n' +
  '👉 https://raisegg.com/play',

  '🏆 Бесплатный ежедневный турнир CS2\n\n' +
  'Никаких взносов — просто заходи и играй\n' +
  '$5 USDC победителю\n' +
  'Античит + блокчейн эскроу\n\n' +
  'RaiseGG — платформа для тех, кто уверен в своём скилле\n' +
  '👉 https://raisegg.com/tournaments',

  '🎯 Надоело играть впустую?\n\n' +
  'На RaiseGG можно играть в CS2 на реальные деньги.\n' +
  'Эскроу на блокчейне — никто не кинет.\n' +
  'Античит встроен.\n' +
  'Бесплатные турниры каждый день.\n\n' +
  '👉 https://raisegg.com',

  '💥 Клатч 1v5? Докажи это на деле.\n\n' +
  'RaiseGG — ставь свои USDC на свой аим.\n' +
  'Проиграл — платишь, выиграл — забираешь.\n' +
  'Античит. Эскроу. Без кидков.\n\n' +
  '👉 https://raisegg.com/play',

  '🧠 Тиммейты сливают? Играй 1v1.\n\n' +
  'На RaiseGG — только ты и твой скилл.\n' +
  '1v1 на любой карте за USDC.\n' +
  'Блокчейн эскроу — деньги не пропадут.\n\n' +
  '👉 https://raisegg.com',

  '❓ Сколько стоит твой ранг в CS2?\n\n' +
  'Глобал? Фасеит 10? Докажи в 1v1 на RaiseGG.\n' +
  'Поставь крипту на свой скилл.\n' +
  'Бесплатные турниры каждый день.\n\n' +
  '👉 https://raisegg.com/play',

  '🎯 Кто лучший AWP-ер СНГ?\n\n' +
  'Заходи на RaiseGG, ставь на свой аим.\n' +
  '1v1 AWP-only за USDC.\n' +
  'Тэгни своего дуо-партнёра в коментах!\n\n' +
  '👉 https://raisegg.com',

  // ─── Dota 2 ───────────────────────────────────────────────────────
  '🛡️ Дотеры, ваш ММР чего-то стоит?\n\n' +
  'На RaiseGG — 1v1 мид или 5v5 за реальные USDC.\n' +
  'Блокчейн эскроу — скам невозможен.\n' +
  'Бесплатные турниры каждый день.\n\n' +
  '👉 https://raisegg.com',

  '⚔️ 1v1 мид на Dota 2 — кто сильнее?\n\n' +
  'Ставь крипту на свой скилл.\n' +
  'SF vs SF, никаких отмазок.\n' +
  'Эскроу на блокчейне — без кидков.\n\n' +
  '👉 https://raisegg.com/play',

  '🏆 Бесплатный турнир Dota 2!\n\n' +
  '$5 USDC призовой фонд\n' +
  '8 игроков, сингл элим\n' +
  'Докажи что твои 6к — не на бустере.\n\n' +
  '👉 https://raisegg.com/tournaments',

  '💎 Carry или мидер? Покажи скилл.\n\n' +
  'RaiseGG — платформа для Dota 2 дуэлей.\n' +
  '1v1 мид за USDC с блокчейн эскроу.\n' +
  'Тэгни корешей — пора собирать стак.\n\n' +
  '👉 https://raisegg.com',

  '🔥 Задолбали токсичные рандомы?\n\n' +
  'Играй 1v1 мид на RaiseGG.\n' +
  'Только ты, враг и миддл. За реальные деньги.\n' +
  'Блокчейн эскроу. Никаких кидков.\n\n' +
  '👉 https://raisegg.com/play',

  '❓ Кто лучший мидер СНГ?\n\n' +
  'RaiseGG — 1v1 мид Dota 2.\n' +
  'Invoker, SF, или любой герой.\n' +
  'Ставь USDC, выиграй и забирай.\n\n' +
  'Напиши в коментах кого бы ты вызвал!\n' +
  '👉 https://raisegg.com',

  '🛡️ Дневные турниры Dota 2 на RaiseGG\n\n' +
  'Вход бесплатный. Призы реальные.\n' +
  '$5 USDC каждый день.\n' +
  'Античит + блокчейн.\n\n' +
  '👉 https://raisegg.com/tournaments',

  '💰 Дота — это не просто игра.\n\n' +
  'На RaiseGG твой скилл приносит реальные деньги.\n' +
  '1v1, 2v2, 5v5 за USDC.\n' +
  'Зарегистрируйся и начни зарабатывать.\n\n' +
  '👉 https://raisegg.com',

  // ─── Deadlock ─────────────────────────────────────────────────────
  '🔒 Играешь в Deadlock? Ставь на свой скилл!\n\n' +
  'Новый шутер от Valve — уже на RaiseGG.\n' +
  '1v1 за USDC. Блокчейн эскроу.\n' +
  'Бесплатные турниры каждый день.\n\n' +
  '👉 https://raisegg.com',

  '🔥 Deadlock — новый Valve-шутер\n\n' +
  'Соревнуйся на RaiseGG!\n' +
  '1v1 за крипту, эскроу на блокчейне.\n' +
  'Кто первым освоит мету — тот и заберёт призы.\n\n' +
  '👉 https://raisegg.com/play',

  '⚡ Первые турниры по Deadlock!\n\n' +
  'RaiseGG запускает ежедневные турниры.\n' +
  '$5 USDC призовой фонд. Вход бесплатный.\n' +
  'Стань топ-1 пока все ещё учатся.\n\n' +
  '👉 https://raisegg.com/tournaments',

  '🔒 Deadlock 1v1 — докажи что ты лучший\n\n' +
  'Valve выпустили новый шутер,\n' +
  'а на RaiseGG уже можно на него ставить.\n' +
  'Крипто эскроу. Античит.\n\n' +
  '👉 https://raisegg.com/play',

  // ─── Engagement / Cross-game ──────────────────────────────────────
  '🤔 CS2, Dota 2 или Deadlock?\n\n' +
  'На RaiseGG можно ставить на скилл во всех трёх.\n' +
  '1v1, 2v2, 5v5 за USDC/USDT.\n' +
  'Напиши в коментах свою игру!\n\n' +
  '👉 https://raisegg.com',

  '👊 Тэгни своего дуо-партнёра!\n\n' +
  'На RaiseGG — 2v2 за реальные деньги.\n' +
  'CS2, Dota 2, Deadlock.\n' +
  'Блокчейн эскроу. Бесплатные турниры.\n\n' +
  '👉 https://raisegg.com/play',

  '📊 Какой у тебя ранг?\n\n' +
  'CS2: Фасеит lvl? Глобал?\n' +
  'Dota 2: ММР?\n' +
  'Deadlock: ???\n\n' +
  'Пиши в коментах и заходи доказывать на RaiseGG!\n' +
  '👉 https://raisegg.com',

  '🎮 5 причин попробовать RaiseGG:\n\n' +
  '1. Бесплатные турниры каждый день\n' +
  '2. Блокчейн эскроу — без кидков\n' +
  '3. Встроенный античит\n' +
  '4. CS2, Dota 2, Deadlock\n' +
  '5. Город vs город — представь свой регион\n\n' +
  '👉 https://raisegg.com',

  '🏙️ Какой город самый скилловый?\n\n' +
  'Москва? Питер? Алматы? Киев?\n' +
  'На RaiseGG — город против города.\n' +
  'Бесплатные турниры с призами USDC.\n\n' +
  'Пиши свой город в коментах!\n' +
  '👉 https://raisegg.com/tournaments',

  '💬 Устал от читеров?\n\n' +
  'RaiseGG — платформа с античитом.\n' +
  'Играй 1v1 или в турнирах за реальные деньги.\n' +
  'CS2 / Dota 2 / Deadlock.\n' +
  'Эскроу на блокчейне.\n\n' +
  '👉 https://raisegg.com',

  '🔥 Челлендж: 7 побед подряд на RaiseGG\n\n' +
  'Кто сможет — тот настоящий зверь.\n' +
  '1v1 в CS2, Dota 2 или Deadlock.\n' +
  'Ставки в USDC с блокчейн эскроу.\n\n' +
  'Принимаешь вызов?\n' +
  '👉 https://raisegg.com/play',

  '⚡ Новая платформа — новые возможности\n\n' +
  'RaiseGG — ставь крипту на свой аим/ММР.\n' +
  'Турция, Кавказ, Балканы, СНГ.\n' +
  'CS2, Dota 2, Deadlock.\n' +
  'Заходи пока здесь мало народу — легче выигрывать!\n\n' +
  '👉 https://raisegg.com',
]

/** Pick message based on day and 12h slot */
function pickMessage(): string {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / 86400000
  )
  const slot = now.getUTCHours() < 12 ? 0 : 1
  const idx = (dayOfYear * 2 + slot) % VK_MESSAGES.length
  return VK_MESSAGES[idx]
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isConfigured()) {
    await recordCronRun('marketing-vk', 'error', { message: 'VK not configured' })
    return NextResponse.json({ error: 'VK not configured' }, { status: 400 })
  }

  const start = Date.now()

  try {
    const message = pickMessage()
    const { results } = await postToMultipleGroups(message)

    const succeeded = results.filter(r => r.ok).length
    const failed = results.filter(r => !r.ok).length

    const summary = `Posted to ${succeeded}/${results.length} VK groups` +
      (failed > 0 ? ` (${failed} failed: ${results.filter(r => !r.ok).map(r => r.error).join('; ')})` : '')

    await recordCronRun('marketing-vk', failed === results.length ? 'error' : 'ok', {
      message: summary,
      durationMs: Date.now() - start,
    })

    return NextResponse.json({ ok: true, results, summary })
  } catch (err) {
    await recordCronRun('marketing-vk', 'error', {
      message: String(err),
      durationMs: Date.now() - start,
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
