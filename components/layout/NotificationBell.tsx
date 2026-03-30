'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Bell,
  Swords,
  Users,
  Trophy,
  Award,
  Info,
  CheckCheck,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  created_at: string
  data_json: Record<string, unknown>
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  match_invite: Swords,
  friend_request: Users,
  tournament_start: Trophy,
  achievement: Award,
  system: Info,
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  // Fetch notifications on mount (initial load)
  useEffect(() => {
    fetchNotifications()
  }, [])

  // Supabase Realtime subscription for new notifications
  useEffect(() => {
    if (!playerId) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel(`notifications:${playerId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `player_id=eq.${playerId}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev].slice(0, 20))
            setUnreadCount(prev => prev + 1)
          }
        )
        .subscribe()
    } catch (_) {
      // Realtime not available — no-op, initial fetch already loaded data
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [playerId])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
      if (data.playerId) {
        setPlayerId(data.playerId)
      }
    } catch (_) {
      // silently fail
    }
  }

  async function markAllRead() {
    setLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (_) {}
    setLoading(false)
  }

  async function markOneRead(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (_) {}
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) fetchNotifications()
        }}
        className="relative p-2 rounded-lg text-muted hover:text-white hover:bg-space-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent-purple text-[10px] font-bold text-white leading-none px-1 shadow-[0_0_8px_rgba(123,97,255,0.5)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] bg-space-900 border border-border rounded-lg shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-orbitron text-xs font-bold text-white uppercase tracking-wider">
              Notifications
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-[10px] text-accent-cyan hover:text-accent-cyan/80 font-semibold transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[320px]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] ?? Bell
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markOneRead(n.id)
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b border-border/50 last:border-0 ${
                      n.read
                        ? 'bg-transparent hover:bg-space-800/50'
                        : 'bg-accent-cyan/5 hover:bg-accent-cyan/10'
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      n.read ? 'bg-space-800' : 'bg-accent-purple/20'
                    }`}>
                      <Icon className={`w-4 h-4 ${n.read ? 'text-muted' : 'text-accent-purple'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${n.read ? 'text-muted' : 'text-white'}`}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-accent-cyan flex-shrink-0 shadow-[0_0_6px_rgba(0,229,255,0.5)]" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-accent-cyan hover:text-accent-cyan/80 font-semibold transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
