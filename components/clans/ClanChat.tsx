'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MessageSquare, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ChatMessage {
  id: string
  player_id: string
  username: string
  avatar_url: string | null
  content: string
  created_at: string
}

interface Props {
  clanId: string
  isMember: boolean
}

export default function ClanChat({ clanId, isMember }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [onlineCount, setOnlineCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/clans/${clanId}/chat`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
      setOnlineCount(data.onlineCount ?? 0)
    } finally {
      setLoading(false)
    }
  }, [clanId])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Supabase Realtime subscription for new chat messages
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel(`clan_chat:${clanId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'clan_messages',
            filter: `clan_id=eq.${clanId}`,
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage
            // Only append if not already present (avoid duplicates from own send)
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        )
        .subscribe()
    } catch (_) {
      // Realtime not available — fall back to polling
      const interval = setInterval(fetchMessages, 10000)
      return () => clearInterval(interval)
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [clanId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')
    try {
      const res = await fetch(`/api/clans/${clanId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        // Realtime will handle the new message, but fetch as backup
        // in case the realtime event hasn't arrived yet
        await fetchMessages()
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed to send message')
        setInput(text)
      }
    } finally {
      setSending(false)
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return <div className="h-96 rounded-xl bg-space-800 border border-border animate-pulse" />
  }

  return (
    <div className="rounded-xl bg-space-800 border border-border flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent-cyan" />
          <span className="text-sm font-semibold text-white">Clan Chat</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <Users className="w-3.5 h-3.5" />
          <span>{onlineCount} online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted/50">No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="flex items-start gap-3 group">
            <div className="w-8 h-8 rounded-full bg-space-700 border border-border flex items-center justify-center text-xs font-bold text-white shrink-0">
              {msg.avatar_url ? (
                <img src={msg.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                msg.username[0]?.toUpperCase() ?? '?'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-white">{msg.username}</span>
                <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isMember ? (
        <form onSubmit={sendMessage} className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1 px-4 py-2.5 rounded-lg bg-space-900 border border-border text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent-cyan"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-lg bg-accent-cyan hover:bg-accent-cyan/80 text-space-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="px-4 py-3 border-t border-border text-center">
          <p className="text-xs text-muted">Join this clan to chat</p>
        </div>
      )}
    </div>
  )
}
