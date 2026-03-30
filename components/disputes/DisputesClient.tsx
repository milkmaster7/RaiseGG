'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Shield,
  ExternalLink,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────
interface Match {
  id: string
  game: string
  stake_amount: number
  status: string
}

interface Dispute {
  id: string
  match_id: string
  raised_by_id: string
  reason: string
  evidence: string | null
  status: 'open' | 'resolved' | 'cancelled'
  resolution: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  match: Match | null
}

// ─── Status config ───────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: {
    label: 'Pending',
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    icon: Clock,
  },
  reviewing: {
    label: 'Reviewing',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Eye,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-500/15 text-green-400 border-green-500/30',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Rejected',
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: XCircle,
  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function GameLabel({ game }: { game: string }) {
  const labels: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }
  return <span className="text-xs text-muted">{labels[game] ?? game}</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Dispute Card ────────────────────────────────────────────────
function DisputeCard({ dispute }: { dispute: Dispute }) {
  return (
    <Link
      href={`/disputes/${dispute.id}`}
      className="block rounded bg-space-950 border border-border p-4 hover:border-accent-purple/30 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={dispute.status} />
            {dispute.match && <GameLabel game={dispute.match.game} />}
          </div>
          <p className="text-xs text-muted">
            Match{' '}
            <span className="font-mono text-white">{dispute.match_id.slice(0, 8)}...</span>
            {dispute.match && (
              <> &middot; ${dispute.match.stake_amount} stake</>
            )}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted group-hover:text-accent-cyan transition-colors flex-shrink-0 mt-1" />
      </div>

      <p className="text-sm text-white line-clamp-2 mb-2">{dispute.reason}</p>

      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>Submitted {formatDate(dispute.created_at)}</span>
        {dispute.resolved_at && (
          <span>Resolved {formatDate(dispute.resolved_at)}</span>
        )}
      </div>

      {dispute.resolution && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted">
            <span className="font-medium text-green-400">Resolution:</span>{' '}
            {dispute.resolution}
          </p>
        </div>
      )}
    </Link>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function DisputesClient() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'cancelled'>('all')

  const fetchDisputes = useCallback(async () => {
    try {
      const res = await fetch('/api/disputes')
      if (!res.ok) {
        if (res.status === 401) {
          setError('Sign in to view your disputes.')
          setLoading(false)
          return
        }
        throw new Error('Failed to load')
      }
      const json = await res.json()
      setDisputes(json.disputes ?? [])
    } catch {
      setError('Failed to load disputes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDisputes()
  }, [fetchDisputes])

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded bg-space-950 border border-border animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(['all', 'open', 'resolved', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1.5 rounded text-xs font-medium transition-all
                ${filter === f
                  ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                  : 'text-muted hover:text-white hover:bg-space-800 border border-transparent'
                }
              `}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1 opacity-60">
                  ({disputes.filter(d => d.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <Link
          href="/play"
          className="text-xs font-medium text-accent-cyan hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Shield className="w-3.5 h-3.5" />
          Raise a Dispute from Match History
        </Link>
      </div>

      {/* Disputes list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-green-500/40 mx-auto mb-4" />
          <h3 className="font-orbitron text-sm font-bold text-white mb-1">
            {filter === 'all' ? 'No disputes' : `No ${filter} disputes`}
          </h3>
          <p className="text-sm text-muted">
            {filter === 'all'
              ? 'All your matches have been resolved fairly. Great sportsmanship!'
              : 'No disputes match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <DisputeCard key={d.id} dispute={d} />
          ))}
        </div>
      )}
    </div>
  )
}
