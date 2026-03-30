'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Check, X, Shield, Search } from 'lucide-react'

interface Application {
  id: string
  player_id: string
  username: string
  elo: number
  message: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface RecruitmentSettings {
  recruiting: boolean
  minElo: number
  preferredGame: string
  region: string
}

interface Props {
  clanId: string
  isAdmin: boolean
  isMember: boolean
  currentSettings: RecruitmentSettings
}

const GAME_OPTIONS = [
  { value: 'all', label: 'All Games' },
  { value: 'cs2', label: 'CS2' },
  { value: 'dota2', label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
]

export default function ClanRecruitment({ clanId, isAdmin, isMember, currentSettings }: Props) {
  const [settings, setSettings] = useState<RecruitmentSettings>(currentSettings)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applyMessage, setApplyMessage] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/clans/${clanId}`)
      if (!res.ok) return
      const data = await res.json()
      const clan = data.clan
      setSettings({
        recruiting: clan.recruiting ?? false,
        minElo: clan.min_elo ?? 0,
        preferredGame: clan.game_focus ?? 'all',
        region: clan.region ?? 'Global',
      })

      if (isAdmin) {
        const appRes = await fetch(`/api/clans/${clanId}/chat?type=applications`)
        if (appRes.ok) {
          const appData = await appRes.json()
          setApplications(appData.applications ?? [])
        }
      }

      if (!isMember) {
        setApplied(clan.my_pending ?? false)
      }
    } finally {
      setLoading(false)
    }
  }, [clanId, isAdmin, isMember])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function saveSettings() {
    setSaving(true)
    try {
      await fetch(`/api/clans/${clanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          recruiting: settings.recruiting,
          min_elo: settings.minElo,
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  async function submitApplication() {
    setApplying(true)
    try {
      const res = await fetch(`/api/clans/${clanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', message: applyMessage }),
      })
      if (res.ok) {
        setApplied(true)
        setApplyMessage('')
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed to submit application')
      }
    } finally {
      setApplying(false)
    }
  }

  async function handleApplication(appId: string, status: 'approved' | 'rejected') {
    setActionLoading(appId)
    try {
      const res = await fetch(`/api/clans/${clanId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review_application', application_id: appId, status }),
      })
      if (res.ok) {
        setApplications(prev =>
          prev.map(a => a.id === appId ? { ...a, status } : a)
        )
      }
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="h-48 rounded-xl bg-space-800 border border-border animate-pulse" />
  }

  const filteredApps = filterStatus === 'all'
    ? applications
    : applications.filter(a => a.status === filterStatus)

  return (
    <div className="space-y-6">
      {/* Recruitment Status */}
      <div className="rounded-xl bg-space-800 border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-accent-purple" />
          <h3 className="text-lg font-orbitron font-bold text-white">Recruitment</h3>
        </div>

        {isAdmin ? (
          <div className="space-y-4">
            {/* Recruiting toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSettings(s => ({ ...s, recruiting: !s.recruiting }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.recruiting ? 'bg-green-500' : 'bg-space-700'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.recruiting ? 'translate-x-5' : ''
                }`} />
              </button>
              <span className="text-sm text-white font-medium">
                {settings.recruiting ? 'Actively Recruiting' : 'Not Recruiting'}
              </span>
            </div>

            {/* Min ELO */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Minimum ELO</label>
              <input
                type="number"
                value={settings.minElo}
                onChange={e => setSettings(s => ({ ...s, minElo: Math.max(0, Number(e.target.value)) }))}
                className="w-32 px-3 py-2 rounded-lg bg-space-900 border border-border text-white text-sm focus:outline-none focus:border-accent-cyan"
                min={0}
                step={50}
              />
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Recruitment Settings'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${settings.recruiting ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-white font-medium">
                {settings.recruiting ? 'Actively Looking for Members' : 'Not Currently Recruiting'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              {settings.minElo > 0 && (
                <span className="px-2 py-1 rounded bg-space-700 border border-border">
                  Min ELO: <span className="text-accent-cyan font-mono">{settings.minElo}</span>
                </span>
              )}
              <span className="px-2 py-1 rounded bg-space-700 border border-border">
                Game: <span className="text-white">{GAME_OPTIONS.find(g => g.value === settings.preferredGame)?.label ?? settings.preferredGame}</span>
              </span>
              <span className="px-2 py-1 rounded bg-space-700 border border-border">
                Region: <span className="text-white">{settings.region}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Apply Section (non-members only) */}
      {!isMember && settings.recruiting && (
        <div className="rounded-xl bg-space-800 border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-accent-cyan" />
            <h3 className="text-sm font-semibold text-white">Apply to Join</h3>
          </div>

          {applied ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-400">
              <Shield className="w-4 h-4 shrink-0" />
              Your application is pending review
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={applyMessage}
                onChange={e => setApplyMessage(e.target.value)}
                placeholder="Why do you want to join? (optional)"
                maxLength={300}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-space-900 border border-border text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent-cyan resize-none"
              />
              <button
                onClick={submitApplication}
                disabled={applying}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Applications List (admins only) */}
      {isAdmin && (
        <div className="rounded-xl bg-space-800 border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Applications</h3>
            <div className="flex gap-1 bg-space-900 rounded-lg p-0.5">
              {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                    filterStatus === s
                      ? 'bg-accent-cyan text-space-900'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {filteredApps.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No {filterStatus === 'all' ? '' : filterStatus} applications</p>
          ) : (
            <div className="space-y-2">
              {filteredApps.map(app => (
                <div key={app.id} className="flex items-center gap-4 rounded-lg bg-space-700/40 border border-border p-3">
                  <div className="w-8 h-8 rounded-full bg-space-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {app.username[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{app.username}</span>
                      <span className="text-xs font-mono text-accent-cyan">{app.elo} ELO</span>
                    </div>
                    {app.message && (
                      <p className="text-xs text-muted mt-0.5 truncate">{app.message}</p>
                    )}
                    <p className="text-[10px] text-muted/60 mt-0.5">
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {app.status === 'pending' ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleApplication(app.id, 'approved')}
                        disabled={actionLoading === app.id}
                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleApplication(app.id, 'rejected')}
                        disabled={actionLoading === app.id}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      app.status === 'approved'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {app.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
