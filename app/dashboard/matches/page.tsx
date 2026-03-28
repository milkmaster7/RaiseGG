import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { breadcrumbSchema } from '@/lib/schemas'
import { createServiceClient } from '@/lib/supabase'
import { readSessionFromCookies } from '@/lib/session'
import { SubmitResultButton } from '@/components/matches/SubmitResultButton'
import { RaiseDisputeButton } from '@/components/matches/RaiseDisputeButton'
import { CS2ConnectInfo } from '@/components/matches/CS2ConnectInfo'
import { CancelMatchButton } from '@/components/matches/CancelMatchButton'

export const metadata: Metadata = {
  title: 'My Matches — Match History',
  description: 'Your RaiseGG.gg match history. View results, stakes and earnings.',
  alternates: { canonical: 'https://raisegg.gg/dashboard/matches' },
  robots: { index: false, follow: false },
}

const GAME_LABEL: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
const STATUS_STYLE: Record<string, string> = {
  completed: 'text-green-400',
  cancelled:  'text-gray-500',
  disputed:   'text-yellow-400',
  open:       'text-blue-400',
  locked:     'text-purple-400',
  live:       'text-accent-purple',
}

export default async function MyMatchesPage() {
  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)
  if (!playerId) redirect('/api/auth/steam')

  const db = createServiceClient()
  const { data: matches } = await db
    .from('matches')
    .select(`
      id, game, format, stake_amount, currency, status, winner_id, created_at, resolved_at,
      player_a_id, player_b_id, server_ip, server_port, connect_token,
      player_a:players!player_a_id(username),
      player_b:players!player_b_id(username)
    `)
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .order('created_at', { ascending: false })
    .limit(50)

  const crumbs = breadcrumbSchema([
    { name: 'Home',       url: 'https://raisegg.gg' },
    { name: 'Dashboard',  url: 'https://raisegg.gg/dashboard' },
    { name: 'My Matches', url: 'https://raisegg.gg/dashboard/matches' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">My Matches</h1>
        <p className="text-muted mb-8">Last 50 matches</p>

        {!matches || matches.length === 0 ? (
          <div className="card text-center py-16 text-muted">No matches yet. <a href="/play" className="text-accent-purple hover:underline">Find a match</a>.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                  <th className="pb-3 text-left">Game</th>
                  <th className="pb-3 text-left">Opponent</th>
                  <th className="pb-3 text-right">Stake</th>
                  <th className="pb-3 text-center">Result</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matches.map((m: any) => {
                  const opponent   = m.player_a_id === playerId ? m.player_b?.username : m.player_a?.username
                  const won        = m.status === 'completed' && m.winner_id === playerId
                  const lost       = m.status === 'completed' && m.winner_id && m.winner_id !== playerId
                  const result     = m.status !== 'completed' ? '—' : won ? 'WIN' : 'LOSS'
                  const resultStyle = won ? 'text-green-400 font-bold' : lost ? 'text-red-400 font-bold' : 'text-muted'
                  const date = new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

                  return (
                    <tr key={m.id} className="hover:bg-space-800/50 transition-colors">
                      <td className="py-3 text-white font-medium">{GAME_LABEL[m.game] ?? m.game}</td>
                      <td className="py-3 text-muted">{opponent ?? '—'}</td>
                      <td className="py-3 text-right text-white">${Number(m.stake_amount).toFixed(2)} <span className="text-xs text-muted uppercase">{m.currency ?? 'usdc'}</span></td>
                      <td className={`py-3 text-center ${resultStyle}`}>{result}</td>
                      <td className={`py-3 text-center capitalize ${STATUS_STYLE[m.status] ?? 'text-muted'}`}>{m.status}</td>
                      <td className="py-3 text-right text-muted">{date}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-3 flex-wrap">
                          {m.game === 'cs2' && ['locked', 'live'].includes(m.status) && m.server_ip && (
                            <CS2ConnectInfo
                              serverIp={m.server_ip}
                              serverPort={m.server_port}
                              connectToken={m.connect_token}
                            />
                          )}
                          {m.status === 'open' && m.player_a_id === playerId && (
                            <CancelMatchButton matchId={m.id} />
                          )}
                          {m.status === 'locked' && (
                            <SubmitResultButton matchId={m.id} game={m.game} playerId={playerId} />
                          )}
                          <RaiseDisputeButton matchId={m.id} status={m.status} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
