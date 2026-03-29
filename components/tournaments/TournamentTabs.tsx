'use client'

import { useState } from 'react'
import { TournamentCard, type TournamentCardData } from './TournamentCard'

interface Props {
  upcoming: TournamentCardData[]
  live: TournamentCardData[]
  completed: TournamentCardData[]
}

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
] as const

type TabKey = typeof TABS[number]['key']

export function TournamentTabs({ upcoming, live, completed }: Props) {
  const [tab, setTab] = useState<TabKey>('upcoming')

  const lists: Record<TabKey, TournamentCardData[]> = { upcoming, live, completed }
  const current = lists[tab]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-space-800 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-accent-cyan text-space-900'
                : 'text-muted hover:text-white'
            }`}
          >
            {t.label}
            {lists[t.key].length > 0 && (
              <span className={`ml-1.5 text-xs ${tab === t.key ? 'text-space-700' : 'text-muted'}`}>
                ({lists[t.key].length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {current.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {current.map(t => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-muted">No {tab} tournaments right now.</p>
        </div>
      )}
    </div>
  )
}
