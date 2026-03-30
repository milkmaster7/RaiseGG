'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  MessageSquare,
  FileText,
  ExternalLink,
  Gamepad2,
  DollarSign,
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

// ─── Status helpers ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  open: {
    label: 'Pending Review',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/15 border-yellow-500/30',
    icon: Clock,
  },
  reviewing: {
    label: 'Under Review',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15 border-blue-500/30',
    icon: Eye,
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15 border-green-500/30',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15 border-red-500/30',
    icon: XCircle,
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Timeline event ──────────────────────────────────────────────
function TimelineItem({
  icon: Icon,
  color,
  title,
  date,
  children,
  isLast,
}: {
  icon: React.ElementType
  color: string
  title: string
  date: string
  children?: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className={`pb-6 ${isLast ? '' : ''}`}>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-[11px] text-muted mt-0.5">{formatDate(date)}</p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function DisputeDetailClient({ disputeId }: { disputeId: string }) {
  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDispute = useCallback(async () => {
    try {
      // Fetch all disputes and find the one we need
      const res = await fetch('/api/disputes')
      if (!res.ok) {
        if (res.status === 401) {
          setError('Sign in to view this dispute.')
          return
        }
        throw new Error('Failed to load')
      }
      const json = await res.json()
      const found = (json.disputes ?? []).find((d: Dispute) => d.id === disputeId)
      if (!found) {
        setError('Dispute not found.')
        return
      }
      setDispute(found)
    } catch {
      setError('Failed to load dispute details.')
    } finally {
      setLoading(false)
    }
  }, [disputeId])

  useEffect(() => {
    fetchDispute()
  }, [fetchDispute])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-48 rounded bg-space-950 animate-pulse" />
        <div className="h-64 rounded bg-space-950 border border-border animate-pulse" />
        <div className="h-48 rounded bg-space-950 border border-border animate-pulse" />
      </div>
    )
  }

  if (error || !dispute) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-muted">{error ?? 'Dispute not found.'}</p>
        <Link href="/disputes" className="text-sm text-accent-cyan hover:text-white mt-3 inline-block">
          Back to Disputes
        </Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.open
  const StatusIcon = statusCfg.icon
  const gameLabels: Record<string, string> = { cs2: 'CS2', dota2: 'Dota 2', deadlock: 'Deadlock' }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/disputes"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent-cyan transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Disputes
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-orbitron text-xl font-bold text-white mb-1">
            Dispute #{dispute.id.slice(0, 8)}
          </h1>
          <p className="text-xs text-muted">
            Filed on {formatDate(dispute.created_at)}
          </p>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
          <StatusIcon className="w-4 h-4" />
          {statusCfg.label}
        </div>
      </div>

      {/* Match details */}
      {dispute.match && (
        <div className="rounded bg-space-950 border border-border p-4">
          <h2 className="font-orbitron text-xs font-bold text-muted uppercase tracking-wider mb-3">
            Match Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted" />
              <div>
                <p className="text-[11px] text-muted">Match ID</p>
                <p className="text-sm text-white font-mono">{dispute.match.id.slice(0, 12)}...</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-muted" />
              <div>
                <p className="text-[11px] text-muted">Game</p>
                <p className="text-sm text-white">{gameLabels[dispute.match.game] ?? dispute.match.game}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted" />
              <div>
                <p className="text-[11px] text-muted">Stake</p>
                <p className="text-sm text-white">${dispute.match.stake_amount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted" />
              <div>
                <p className="text-[11px] text-muted">Match Status</p>
                <p className="text-sm text-white capitalize">{dispute.match.status}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reason */}
      <div className="rounded bg-space-950 border border-border p-4">
        <h2 className="font-orbitron text-xs font-bold text-muted uppercase tracking-wider mb-3">
          Dispute Reason
        </h2>
        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{dispute.reason}</p>
      </div>

      {/* Evidence */}
      <div className="rounded bg-space-950 border border-border p-4">
        <h2 className="font-orbitron text-xs font-bold text-muted uppercase tracking-wider mb-3">
          Evidence
        </h2>
        {dispute.evidence ? (
          <div className="space-y-2">
            {dispute.evidence.split('\n').filter(Boolean).map((line, i) => {
              const isUrl = line.startsWith('http://') || line.startsWith('https://')
              return isUrl ? (
                <a
                  key={i}
                  href={line}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-accent-cyan hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  {line}
                </a>
              ) : (
                <p key={i} className="text-sm text-white">{line}</p>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">No evidence submitted with this dispute.</p>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded bg-space-950 border border-border p-4">
        <h2 className="font-orbitron text-xs font-bold text-muted uppercase tracking-wider mb-4">
          Timeline
        </h2>
        <div>
          <TimelineItem
            icon={AlertTriangle}
            color="bg-yellow-500/15 text-yellow-400"
            title="Dispute Filed"
            date={dispute.created_at}
          >
            <p className="text-xs text-muted line-clamp-2">{dispute.reason}</p>
          </TimelineItem>

          {dispute.status === 'open' && (
            <TimelineItem
              icon={Clock}
              color="bg-space-800 text-muted"
              title="Awaiting Review"
              date={new Date().toISOString()}
              isLast
            >
              <p className="text-xs text-muted">
                Our team typically reviews disputes within 24 hours.
              </p>
            </TimelineItem>
          )}

          {dispute.resolved_at && (
            <TimelineItem
              icon={dispute.status === 'resolved' ? CheckCircle2 : XCircle}
              color={dispute.status === 'resolved' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}
              title={dispute.status === 'resolved' ? 'Dispute Resolved' : 'Dispute Rejected'}
              date={dispute.resolved_at}
              isLast
            >
              {dispute.resolution && (
                <p className="text-xs text-white bg-space-900 rounded p-2 border border-border">
                  {dispute.resolution}
                </p>
              )}
            </TimelineItem>
          )}
        </div>
      </div>

      {/* Admin responses / Comments section */}
      <div className="rounded bg-space-950 border border-border p-4">
        <h2 className="font-orbitron text-xs font-bold text-muted uppercase tracking-wider mb-3">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Admin Responses
          </span>
        </h2>
        {dispute.resolution ? (
          <div className="rounded bg-space-900 border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-accent-cyan/15 flex items-center justify-center">
                <Eye className="w-3 h-3 text-accent-cyan" />
              </div>
              <span className="text-xs font-medium text-accent-cyan">RaiseGG Staff</span>
              {dispute.resolved_at && (
                <span className="text-[10px] text-muted">{formatDate(dispute.resolved_at)}</span>
              )}
            </div>
            <p className="text-sm text-white">{dispute.resolution}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">No admin responses yet. You will be notified when staff reviews your dispute.</p>
        )}
      </div>
    </div>
  )
}
