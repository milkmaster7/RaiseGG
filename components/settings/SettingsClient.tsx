'use client'

import { useEffect, useState, useCallback } from 'react'
import { User, Bell, Gamepad2, Shield, AlertTriangle, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ─── 44 target countries ─────────────────────────────────────────
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh',
  'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Egypt', 'Estonia', 'Georgia', 'Greece', 'Hungary', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Israel', 'Jordan', 'Kazakhstan', 'Kosovo', 'Kuwait',
  'Kyrgyzstan', 'Latvia', 'Lebanon', 'Lithuania', 'Malaysia', 'Moldova',
  'Mongolia', 'Montenegro', 'North Macedonia', 'Oman', 'Pakistan', 'Palestine',
  'Philippines', 'Poland', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia',
  'Serbia', 'Slovakia', 'Slovenia', 'Sri Lanka', 'Tajikistan', 'Thailand',
  'Turkey', 'Turkmenistan', 'UAE', 'Ukraine', 'Uzbekistan', 'Vietnam',
]

const GAMES = [
  { value: 'cs2', label: 'CS2' },
  { value: 'dota2', label: 'Dota 2' },
  { value: 'deadlock', label: 'Deadlock' },
]

const REGIONS = [
  { value: 'istanbul', label: 'Istanbul' },
  { value: 'bucharest', label: 'Bucharest' },
  { value: 'tbilisi', label: 'Tbilisi' },
  { value: 'frankfurt', label: 'Frankfurt' },
]

