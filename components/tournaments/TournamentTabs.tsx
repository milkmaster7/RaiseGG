'use client'

import { useState } from 'react'
import { TournamentCard, type TournamentCardData } from './TournamentCard'
import { TournamentCalendar, type CalendarTournament } from './TournamentCalendar'
import { Calendar } from 'lucide-react'

interface Props {
  upcoming: TournamentCardData[]
  live: TournamentCardData[]
  completed: TournamentCardData[]
}

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
  { key: 'calendar', label: 'Calendar' },
] as const

type TabKey = typeof TABS[number]['key']

export function TournamentTabs({ upcoming, live, completed }: Props) {
  const [tab, setTab] = useState<TabKey>('upcoming')

  const lists: Record<Exclude<TabKey, 'calendar'>, TournamentCardData[]> = { upcoming, live, completed }
  const allTournaments: CalendarTournament[] = [...upcoming, ...live, ...completed].map(t => ({
    id: t.id,
    name: t.name,
    game: t.game,
    prizePool: t.prizePool,
    maxPlayers: t.maxPlayers,
    registeredCount: t.registeredCount,
    startsAt: t.startsAt,
    status: t.status,
  }))

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-space-800 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-accent-cyan text-space-900'
                : 'text-muted hover:text-white'
            }`}
          >
            {t.key === 'calendar' && <Calendar className="w-3.5 h-3.5" />}
            {t.label}
            {t.key !== 'calendar' && lists[t.key as Exclude<TabKey, 'calendar'>].length > 0 && (
              <span className={`ml-1 text-xs ${tab === t.key ? 'text-space-700' : 'text-muted'}`}>
                ({lists[t.key as Exclude<TabKey, 'calendar'>].length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Calendar view */}
      {tab === 'calendar' ? (
        <TournamentCalendar tournaments={allTournaments} />
      ) : (
        <>
          {/* Cards grid */}
          {lists[tab].length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists[tab].map(t => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-muted">No {tab} tournaments right now.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
