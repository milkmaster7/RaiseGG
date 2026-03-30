/**
 * lib/discord-bot.ts — Discord bot using REST API only (no discord.js gateway)
 *
 * Uses Discord's HTTP REST API directly to avoid native module issues with Next.js.
 * Bot must be added to servers with appropriate permissions.
 */

const DISCORD_API = 'https://discord.com/api/v10'
const LFG_KEYWORDS = ['lfg', 'looking-for', 'find-team', 'matchmaking', 'find-match', 'looking-for-game', 'team-finder']

function headers(): Record<string, string> {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export function isConfigured(): boolean {
  return !!process.env.DISCORD_BOT_TOKEN
}

async function discordFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${DISCORD_API}${path}`, { ...opts, headers: headers() })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Discord API ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Bot functions ─────────────────────────────────────────────────────────

export interface ServerInfo {
  id: string
  name: string
  memberCount: number
  icon: string | null
}

/** List all servers the bot is in */
export async function searchServers(): Promise<ServerInfo[]> {
  const guilds = await discordFetch('/users/@me/guilds')
  return guilds.map((g: any) => ({
    id: g.id,
    name: g.name,
    memberCount: g.approximate_member_count || 0,
    icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
  }))
}

/** Send a text message to a specific channel */
export async function sendToChannel(
  channelId: string,
  text: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const msg = await discordFetch(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: text }),
    })
    return { ok: true, messageId: msg.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/** Read recent messages from a channel */
export async function getChannelMessages(
  channelId: string,
  limit = 20
): Promise<{ ok: boolean; messages?: Array<{ id: string; author: string; content: string; timestamp: string }>; error?: string }> {
  try {
    const msgs = await discordFetch(`/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`)
    return {
      ok: true,
      messages: msgs.map((m: any) => ({
        id: m.id,
        author: m.author.username,
        content: (m.content || '').slice(0, 500),
        timestamp: m.timestamp,
      })),
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export interface LFGChannel {
  channelId: string
  channelName: string
  guildId: string
  guildName: string
}

/** Find LFG/team-finding channels in a specific guild */
export async function findLFGChannels(guildId: string): Promise<LFGChannel[]> {
  const channels = await discordFetch(`/guilds/${guildId}/channels`)
  const guild = await discordFetch(`/guilds/${guildId}`)
  const lfgChannels: LFGChannel[] = []

  for (const ch of channels) {
    if (ch.type !== 0) continue // 0 = GUILD_TEXT
    const name = (ch.name || '').toLowerCase()
    if (LFG_KEYWORDS.some(kw => name.includes(kw))) {
      lfgChannels.push({
        channelId: ch.id,
        channelName: ch.name,
        guildId,
        guildName: guild.name,
      })
    }
  }

  return lfgChannels
}

/** Find all LFG channels across all guilds the bot is in */
export async function findAllLFGChannels(): Promise<LFGChannel[]> {
  const guilds = await discordFetch('/users/@me/guilds')
  const allChannels: LFGChannel[] = []

  for (const g of guilds) {
    try {
      const channels = await findLFGChannels(g.id)
      allChannels.push(...channels)
    } catch {
      // Skip guilds where we can't fetch channels
    }
  }

  return allChannels
}

/** Post a message to all LFG channels across all servers */
export async function postToAllLFG(
  text: string
): Promise<Array<{ channel: string; guild: string; ok: boolean; error?: string }>> {
  const lfgChannels = await findAllLFGChannels()
  const results: Array<{ channel: string; guild: string; ok: boolean; error?: string }> = []

  for (const ch of lfgChannels) {
    if (results.length > 0) {
      await new Promise(r => setTimeout(r, 2000))
    }
    const result = await sendToChannel(ch.channelId, text)
    results.push({
      channel: ch.channelName,
      guild: ch.guildName,
      ok: result.ok,
      error: result.error,
    })
  }

  return results
}

// ─── Discord Embed helpers ────────────────────────────────────────────────

const BRAND_COLOR = 0x00e6ff // Cyan

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: Array<{ name: string; value: string; inline?: boolean }>
  footer?: { text: string }
  thumbnail?: { url: string }
  timestamp?: string
  url?: string
}

/** Send an embed message to a channel */
export async function sendEmbed(
  channelId: string,
  embed: DiscordEmbed
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const msg = await discordFetch(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ embeds: [{ color: BRAND_COLOR, ...embed }] }),
    })
    return { ok: true, messageId: msg.id }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/** Send an embed to the webhook channel */
export async function sendWebhookEmbed(
  embed: DiscordEmbed
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return { ok: false, error: 'DISCORD_WEBHOOK_URL not set' }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'RaiseGG',
        embeds: [{ color: BRAND_COLOR, ...embed }],
      }),
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, error: res.ok ? undefined : `Webhook ${res.status}` }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/** Post match result as a rich embed */
export async function postMatchResult(matchData: {
  id: string
  player1: string
  player2: string
  winner: string
  map: string
  score: string
  stake: string
  currency: string
  game?: string
}): Promise<{ ok: boolean; error?: string }> {
  const gameEmoji = matchData.game === 'dota2' ? '🛡️' : matchData.game === 'deadlock' ? '🔒' : '🔫'
  return sendWebhookEmbed({
    title: `${gameEmoji} Match Complete — ${matchData.player1} vs ${matchData.player2}`,
    description: `**Winner:** ${matchData.winner}`,
    fields: [
      { name: 'Map', value: matchData.map, inline: true },
      { name: 'Score', value: matchData.score, inline: true },
      { name: 'Stake', value: `${matchData.stake} ${matchData.currency}`, inline: true },
    ],
    footer: { text: 'RaiseGG — Stake on your skill' },
    url: `https://raisegg.com/matches/${matchData.id}`,
    timestamp: new Date().toISOString(),
  })
}

