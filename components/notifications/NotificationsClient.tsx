'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  Swords,
  Users,
  Trophy,
  Award,
  Info,
  CheckCheck,
  Loader2,
  ChevronDown,
} from 'lucide-react'

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
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

type Filter = 'all' | 'unread'

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const PAGE_SIZE = 20

  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (filter === 'unread') params.set('unread', 'true')

      const res = await fetch(`/api/notifications?${params}`)
      if (!res.ok) return
      const data = await res.json()

      if (append) {
        setNotifications(prev => [...prev, ...(data.notifications ?? [])])
      } else {
        setNotifications(data.notifications ?? [])
      }
      setTotal(data.total ?? 0)
      setUnreadCount(data.unreadCount ?? 0)
    } catch (_) {}

    setLoading(false)
    setLoadingMore(false)
  }, [filter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (_) {}
  }

  async function toggleRead(id: string, currentRead: boolean) {
    // For now, we only support marking as read
    if (currentRead) return
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

  const hasMore = notifications.length < total

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['all', 'unread'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                filter === f
                  ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                  : 'bg-space-800 text-muted border border-border hover:border-accent-cyan/30'
              }`}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-accent-cyan hover:text-accent-cyan/80 font-semibold transition-colors flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent-cyan animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-10 h-10 text-muted/30 mx-auto mb-3" />
          <p className="text-muted text-sm">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const Icon = TYPE_ICONS[n.type] ?? Bell
            return (
              <button
                key={n.id}
                onClick={() => toggleRead(n.id, n.read)}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-start gap-3 transition-all ${
                  n.read
                    ? 'bg-space-800/30 hover:bg-space-800/60'
                    : 'bg-accent-cyan/5 border border-accent-cyan/10 hover:bg-accent-cyan/10'
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  n.read ? 'bg-space-800' : 'bg-accent-purple/20'
                }`}>
                  <Icon className={`w-4 h-4 ${n.read ? 'text-muted' : 'text-accent-purple'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${n.read ? 'text-muted' : 'text-white'}`}>
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-accent-cyan flex-shrink-0 shadow-[0_0_6px_rgba(0,229,255,0.5)]" />
                    )}
                    <span className="ml-auto text-[10px] text-muted/60 flex-shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="text-xs text-muted mt-0.5">{n.body}</p>
                  )}
                </div>
              </button>
            )
          })}

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => fetchNotifications(notifications.length, true)}
                disabled={loadingMore}
                className="text-xs text-accent-cyan hover:text-accent-cyan/80 font-semibold transition-colors flex items-center gap-1 mx-auto"
              >
                {loadingMore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
