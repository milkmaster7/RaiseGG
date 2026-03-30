/**
 * lib/telegram-commands.ts — Telegram bot command handlers for RaiseGG
 *
 * Each function returns an HTML-formatted string for Telegram's sendMessage API.
 * Uses Supabase service client for read-only public data queries.
 */

import { createServiceClient } from '@/lib/supabase'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── /start ────────────────────────────────────────────────────────────────

export function handleStart(firstName: string): string {
  return [
    `<b>Welcome to RaiseGG, ${escapeHtml(firstName)}!</b>`,
    '',
    'Stake real money on your CS2, Dota 2, and Deadlock skills.',
    '',
    'Get started:',
    '1. Create your account at <a href="https://raisegg.com">raisegg.com</a>',
    '2. Deposit USDC via Solana',
    '3. Challenge players or join open lobbies',
    '',
    'Use /help to see all available commands.',
  ].join('\n')
}

// ─── /balance ──────────────────────────────────────────────────────────────

export function handleBalance(): string {
  return [
    '<b>Check Your Balance</b>',
    '',
    'Connect your account at <a href="https://raisegg.com/dashboard">raisegg.com/dashboard</a> to check your balance.',
    '',
    'Telegram account linking is coming soon!',
  ].join('\n')
}

// ─── /matches ──────────────────────────────────────────────────────────────

export async function handleMatches(): Promise<string> {
  const supabase = createServiceClient()

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, game, stake_amount, currency, status, resolved_at, player_a:players!player_a_id(username), player_b:players!player_b_id(username), winner:players!winner_id(username)')
    .eq('status', 'completed')
    .order('resolved_at', { ascending: false })
    .limit(5)

  if (error || !matches || matches.length === 0) {
    return [
      '<b>Recent Matches</b>',
      '',
      'No completed matches yet. Be the first to play!',
      '',
      '<a href="https://raisegg.com/play">Play now</a>',
    ].join('\n')
  }

  const lines = ['<b>Last 5 Matches</b>', '']

  for (const m of matches) {
    const playerA = (Array.isArray(m.player_a) ? m.player_a[0] : m.player_a as unknown as { username: string } | null)?.username ?? 'Unknown'
    const playerB = (Array.isArray(m.player_b) ? m.player_b[0] : m.player_b as unknown as { username: string } | null)?.username ?? 'Unknown'
    const winner = (Array.isArray(m.winner) ? m.winner[0] : m.winner as unknown as { username: string } | null)?.username ?? 'TBD'
    const game = m.game.toUpperCase()
    const stake = `$${m.stake_amount}`

    lines.push(
      `${escapeHtml(game)} | ${escapeHtml(playerA)} vs ${escapeHtml(playerB)}`,
      `Winner: <b>${escapeHtml(winner)}</b> | Stake: ${escapeHtml(stake)}`,
      ''
    )
  }

  lines.push('<a href="https://raisegg.com/play">View all matches</a>')

  return lines.join('\n')
}

// ─── /leaderboard ──────────────────────────────────────────────────────────

export async function handleLeaderboard(): Promise<string> {
  const supabase = createServiceClient()

  const { data: players, error } = await supabase
    .from('players')
    .select('username, cs2_elo, cs2_wins, cs2_losses, country')
    .eq('eligible', true)
    .eq('banned', false)
    .order('cs2_elo', { ascending: false })
    .limit(5)

  if (error || !players || players.length === 0) {
    return [
      '<b>Leaderboard</b>',
      '',
      'No ranked players yet. Be the first to compete!',
      '',
      '<a href="https://raisegg.com/leaderboard">View leaderboard</a>',
    ].join('\n')
  }

  const lines = ['<b>Top 5 Players (CS2 ELO)</b>', '']

  for (let i = 0; i < players.length; i++) {
    const p = players[i]
    const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `${i + 1}.`
    const total = (p.cs2_wins ?? 0) + (p.cs2_losses ?? 0)
    const wr = total > 0 ? Math.round(((p.cs2_wins ?? 0) / total) * 100) : 0
    const countryFlag = p.country ? ` ${p.country}` : ''

    lines.push(
      `${medal} <b>${escapeHtml(p.username)}</b>${countryFlag} — ${p.cs2_elo} ELO (${wr}% WR)`
    )
  }

  lines.push('', '<a href="https://raisegg.com/leaderboard">Full leaderboard</a>')

  return lines.join('\n')
}

// ─── /tournament ───────────────────────────────────────────────────────────

export async function handleTournament(): Promise<string> {
  const supabase = createServiceClient()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('name, game, entry_fee, max_players, registered_players, starts_at, prize_pool')
    .eq('status', 'upcoming')
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !tournament) {
    return [
      '<b>Tournaments</b>',
      '',
      'No upcoming tournaments right now. Check back soon!',
      '',
      '<a href="https://raisegg.com/tournaments">View tournaments</a>',
    ].join('\n')
  }

  const startDate = new Date(tournament.starts_at)
  const formatted = startDate.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })

  return [
    '<b>Next Tournament</b>',
    '',
    `<b>${escapeHtml(tournament.name)}</b>`,
    `Game: ${escapeHtml(tournament.game.toUpperCase())}`,
    `Entry: $${tournament.entry_fee}`,
    `Prize Pool: $${tournament.prize_pool}`,
    `Players: ${tournament.registered_players}/${tournament.max_players}`,
    `Starts: ${escapeHtml(formatted)}`,
    '',
    '<a href="https://raisegg.com/tournaments">Register now</a>',
  ].join('\n')
}

// ─── /help ─────────────────────────────────────────────────────────────────

export function handleHelp(): string {
  return [
    '<b>RaiseGG Bot Commands</b>',
    '',
    '/start — Welcome message',
    '/balance — Check your balance',
    '/matches — Last 5 match results',
    '/leaderboard — Top 5 players',
    '/tournament — Next upcoming tournament',
    '/help — Show this help message',
    '',
    '<a href="https://raisegg.com">Visit RaiseGG</a>',
  ].join('\n')
}