// ─── Section wrapper ─────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  children,
  onSave,
  saving,
  saved,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  onSave: () => void
  saving: boolean
  saved: boolean
}) {
  return (
    <div className="rounded bg-space-950 border border-border p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <Icon className="w-4.5 h-4.5 text-accent-cyan" />
        <h2 className="font-orbitron text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
        <Button onClick={onSave} disabled={saving} className="text-xs px-4 py-1.5">
          {saving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Save
            </span>
          )}
        </Button>
        {saved && <span className="text-xs text-green-400 font-medium">Saved successfully</span>}
      </div>
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer group">
      <div>
        <p className="text-sm text-white group-hover:text-accent-cyan transition-colors">{label}</p>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0
          ${checked ? 'bg-accent-cyan' : 'bg-space-800'}
        `}
      >
        <span
          className={`
            absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
    </label>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function SettingsClient() {
  // Profile
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')

  // Notifications
  const [notif, setNotif] = useState({
    matchInvites: true,
    friendRequests: true,
    tournamentReminders: true,
    clanMessages: true,
    weeklyEmail: false,
    pushNotifications: false,
  })

  // Game preferences
  const [preferredGame, setPreferredGame] = useState('cs2')
  const [preferredRegion, setPreferredRegion] = useState('istanbul')

  // Privacy
  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showMatchHistory: true,
    showElo: true,
  })

  // State management
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current profile
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/players/me')
        if (res.ok) {
          const { player } = await res.json()
          setDisplayName(player.username ?? '')
          setBio(player.bio ?? '')
          setCountry(player.country ?? '')
          if (player.preferred_game) setPreferredGame(player.preferred_game)
          if (player.preferred_region) setPreferredRegion(player.preferred_region)
          if (player.notification_prefs) setNotif(prev => ({ ...prev, ...player.notification_prefs }))
          if (player.privacy_prefs) setPrivacy(prev => ({ ...prev, ...player.privacy_prefs }))
        }
      } catch {
        setError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const saveSection = useCallback(async (section: string, data: Record<string, unknown>) => {
    setSaving(section)
    setSaved(null)
    try {
      const res = await fetch('/api/players/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setSaved(section)
        setTimeout(() => setSaved(null), 3000)
      } else {
        const json = await res.json()
        setError(json.error ?? 'Failed to save')
        setTimeout(() => setError(null), 4000)
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(null)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-40 rounded bg-space-950 border border-border animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Profile ──────────────────────────────────────────────── */}
      <Section
        title="Profile"
        icon={User}
        onSave={() => saveSection('profile', { username: displayName, bio, country })}
        saving={saving === 'profile'}
        saved={saved === 'profile'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1.5 font-medium">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={32}
              className="w-full bg-space-900 border border-border rounded px-3 py-2 text-sm text-white placeholder-muted focus:border-accent-cyan focus:outline-none transition-colors"
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5 font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full bg-space-900 border border-border rounded px-3 py-2 text-sm text-white placeholder-muted focus:border-accent-cyan focus:outline-none transition-colors resize-none"
              placeholder="Tell other players about yourself..."
            />
            <p className="text-[11px] text-muted mt-1">{bio.length}/200</p>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5 font-medium">Country / Region</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full bg-space-900 border border-border rounded px-3 py-2 text-sm text-white focus:border-accent-cyan focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="">Select country</option>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* ── Notification Preferences ─────────────────────────────── */}
      <Section
        title="Notification Preferences"
        icon={Bell}
        onSave={() => saveSection('notifications', { notification_prefs: notif })}
        saving={saving === 'notifications'}
        saved={saved === 'notifications'}
      >
        <div className="divide-y divide-border">
          <Toggle
            label="Match Invites"
            description="Get notified when someone invites you to a match"
            checked={notif.matchInvites}
            onChange={v => setNotif(p => ({ ...p, matchInvites: v }))}
          />
          <Toggle
            label="Friend Requests"
            description="Notifications for incoming friend requests"
            checked={notif.friendRequests}
            onChange={v => setNotif(p => ({ ...p, friendRequests: v }))}
          />
          <Toggle
            label="Tournament Reminders"
            description="Reminders before tournaments you registered for"
            checked={notif.tournamentReminders}
            onChange={v => setNotif(p => ({ ...p, tournamentReminders: v }))}
          />
          <Toggle
            label="Clan Messages"
            description="Notifications for messages in your clan"
            checked={notif.clanMessages}
            onChange={v => setNotif(p => ({ ...p, clanMessages: v }))}
          />
          <Toggle
            label="Weekly Highlights Email"
            description="A weekly email with your stats and achievements"
            checked={notif.weeklyEmail}
            onChange={v => setNotif(p => ({ ...p, weeklyEmail: v }))}
          />
          <Toggle
            label="Push Notifications"
            description="Browser push notifications for real-time alerts"
            checked={notif.pushNotifications}
            onChange={v => setNotif(p => ({ ...p, pushNotifications: v }))}
          />
        </div>
      </Section>

      {/* ── Game Preferences ─────────────────────────────────────── */}
      <Section
        title="Game Preferences"
        icon={Gamepad2}
        onSave={() => saveSection('game', { preferred_game: preferredGame, preferred_region: preferredRegion })}
        saving={saving === 'game'}
        saved={saved === 'game'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1.5 font-medium">Preferred Game</label>
            <div className="flex gap-2">
              {GAMES.map(g => (
                <button
                  key={g.value}
                  onClick={() => setPreferredGame(g.value)}
                  className={`
                    flex-1 px-3 py-2.5 rounded border text-sm font-medium transition-all
                    ${preferredGame === g.value
                      ? 'border-accent-cyan bg-accent-cyan/10 text-white shadow-[0_0_8px_rgba(0,230,255,0.15)]'
                      : 'border-border bg-space-900 text-muted hover:text-white hover:border-accent-purple/30'
                    }
                  `}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5 font-medium">Preferred Server Region</label>
            <div className="grid grid-cols-2 gap-2">
              {REGIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setPreferredRegion(r.value)}
                  className={`
                    px-3 py-2.5 rounded border text-sm font-medium transition-all
                    ${preferredRegion === r.value
                      ? 'border-accent-cyan bg-accent-cyan/10 text-white shadow-[0_0_8px_rgba(0,230,255,0.15)]'
                      : 'border-border bg-space-900 text-muted hover:text-white hover:border-accent-purple/30'
                    }
                  `}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Privacy ──────────────────────────────────────────────── */}
      <Section
        title="Privacy"
        icon={Shield}
        onSave={() => saveSection('privacy', { privacy_prefs: privacy })}
        saving={saving === 'privacy'}
        saved={saved === 'privacy'}
      >
        <div className="divide-y divide-border">
          <Toggle
            label="Show Profile Publicly"
            description="Allow anyone to view your profile and stats"
            checked={privacy.showProfile}
            onChange={v => setPrivacy(p => ({ ...p, showProfile: v }))}
          />
          <Toggle
            label="Show Match History"
            description="Display your recent matches on your profile"
            checked={privacy.showMatchHistory}
            onChange={v => setPrivacy(p => ({ ...p, showMatchHistory: v }))}
          />
          <Toggle
            label="Show ELO on Leaderboard"
            description="Include your rating on public leaderboards"
            checked={privacy.showElo}
            onChange={v => setPrivacy(p => ({ ...p, showElo: v }))}
          />
        </div>
      </Section>

      {/* ── Danger Zone ──────────────────────────────────────────── */}
      <div className="rounded bg-space-950 border border-red-500/30 p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
          <h2 className="font-orbitron text-sm font-bold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {!deleteConfirm ? (
          <Button
            onClick={() => setDeleteConfirm(true)}
            className="text-xs px-4 py-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          >
            Delete My Account
          </Button>
        ) : (
          <div className="rounded bg-red-500/5 border border-red-500/20 p-4">
            <p className="text-sm text-red-400 font-medium mb-3">
              Are you absolutely sure? This will permanently delete your account, match history,
              and all RaisePoints.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setDeleteConfirm(false)}
                className="text-xs px-4 py-1.5"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const res = await fetch('/api/players/me', { method: 'DELETE' })
                  if (res.ok) {
                    window.location.href = '/'
                  } else {
                    const json = await res.json()
                    setError(json.error ?? 'Failed to delete account')
                    setDeleteConfirm(false)
                  }
                }}
                className="text-xs px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                Yes, Delete Everything
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