/** Post weekly leaderboard update as embed */
export async function postLeaderboardUpdate(
  game: string,
  topPlayers: Array<{ name: string; wins: number; earnings: string }>
): Promise<{ ok: boolean; error?: string }> {
  const gameLabel = game === 'dota2' ? 'Dota 2' : game === 'deadlock' ? 'Deadlock' : 'CS2'
  const lines = topPlayers.slice(0, 10).map((p, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
    return `${medal} **${p.name}** — ${p.wins}W | ${p.earnings}`
  })
  return sendWebhookEmbed({
    title: `🏆 Weekly ${gameLabel} Leaderboard`,
    description: lines.join('\n'),
    footer: { text: 'Updated weekly — raisegg.com/leaderboard' },
    url: 'https://raisegg.com/leaderboard',
    timestamp: new Date().toISOString(),
  })
}

/** Post new bounty alert */
export async function postBountyAlert(bounty: {
  title: string
  reward: string
  currency: string
  game: string
  description: string
}): Promise<{ ok: boolean; error?: string }> {
  const gameLabel = bounty.game === 'dota2' ? 'Dota 2' : bounty.game === 'deadlock' ? 'Deadlock' : 'CS2'
  return sendWebhookEmbed({
    title: `💎 New Bounty: ${bounty.title}`,
    description: bounty.description,
    fields: [
      { name: 'Game', value: gameLabel, inline: true },
      { name: 'Reward', value: `${bounty.reward} ${bounty.currency}`, inline: true },
    ],
    footer: { text: 'Claim it at raisegg.com/bounties' },
    url: 'https://raisegg.com/bounties',
    timestamp: new Date().toISOString(),
  })
}

/** Post tournament starting alert */
export async function postTournamentAlert(tournament: {
  name: string
  game: string
  map?: string
  entryFee: string
  currency: string
  maxPlayers: number
  startTime: string
}): Promise<{ ok: boolean; error?: string }> {
  const gameLabel = tournament.game === 'dota2' ? 'Dota 2' : tournament.game === 'deadlock' ? 'Deadlock' : 'CS2'
  const fields = [
    { name: 'Game', value: gameLabel, inline: true },
    { name: 'Entry', value: tournament.entryFee === '0' ? 'FREE' : `${tournament.entryFee} ${tournament.currency}`, inline: true },
    { name: 'Slots', value: `${tournament.maxPlayers}`, inline: true },
    { name: 'Starts', value: tournament.startTime, inline: true },
  ]
  if (tournament.map) fields.push({ name: 'Map', value: tournament.map, inline: true })

  return sendWebhookEmbed({
    title: `⚔️ Tournament: ${tournament.name}`,
    description: 'Sign up now before slots fill up!',
    fields,
    footer: { text: 'raisegg.com/tournaments' },
    url: 'https://raisegg.com/tournaments',
    timestamp: new Date().toISOString(),
  })
}

/** Post daily highlights summary (for cron) */
export async function postDailyHighlights(data: {
  topMatches: Array<{ player1: string; player2: string; winner: string; game: string }>
  activeBounties: number
  activeTournaments: number
  leaderboardChanges: Array<{ name: string; change: string }>
}): Promise<{ ok: boolean; error?: string }> {
  const matchLines = data.topMatches.slice(0, 5).map(m => {
    const emoji = m.game === 'dota2' ? '🛡️' : m.game === 'deadlock' ? '🔒' : '🔫'
    return `${emoji} **${m.winner}** beat ${m.player1 === m.winner ? m.player2 : m.player1}`
  })

  const leaderLines = data.leaderboardChanges.slice(0, 5).map(l =>
    `📈 **${l.name}** ${l.change}`
  )

  const sections: string[] = []
  if (matchLines.length) sections.push('**Recent Matches**\n' + matchLines.join('\n'))
  if (leaderLines.length) sections.push('**Leaderboard Movers**\n' + leaderLines.join('\n'))
  sections.push(`🎯 **${data.activeBounties}** active bounties | ⚔️ **${data.activeTournaments}** upcoming tournaments`)

  return sendWebhookEmbed({
    title: '📊 RaiseGG Daily Highlights',
    description: sections.join('\n\n'),
    footer: { text: 'raisegg.com — Stake on your skill' },
    url: 'https://raisegg.com',
    timestamp: new Date().toISOString(),
  })
}
