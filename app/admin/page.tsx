import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { readSessionFromCookies } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'
import Link from 'next/link'
import { DollarSign, Activity, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { DisputeCard } from '@/components/admin/DisputeCard'

export const metadata: Metadata = {
  title: 'Admin — RaiseGG',
  robots: { index: false, follow: false },
}

async function getAdminData() {
  const supabase = createServiceClient()

  const [
    { count: totalPlayers },
    { count: activeMatches },
    { count: openDisputes },
    { data: rakeAgg },
    { data: recentMatches },
    { data: disputes },
    { data: recentPlayers },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }).in('status', ['open', 'locked', 'live']),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.rpc('sum_rake'),
    supabase.from('matches')
      .select('id, game, format, stake_amount, status, created_at, player_a:players!player_a_id(username), player_b:players!player_b_id(username)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('disputes')
      .select('id, reason, status, created_at, raised_by:players!raised_by_id(username), match:matches(id, game, stake_amount, player_a_id, player_b_id, player_a:players!player_a_id(username), player_b:players!player_b_id(username))')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('players')
      .select('id, username, cs2_elo, eligible, banned, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const totalRake = Number(rakeAgg ?? 0)
  return { totalPlayers, activeMatches, openDisputes, totalRake, recentMatches, disputes, recentPlayers }
}

const STATUS_COLORS: Record<string, string> = {
  open:      'text-accent-cyan',
  locked:    'text-accent-cyan',
  live:      'text-green-400',
  completed: 'text-muted',
  cancelled: 'text-red-400',
  disputed:  'text-yellow-400',
}

export default async function AdminPage() {
  const cookieStore = await cookies()
  const playerId = await readSessionFromCookies(cookieStore)
  const supabase = createServiceClient()
  if (!playerId || !(await isAdmin(playerId, supabase))) redirect('/')

  const { totalPlayers, activeMatches, openDisputes, totalRake, recentMatches, disputes, recentPlayers } = await getAdminData()

  const STATS = [
    { label: 'Total Rake',     value: `$${totalRake.toFixed(2)}`,  icon: DollarSign,    color: 'text-green-400' },
    { label: 'Active Matches', value: String(activeMatches ?? 0),   icon: Activity,      color: 'text-accent-cyan' },
    { label: 'Total Players',  value: String(totalPlayers ?? 0),    icon: Users,         color: 'text-accent-cyan' },
    { label: 'Open Disputes',  value: String(openDisputes ?? 0),    icon: AlertTriangle, color: 'text-yellow-400' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-orbitron text-3xl font-black text-gradient">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/players" className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Manage Players
          </Link>
          <span className="badge-purple text-xs">INTERNAL</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {STATS.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <s.icon className={`w-8 h-8 ${s.color} flex-shrink-0`} />
            <div>
              <div className={`font-orbitron text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted uppercase tracking-wider">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* Open Disputes */}
        <section>
          <h2 className="font-orbitron text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" /> Open Disputes
          </h2>
          {!disputes?.length ? (
            <div className="card text-center py-8 text-muted text-sm">No open disputes.</div>
          ) : (
            <div className="space-y-2">
              {disputes.map((d: any) => (
                <DisputeCard
                  key={d.id}
                  dispute={{
                    id:         d.id,
                    reason:     d.reason,
                    created_at: d.created_at,
                    raised_by:  d.raised_by,
                    match: d.match ? {
                      id:                 d.match.id,
                      game:               d.match.game,
                      stake_amount:       d.match.stake_amount,
                      player_a_id:        d.match.player_a_id,
                      player_b_id:        d.match.player_b_id,
                      player_a_username:  d.match.player_a?.username ?? '?',
                      player_b_username:  d.match.player_b?.username ?? '?',
                    } : null,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent Matches */}
        <section>
          <h2 className="font-orbitron text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-cyan" /> Recent Matches
          </h2>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs text-muted uppercase">Game</th>
                  <th className="text-left px-4 py-3 text-xs text-muted uppercase">Players</th>
                  <th className="text-right px-4 py-3 text-xs text-muted uppercase">Stake</th>
                  <th className="text-right px-4 py-3 text-xs text-muted uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {(recentMatches ?? []).map((m: any) => (
                  <tr key={m.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 font-semibold text-white uppercase text-xs">{m.game}</td>
                    <td className="px-4 py-2 text-muted text-xs">
                      {m.player_a?.username ?? '?'} vs {m.player_b?.username ?? 'waiting'}
                    </td>
                    <td className="px-4 py-2 text-right text-accent-cyan font-orbitron text-xs">${m.stake_amount}</td>
                    <td className={`px-4 py-2 text-right text-xs font-semibold ${STATUS_COLORS[m.status] ?? 'text-muted'}`}>
                      {m.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Players */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-orbitron text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-cyan" /> Recent Players
            </h2>
          </div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs text-muted uppercase">Player</th>
                  <th className="text-right px-4 py-3 text-xs text-muted uppercase">CS2 ELO</th>
                  <th className="text-right px-4 py-3 text-xs text-muted uppercase">Eligible</th>
                  <th className="text-right px-4 py-3 text-xs text-muted uppercase">Banned</th>
                  <th className="text-right px-4 py-3 text-xs text-muted uppercase">Joined</th>
                </tr>
              </thead>
              <tbody>
                {(recentPlayers ?? []).map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/profile/${p.username}`} className="text-white hover:text-accent-cyan font-semibold text-xs">
                        {p.username}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right font-orbitron text-xs text-accent-cyan">{p.cs2_elo}</td>
                    <td className="px-4 py-2 text-right">
                      {p.eligible
                        ? <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                        : <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {p.banned
                        ? <span className="text-xs text-red-400 font-semibold">BANNED</span>
                        : <span className="text-xs text-muted">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-muted">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
