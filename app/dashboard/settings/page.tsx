'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Wallet, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { breadcrumbSchema } from '@/lib/schemas'

interface Player {
  id: string
  username: string
  email: string | null
  wallet_address: string | null
  avatar_url: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Dashboard', url: 'https://raisegg.com/dashboard' },
    { name: 'Settings', url: 'https://raisegg.com/dashboard/settings' },
  ])

  const fetchPlayer = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (!data.player) {
        router.push('/api/auth/steam')
        return
      }
      // Fetch full player data including email and wallet
      const detailRes = await fetch('/api/players/me')
      const detailData = await detailRes.json()
      if (detailData.player) {
        setPlayer(detailData.player)
        setUsername(detailData.player.username ?? '')
        setEmail(detailData.player.email ?? '')
      } else {
        setPlayer({ ...data.player, email: null, wallet_address: null })
        setUsername(data.player.username ?? '')
      }
    } catch {
      router.push('/api/auth/steam')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchPlayer()
  }, [fetchPlayer])

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)

    try {
      const res = await fetch('/api/players/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: email.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setSaveMsg({ type: 'ok', text: 'Settings saved' })
      if (data.player) setPlayer(data.player)
    } catch (err) {
      setSaveMsg({ type: 'err', text: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/players/me', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Delete failed')
      }
      // Logout and redirect
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card animate-pulse h-64" />
      </div>
    )
  }

  if (!player) return null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Account Settings</h1>
        <p className="text-muted mb-10">Manage your profile and account preferences.</p>

        {/* Display Name */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-accent-cyan" />
            <h2 className="font-orbitron font-bold text-white text-sm">Display Name</h2>
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={32}
            className="w-full bg-space-800 border border-space-700 rounded px-3 py-2.5 text-white text-sm placeholder:text-muted focus:border-accent-cyan focus:outline-none transition-colors"
            placeholder="Your display name"
          />
          <p className="text-muted text-xs mt-2">This is how other players see you on leaderboards and match lobbies.</p>
        </div>

        {/* Email */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-accent-cyan" />
            <h2 className="font-orbitron font-bold text-white text-sm">Email</h2>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-space-800 border border-space-700 rounded px-3 py-2.5 text-white text-sm placeholder:text-muted focus:border-accent-cyan focus:outline-none transition-colors"
            placeholder="you@example.com"
          />
          <p className="text-muted text-xs mt-2">Used for match notifications and account recovery. Optional.</p>
        </div>

        {/* Connected Wallet */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-5 h-5 text-accent-cyan" />
            <h2 className="font-orbitron font-bold text-white text-sm">Connected Wallet</h2>
          </div>
          {player.wallet_address ? (
            <div className="bg-space-800 border border-space-700 rounded px-3 py-2.5 text-accent-cyan text-sm font-mono break-all">
              {player.wallet_address}
            </div>
          ) : (
            <p className="text-muted text-sm">No wallet connected. Connect your Phantom wallet from the dashboard.</p>
          )}
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4 mb-12">
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
          {saveMsg && (
            <span className={saveMsg.type === 'ok' ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
              {saveMsg.text}
            </span>
          )}
        </div>

        {/* Danger Zone */}
        <div className="card border-red-500/30">
          <h2 className="font-orbitron font-bold text-red-400 text-sm mb-3">Danger Zone</h2>
          <p className="text-muted text-sm mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="secondary" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4" />
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="card max-w-md w-full">
            <h3 className="font-orbitron font-bold text-red-400 text-lg mb-3">Delete Account</h3>
            <p className="text-muted text-sm mb-4">
              This will permanently delete your account, match history, and balance. Type <strong className="text-white">DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-space-800 border border-space-700 rounded px-3 py-2.5 text-white text-sm placeholder:text-muted focus:border-red-500 focus:outline-none transition-colors mb-4"
            />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirm('')
                }}
              >
                Cancel
              </Button>
              <button
                disabled={deleteConfirm !== 'DELETE' || deleting}
                onClick={handleDelete}
                className="btn-primary bg-red-600 hover:bg-red-700 px-6 py-3 text-sm font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
