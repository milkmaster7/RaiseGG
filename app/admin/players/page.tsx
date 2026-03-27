'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Ban, CheckCircle, ArrowLeft, Loader2, X } from 'lucide-react'

type Player = {
  id: string
  username: string
  avatar_url: string | null
  email: string | null
  cs2_elo: number
  dota2_elo: number
  usdc_balance: number
  banned: boolean
  ban_reason: string | null
  eligible: boolean
  created_at: string
}

export default function AdminPlayersPage() {
  const router = useRouter()
  const [q, setQ]               = useState('')
  const [players, setPlayers]   = useState<Player[]>([])
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState<{ player: Player; action: 'ban' | 'unban' } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]       = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const fetchPlayers = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/players?q=${encodeURIComponent(query)}`)
      if (res.status === 403) { router.push('/'); return }
      const data = await res.json()
      setPlayers(data.players ?? [])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchPlayers('')
  }, [fetchPlayers])

  useEffect(() => {
    const t = setTimeout(() => fetchPlayers(q), 300)
    return () => clearTimeout(t)
  }, [q, fetchPlayers])

  async function handleBanToggle() {
    if (!modal) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/players', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId:  modal.player.id,
          banned:    modal.action === 'ban',
          banReason: modal.action === 'ban' ? banReason : undefined,
        }),
      })
      if (!res.ok) { showToast('Action failed'); return }
      showToast(modal.action === 'ban' ? `${modal.player.username} banned.` : `${modal.player.username} unbanned.`)
      setModal(null)
      setBanReason('')
      fetchPlayers(q)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-orbitron text-3xl font-black text-gradient">Player Management</h1>
        <span className="badge-purple text-xs">ADMIN</span>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username…"
          className="w-full bg-space-800 border border-border rounded px-4 py-2 pl-9 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-purple"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted animate-spin" />
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider">Player</th>
                <th className="text-right px-4 py-3 text-xs text-muted uppercase tracking-wider">Balance</th>
                <th className="text-right px-4 py-3 text-xs text-muted uppercase tracking-wider">CS2 ELO</th>
                <th className="text-right px-4 py-3 text-xs text-muted uppercase tracking-wider">Dota2 ELO</th>
                <th className="text-center px-4 py-3 text-xs text-muted uppercase tracking-wider">Eligible</th>
                <th className="text-center px-4 py-3 text-xs text-muted uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs text-muted uppercase tracking-wider">Joined</th>
                <th className="text-right px-4 py-3 text-xs text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted text-sm">
                    {q ? 'No players match your search.' : 'No players yet.'}
                  </td>
                </tr>
              )}
              {players.map((p) => (
                <tr key={p.id} className={`border-b border-border/50 last:border-0 ${p.banned ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.avatar_url && (
                        <Image src={p.avatar_url} alt={p.username} width={28} height={28} className="rounded-full flex-shrink-0" />
                      )}
                      <div>
                        <Link href={`/profile/${p.username}`} target="_blank"
                          className="text-white hover:text-accent-purple font-semibold text-xs transition-colors">
                          {p.username}
                        </Link>
                        {p.ban_reason && (
                          <div className="text-xs text-red-400 mt-0.5">{p.ban_reason}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-orbitron text-xs text-accent-purple">
                    ${Number(p.usdc_balance).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-orbitron text-xs text-white">{p.cs2_elo}</td>
                  <td className="px-4 py-3 text-right font-orbitron text-xs text-white">{p.dota2_elo}</td>
                  <td className="px-4 py-3 text-center">
                    {p.eligible
                      ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                      : <X className="w-4 h-4 text-red-400 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.banned
                      ? <span className="text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">BANNED</span>
                      : <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">ACTIVE</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.banned ? (
                      <button
                        onClick={() => setModal({ player: p, action: 'unban' })}
                        className="text-xs text-green-400 hover:text-green-300 font-semibold transition-colors"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => { setModal({ player: p, action: 'ban' }); setBanReason('') }}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted mt-3">Showing {players.length} player{players.length !== 1 ? 's' : ''}</p>

      {/* Ban/Unban Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-orbitron font-bold text-white text-base">
                {modal.action === 'ban' ? 'Ban Player' : 'Unban Player'}
              </h2>
              <button onClick={() => setModal(null)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted mb-4">
              {modal.action === 'ban'
                ? <>You are about to ban <span className="text-white font-semibold">{modal.player.username}</span>. This will prevent them from creating or joining matches.</>
                : <>You are about to unban <span className="text-white font-semibold">{modal.player.username}</span> and restore their access.</>}
            </p>

            {modal.action === 'ban' && (
              <div className="mb-4">
                <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Ban Reason</label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g. Cheating — VAC ban detected"
                  className="w-full bg-space-800 border border-border rounded px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-purple"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModal(null)}
                className="btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleBanToggle}
                disabled={submitting || (modal.action === 'ban' && !banReason.trim())}
                className={`text-sm px-4 py-2 rounded font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  modal.action === 'ban'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {modal.action === 'ban' ? <><Ban className="w-4 h-4" /> Confirm Ban</> : <><CheckCircle className="w-4 h-4" /> Confirm Unban</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-space-800 border border-border rounded px-4 py-3 text-sm text-white shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
