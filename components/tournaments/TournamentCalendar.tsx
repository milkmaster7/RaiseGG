'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Trophy, Users, Clock } from 'lucide-react'
import Link from 'next/link'

export interface CalendarTournament {
  id: string
  name: string
  game: string
  prizePool: number
  maxPlayers: number
  registeredCount: number
  startsAt: string
  status: string
}

interface Props {
  tournaments: CalendarTournament[]
}

const GAME_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  cs2:      { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-400',   dot: 'bg-cyan-400' },
  dota2:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-400' },
  deadlock: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', dot: 'bg-purple-400' },
}

const GAME_LABELS: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function TournamentCalendar({ tournaments }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const weekStart = useMemo(() => {
    const mon = getMonday(today)
    mon.setDate(mon.getDate() + weekOffset * 7)
    return mon
  }, [weekOffset])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const tournamentsByDay = useMemo(() => {
    const map: Record<number, CalendarTournament[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []

    for (const t of tournaments) {
      const tDate = new Date(t.startsAt)
      for (let i = 0; i < 7; i++) {
        if (isSameDay(tDate, weekDays[i])) {
          map[i].push(t)
          break
        }
      }
    }

    // Sort each day by time
    for (const key of Object.keys(map)) {
      map[Number(key)].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    }

    return map
  }, [tournaments, weekDays])

  const weekLabel = (() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${weekStart.toLocaleDateString(undefined, opts)} — ${end.toLocaleDateString(undefined, opts)}`
  })()

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-white hover:bg-space-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <div className="text-center">
          <p className="font-orbitron text-sm font-bold text-white">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-accent-cyan hover:underline mt-0.5"
            >
              Back to this week
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-white hover:bg-space-700 transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop: 7-day grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayTournaments = tournamentsByDay[i]

          return (
            <div
              key={i}
              className={`rounded-lg border p-2 min-h-[180px] ${
                isToday
                  ? 'border-accent-cyan/50 bg-accent-cyan/5'
                  : 'border-border bg-space-800'
              }`}
            >
              {/* Day header */}
              <div className={`text-center mb-2 pb-2 border-b ${isToday ? 'border-accent-cyan/30' : 'border-border'}`}>
                <p className={`text-xs font-medium ${isToday ? 'text-accent-cyan' : 'text-muted'}`}>
                  {DAY_NAMES[i]}
                </p>
                <p className={`text-lg font-orbitron font-bold ${isToday ? 'text-accent-cyan' : 'text-white'}`}>
                  {day.getDate()}
                </p>
              </div>

              {/* Tournaments */}
              <div className="space-y-1.5">
                {dayTournaments.map(t => {
                  const gc = GAME_COLORS[t.game] ?? GAME_COLORS.cs2
                  const spotsLeft = t.maxPlayers - t.registeredCount

                  return (
                    <Link
                      key={t.id}
                      href={`/tournaments/${t.id}`}
                      className={`block rounded-md ${gc.bg} border ${gc.border} p-2 hover:brightness-125 transition-all cursor-pointer group`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${gc.dot}`} />
                        <span className={`text-[10px] font-bold ${gc.text}`}>
                          {GAME_LABELS[t.game] ?? t.game}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white leading-tight truncate group-hover:text-accent-cyan transition-colors">
                        {t.name}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-muted">
                        <span>{formatTime(t.startsAt)}</span>
                        <span className="text-accent-gold">${t.prizePool}</span>
                      </div>
                      {spotsLeft > 0 && spotsLeft <= t.maxPlayers && (
                        <p className="text-[10px] text-muted mt-0.5">
                          {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                        </p>
                      )}
                    </Link>
                  )
                })}

                {dayTournaments.length === 0 && (
                  <p className="text-[10px] text-muted/40 text-center py-4">No events</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical list */}
      <div className="md:hidden space-y-3">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayTournaments = tournamentsByDay[i]
          if (dayTournaments.length === 0 && !isToday) return null

          return (
            <div
              key={i}
              className={`rounded-lg border p-3 ${
                isToday
                  ? 'border-accent-cyan/50 bg-accent-cyan/5'
                  : 'border-border bg-space-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-orbitron font-bold ${isToday ? 'text-accent-cyan' : 'text-white'}`}>
                  {DAY_NAMES[i]} {day.getDate()}
                </span>
                {isToday && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30">
                    TODAY
                  </span>
                )}
              </div>

              {dayTournaments.length > 0 ? (
                <div className="space-y-2">
                  {dayTournaments.map(t => {
                    const gc = GAME_COLORS[t.game] ?? GAME_COLORS.cs2
                    const spotsLeft = t.maxPlayers - t.registeredCount

                    return (
                      <Link
                        key={t.id}
                        href={`/tournaments/${t.id}`}
                        className={`flex items-center gap-3 rounded-md ${gc.bg} border ${gc.border} p-3 hover:brightness-125 transition-all`}
                      >
                        <span className={`w-2 h-2 rounded-full ${gc.dot} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                            <span className={gc.text}>{GAME_LABELS[t.game] ?? t.game}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatTime(t.startsAt)}
                            </span>
                            <span className="text-accent-gold flex items-center gap-1">
                              <Trophy className="w-3 h-3" /> ${t.prizePool}
                            </span>
                            {spotsLeft > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> {spotsLeft} left
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted/40">No events</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
