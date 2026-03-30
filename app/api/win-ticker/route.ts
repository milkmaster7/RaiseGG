import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 60

interface WinRow {
  id: string
  stake: number
  game: string
  winner_id: string
  username: string
  country: string
}

async function generateMessage(username: string, country: string, payout: number, game: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return `${username} won $${payout.toFixed(0)} on ${game}`

  const prompt = `Generate a short exciting 1-line message (max 60 chars, no emoji overuse, gaming tone) about a player named ${username} from ${country} winning $${payout.toFixed(0)} on ${game}. Examples: 'kerim_tr just cleaned up a $45 CS2 match', 'tbilisi_pro took home $120 in Dota 2'`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 80, temperature: 0.9 },
        }),
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) return `${username} won $${payout.toFixed(0)} on ${game}`

    const data = await res.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    // Trim quotes and whitespace, enforce 60 char cap
    const clean = text.replace(/^["']|["']$/g, '').trim().slice(0, 60)
    return clean || `${username} won $${payout.toFixed(0)} on ${game}`
  } catch (_) {
    return `${username} won $${payout.toFixed(0)} on ${game}`
  }
}

export async function GET() {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        stake,
        game,
        winner_id,
        players!matches_winner_id_fkey (
          username,
          country
        )
      `)
      .eq('status', 'resolved')
      .not('winner_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error || !data || data.length === 0) {
      return NextResponse.json([])
    }

    // Normalize the join result and generate messages concurrently
    const rows: WinRow[] = (data as any[])
      .filter((r) => r.players)
      .map((r) => ({
        id: r.id,
        stake: Number(r.stake) || 0,
        game: r.game ?? 'CS2',
        winner_id: r.winner_id,
        username: Array.isArray(r.players) ? r.players[0]?.username : r.players?.username,
        country: Array.isArray(r.players) ? r.players[0]?.country : r.players?.country,
      }))
      .filter((r) => r.username)

    const results = await Promise.all(
      rows.map(async (row) => {
        const payout = Math.round(row.stake * 2 * 0.9)
        const message = await generateMessage(row.username, row.country ?? 'Unknown', payout, row.game)
        return {
          id: row.id,
          message,
          game: row.game,
          amount: payout,
          username: row.username,
        }
      })
    )

    return NextResponse.json(results)
  } catch (err) {
    console.error('[win-ticker] error:', err)
    return NextResponse.json([])
  }
}
