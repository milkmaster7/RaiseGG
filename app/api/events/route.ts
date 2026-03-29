import { NextResponse } from 'next/server'
import { getActiveEventsWithEndTime, getUpcomingEvents } from '@/lib/events'

export async function GET() {
  const now = new Date()

  const active = getActiveEventsWithEndTime(now).map(e => ({
    id: e.id,
    name: e.name,
    type: e.type,
    description: e.description,
    color: e.color,
    bgColor: e.bgColor,
    borderColor: e.borderColor,
    endsAt: e.endsAt.toISOString(),
  }))

  const upcoming = getUpcomingEvents(now, 7).map(e => ({
    id: e.id,
    name: e.name,
    type: e.type,
    description: e.description,
    color: e.color,
    bgColor: e.bgColor,
    borderColor: e.borderColor,
    startsAt: e.startsAt.toISOString(),
  }))

  return NextResponse.json({ active, upcoming }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}
