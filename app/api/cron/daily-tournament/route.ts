import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { recordCronRun } from '@/lib/monitor'
import { postTournament } from '@/lib/telegram'
import { tweetTournament } from '@/lib/twitter'

const GAMES = ['cs2', 'dota2', 'deadlock'] as const

const REGIONAL_NAMES: Record<string, string[]> = {
  cs2: [
    'Istanbul Friday Night CS2',
    'Tbilisi CS2 Showdown',
    'Baku CS2 Arena',
    'Bucharest CS2 Clash',
    'Sofia CS2 Challenge',
    'Belgrade CS2 Cup',
    'Athens CS2 Duel',
    'Ankara CS2 Rumble',
    'Yerevan CS2 Open',
    'Almaty CS2 Battle',
    'Kyiv CS2 Blitz',
    'Warsaw CS2 Invitational',
    'Tehran CS2 Gauntlet',
    'Budapest CS2 Showdown',
  ],
  dota2: [
    'Istanbul Dota 2 Night',
    'Tbilisi Dota 2 Showdown',
    'Baku Dota 2 Arena',
    'Bucharest Dota 2 Clash',
    'Sofia Dota 2 Challenge',
    'Belgrade Dota 2 Cup',
    'Athens Dota 2 Duel',
    'Ankara Dota 2 Rumble',
    'Yerevan Dota 2 Open',
    'Almaty Dota 2 Battle',
    'Kyiv Dota 2 Blitz',
    'Warsaw Dota 2 Invitational',
    'Tehran Dota 2 Gauntlet',
    'Budapest Dota 2 Showdown',
  ],
  deadlock: [
    'Istanbul Deadlock Night',
    'Tbilisi Deadlock Showdown',
    'Baku Deadlock Arena',
    'Bucharest Deadlock Clash',
    'Sofia Deadlock Challenge',
    'Belgrade Deadlock Cup',
    'Athens Deadlock Duel',
    'Ankara Deadlock Rumble',
    'Yerevan Deadlock Open',
    'Almaty Deadlock Battle',
    'Kyiv Deadlock Blitz',
    'Warsaw Deadlock Invitational',
    'Tehran Deadlock Gauntlet',
    'Budapest Deadlock Showdown',
  ],
}

/** Extract city name from a regional tournament name like "Istanbul CS2 Blitz" */
function extractCity(name: string): string {
  return name.split(' ')[0]
}

/** Get day-of-year (0-based) for rotating through regional names */
function dayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const supabase = createServiceClient()

  try {
    const today = new Date()
    const dayOfWeek = today.getUTCDay() // 0=Sun ... 6=Sat

    // Rotate game daily: Mon=CS2, Tue=Dota2, Wed=Deadlock, Thu=CS2, Fri=Dota2, Sat=Deadlock, Sun=CS2
    const gameIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) % 3
    const game = GAMES[gameIndex]

    // Pick regional name based on day-of-year rotation
    const names = REGIONAL_NAMES[game]
    const nameIndex = dayOfYear(today) % names.length
    const tournamentName = names[nameIndex]
    const city = extractCity(tournamentName)

    // Check if today's tournament already exists
    const todayStr = today.toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('tournaments')
      .select('id')
      .gte('starts_at', todayStr + 'T00:00:00Z')
      .lte('starts_at', todayStr + 'T23:59:59Z')
      .eq('game', game)
      .limit(1)

    if (existing && existing.length > 0) {
      await recordCronRun('daily-tournament', 'ok', { message: 'Already created today' })
      return NextResponse.json({ message: 'Already created', id: existing[0].id })
    }

    // Create tournament starting at 8PM UTC today
    const startsAt = new Date(todayStr + 'T20:00:00Z')

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        name: tournamentName,
        game,
        format: 'single_elimination',
        bracket_size: 8,
        entry_fee: 0,
        prize_pool: 5, // $5 USDC from platform as incentive
        max_players: 8,
        starts_at: startsAt.toISOString(),
        status: 'registration',
        description: `Free ${city} tournament. 8 players, single elimination, best-of-1. $5 USDC prize pool courtesy of RaiseGG. Rep your region!`,
      })
      .select()
      .single()

    if (error) {
      await recordCronRun('daily-tournament', 'error', { message: error.message, durationMs: Date.now() - start })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post to Telegram + Twitter (best-effort)
    await postTournament({
      name: tournamentName,
      map: 'TBD',
      entryFee: 'Free',
      currency: 'USDC',
      maxPlayers: 8,
      startTime: '8:00 PM UTC',
    }).catch(() => {})
    await tweetTournament({
      name: tournamentName,
      game,
      prizePool: '$5',
      currency: 'USDC',
      maxPlayers: 8,
    }).catch(() => {})

    await recordCronRun('daily-tournament', 'ok', { message: `Created ${tournamentName} (${tournament.id})`, durationMs: Date.now() - start })
    return NextResponse.json({ success: true, tournament })
  } catch (err) {
    await recordCronRun('daily-tournament', 'error', { message: String(err), durationMs: Date.now() - start })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
