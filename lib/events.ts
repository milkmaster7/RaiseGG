// Weekend Events System for RaiseGG

export type EventType = 'double_elo' | 'reduced_rake' | 'bonus_xp' | 'happy_hour'

export interface GameEvent {
  id: string
  name: string
  type: EventType
  description: string
  color: string        // tailwind-safe color class
  bgColor: string
  borderColor: string
  // Schedule — all times UTC
  schedule: EventSchedule
}

interface EventSchedule {
  // Recurring weekly: which days (0=Sun, 1=Mon, ... 6=Sat)
  days: number[]
  startHour: number  // UTC hour
  endHour: number    // UTC hour (can be > 24 for overnight)
  // If endHour <= startHour, the event wraps past midnight
}

const EVENTS: GameEvent[] = [
  {
    id: 'friday-night-duels',
    name: 'Friday Night Duels',
    type: 'reduced_rake',
    description: '50% rake reduction — only 5% rake on all matches!',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    schedule: { days: [5], startHour: 18, endHour: 24 }, // Friday 6PM-midnight UTC
  },
  {
    id: 'double-elo-weekend',
    name: 'Double ELO Weekend',
    type: 'double_elo',
    description: '2x ELO gains on every match — climb faster!',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    schedule: { days: [6, 0], startHour: 0, endHour: 24 }, // Sat-Sun all day
  },
  {
    id: 'happy-hour',
    name: 'Happy Hour',
    type: 'happy_hour',
    description: '+50% Battle Pass XP for one hour!',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    schedule: { days: [0, 1, 2, 3, 4, 5, 6], startHour: 20, endHour: 21 }, // Daily 8-9PM UTC
  },
]

function isEventActive(event: GameEvent, now: Date = new Date()): boolean {
  const dayOfWeek = now.getUTCDay()
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()
  const currentTime = hour + minute / 60

  if (!event.schedule.days.includes(dayOfWeek)) return false

  const { startHour, endHour } = event.schedule
  if (endHour > startHour) {
    return currentTime >= startHour && currentTime < endHour
  }
  // Wraps past midnight
  return currentTime >= startHour || currentTime < endHour
}

function getNextOccurrence(event: GameEvent, now: Date = new Date()): Date {
  const currentDay = now.getUTCDay()
  const currentHour = now.getUTCHours()

  // Check each of the next 8 days (covers full week + today)
  for (let offset = 0; offset <= 7; offset++) {
    const checkDay = (currentDay + offset) % 7
    if (!event.schedule.days.includes(checkDay)) continue

    const target = new Date(now)
    target.setUTCDate(target.getUTCDate() + offset)
    target.setUTCHours(event.schedule.startHour, 0, 0, 0)

    // If it's today and the event already started or passed, skip
    if (offset === 0 && currentHour >= event.schedule.startHour) {
      // If event is currently active, return its end time instead
      if (isEventActive(event, now)) {
        const end = new Date(now)
        end.setUTCHours(event.schedule.endHour, 0, 0, 0)
        if (event.schedule.endHour <= event.schedule.startHour) {
          end.setUTCDate(end.getUTCDate() + 1)
        }
        return end
      }
      continue
    }

    return target
  }

  // Fallback — should never reach here
  const fallback = new Date(now)
  fallback.setUTCDate(fallback.getUTCDate() + 7)
  return fallback
}

function getEventEndTime(event: GameEvent, now: Date = new Date()): Date {
  const end = new Date(now)
  end.setUTCHours(event.schedule.endHour, 0, 0, 0)
  if (event.schedule.endHour <= event.schedule.startHour) {
    end.setUTCDate(end.getUTCDate() + 1)
  }
  return end
}

export function getActiveEvents(now: Date = new Date()): GameEvent[] {
  return EVENTS.filter(e => isEventActive(e, now))
}

export function getUpcomingEvents(now: Date = new Date(), days: number = 7): Array<GameEvent & { startsAt: Date }> {
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  const upcoming: Array<GameEvent & { startsAt: Date }> = []

  for (const event of EVENTS) {
    if (isEventActive(event, now)) continue // skip active events
    const next = getNextOccurrence(event, now)
    if (next <= cutoff) {
      upcoming.push({ ...event, startsAt: next })
    }
  }

  return upcoming.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}

export function getActiveEventsWithEndTime(now: Date = new Date()): Array<GameEvent & { endsAt: Date }> {
  return getActiveEvents(now).map(event => ({
    ...event,
    endsAt: getEventEndTime(event, now),
  }))
}

/** Returns current rake percentage (default 10%, 5% during reduced_rake events) */
export function getRakeMultiplier(now: Date = new Date()): number {
  const active = getActiveEvents(now)
  if (active.some(e => e.type === 'reduced_rake')) return 0.05
  return 0.10
}

/** Returns ELO multiplier (1 normally, 2 during double_elo events) */
export function getEloMultiplier(now: Date = new Date()): number {
  const active = getActiveEvents(now)
  if (active.some(e => e.type === 'double_elo')) return 2
  return 1
}

/** Returns XP multiplier (1 normally, 1.5 during happy_hour events) */
export function getXpMultiplier(now: Date = new Date()): number {
  const active = getActiveEvents(now)
  if (active.some(e => e.type === 'happy_hour')) return 1.5
  return 1
}

export { EVENTS }
