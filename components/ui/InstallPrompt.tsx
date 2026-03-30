'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'raisegg-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Only show on mobile
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setIsMobile(mobile)
    if (!mobile) return

    // Check if previously dismissed
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (dismissed) {
        const ts = parseInt(dismissed, 10)
        // Re-show after 7 days
        if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return
      }
    } catch (_) {
      // localStorage unavailable
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
      }
    } catch (_) {
      // prompt failed
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setVisible(false)
    setDeferredPrompt(null)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch (_) {
      // localStorage unavailable
    }
  }, [])

  if (!visible || !isMobile) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 bg-space-800 border border-accent-cyan/30 rounded-xl px-4 py-3 shadow-glow">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-cyan/10 flex-shrink-0">
          <Download className="w-5 h-5 text-accent-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Install RaiseGG</p>
          <p className="text-xs text-muted truncate">Quick access from your home screen</p>
        </div>
        <button
          onClick={handleInstall}
          className="btn-primary !px-4 !py-2 text-xs font-bold flex-shrink-0"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg hover:bg-space-700 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>
    </div>
  )
}
