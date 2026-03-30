'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { supportsNotifications, notificationsGranted, requestNotificationPermission } from '@/lib/notifications'

const DISMISSED_KEY = 'rgg_notif_prompt_dismissed'

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

async function registerAndSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
    if (!vapidKey) {
      console.warn('[push] NEXT_PUBLIC_VAPID_KEY not set')
      return
    }

    // Check for existing subscription first
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
    }

    const key = subscription.getKey('p256dh')
    const auth = subscription.getKey('auth')
    if (!key || !auth) return

    // Get player ID from localStorage (set at login)
    const playerId = localStorage.getItem('rgg_player_id')
    if (!playerId) return

    await fetch('/api/notifications/subscribe', {
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
  } catch (_) {
    console.warn('[push] Failed to register push subscription')
  }
}

export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show once per session and if not yet granted
    if (!supportsNotifications()) return
    if (notificationsGranted()) return
    if (Notification.permission === 'denied') return
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    setVisible(true)
  }, [])

  // Auto-register if permission was already granted (returning user)
  useEffect(() => {
    if (notificationsGranted()) {
      registerAndSubscribe()
    }
  }, [])

  async function handleEnable() {
    const result = await requestNotificationPermission()
    if (result === 'granted') {
      localStorage.setItem('rgg_notifications_enabled', 'true')
      await registerAndSubscribe()
    }
    dismiss()
  }

  function dismiss() {
    setVisible(false)
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4">
      <div className="rounded-xl bg-space-800 border border-accent-cyan/30 p-4 shadow-lg shadow-accent-cyan/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent-cyan/10 shrink-0">
            <Bell className="w-5 h-5 text-accent-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white mb-1">Enable Notifications</p>
            <p className="text-xs text-muted leading-relaxed">
              Know when friends come online, tournaments start, and matches are found.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleEnable}
                className="px-3 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-xs font-semibold hover:bg-accent-cyan/30 transition-colors"
              >
                Enable
              </button>
              <button
                onClick={dismiss}
                className="px-3 py-1.5 rounded-lg text-muted text-xs hover:text-white transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="text-muted hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
