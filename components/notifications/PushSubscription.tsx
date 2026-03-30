'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellRing, X } from 'lucide-react'

const STORAGE_KEY = 'rgg_push_subscribed'
const DISMISSED_KEY = 'rgg_push_banner_dismissed'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
  if (!vapidKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_KEY not set')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
    }

    const key = subscription.getKey('p256dh')
    const auth = subscription.getKey('auth')
    if (!key || !auth) return false

    const playerId = localStorage.getItem('rgg_player_id')
    if (!playerId) return false

    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
          auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        },
      }),
    })

    return res.ok
  } catch (err) {
    console.warn('[push] Subscription failed:', err)
    return false
  }
}

// ─── Banner variant: shows as a floating prompt for new users ────────────────

export function PushBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('PushManager' in window)) return
    if (!('serviceWorker' in navigator)) return

    // Already subscribed or dismissed
    if (localStorage.getItem(STORAGE_KEY) === 'true') return
    if (localStorage.getItem(DISMISSED_KEY) === 'true') {
      // Re-show after 7 days
      const ts = parseInt(localStorage.getItem(DISMISSED_KEY + '_ts') ?? '0', 10)
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return
    }

    // Already granted — auto-subscribe silently
    if (Notification.permission === 'granted') {
      subscribeToPush().then((ok) => {
        if (ok) localStorage.setItem(STORAGE_KEY, 'true')
      })
      return
    }

    // Denied — don't show
    if (Notification.permission === 'denied') return

    // Wait a bit before showing so it doesn't appear instantly on first load
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleEnable = useCallback(async () => {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const ok = await subscribeToPush()
      if (ok) {
        localStorage.setItem(STORAGE_KEY, 'true')
      }
    }
    setVisible(false)
  }, [])

  const handleDismiss = useCallback(() => {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, 'true')
    localStorage.setItem(DISMISSED_KEY + '_ts', String(Date.now()))
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 left-4 md:left-auto md:max-w-sm z-50 animate-in slide-in-from-bottom-4">
      <div className="rounded-xl bg-space-800 border border-accent-purple/30 p-4 shadow-lg shadow-accent-purple/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent-purple/10 shrink-0">
            <BellRing className="w-5 h-5 text-accent-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white mb-1">Enable Push Notifications</p>
            <p className="text-xs text-muted leading-relaxed">
              Match invites, tournament reminders, friend requests — never miss the action.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleEnable}
                className="px-3 py-1.5 rounded-lg bg-accent-purple/20 text-accent-purple text-xs font-semibold hover:bg-accent-purple/30 transition-colors"
              >
                Enable
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg text-muted text-xs hover:text-white transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Settings toggle: inline card for the settings page ──────────────────────

export function PushToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
      setSupported(false)
      return
    }
    if (Notification.permission === 'denied') {
      setDenied(true)
      return
    }
    setEnabled(
      Notification.permission === 'granted' &&
        localStorage.getItem(STORAGE_KEY) === 'true'
    )
  }, [])

  const handleToggle = useCallback(async () => {
    if (enabled) {
      // Unsubscribe: remove from service worker
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        const sub = await registration?.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      } catch (_) {
        // ignore
      }
      localStorage.removeItem(STORAGE_KEY)
      setEnabled(false)
      return
    }

    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const ok = await subscribeToPush()
        if (ok) {
          localStorage.setItem(STORAGE_KEY, 'true')
          setEnabled(true)
        }
      } else if (permission === 'denied') {
        setDenied(true)
      }
    } finally {
      setLoading(false)
    }
  }, [enabled])

  if (!supported) return null

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-5 h-5 text-accent-cyan" />
        <h2 className="font-orbitron font-bold text-white text-sm">Push Notifications</h2>
      </div>

      {denied ? (
        <p className="text-muted text-sm">
          Push notifications are blocked by your browser. To re-enable, update notification permissions in your browser settings for this site.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">
                {enabled ? 'Push notifications are enabled' : 'Get notified about matches, tournaments and friend requests'}
              </p>
              <p className="text-xs text-muted mt-1">
                Match invites, tournament reminders, friend requests
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 disabled:opacity-50 ${
                enabled ? 'bg-accent-cyan' : 'bg-space-600'
              }`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
