'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, MessageSquare, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ChatMessage {
  id: string
  player_id: string
  message: string
  created_at: string
  players?: { username: string } | null
}

interface Props {
  matchId: string
  playerId: string
  opponentName: string
}

export function MatchChat({ matchId, playerId, opponentName }: Props) {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread]   = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    // Initial load
    supabase
      .from('match_chats')
      .select('id, player_id, message, created_at, players:players!player_id(username)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMessages((data as unknown as ChatMessage[]) ?? [])
        setUnread(0)
      })

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'match_chats',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        // Fetch the full row with player name
        supabase
          .from('match_chats')
          .select('id, player_id, message, created_at, players:players!player_id(username)')
          .eq('id', payload.new.id)
          .single()
          .then(({ data }) => {
            if (data) setMessages((prev) => [...prev, data as unknown as ChatMessage])
          })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, open])

  // Auto-scroll + clear unread when open
  useEffect(() => {
    if (open) {
      setUnread(0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Count unread when closed
  useEffect(() => {
    if (open) return
    const channel = supabase
      .channel(`chat-unread-${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'match_chats',
        filter: `match_id=eq.${matchId}`,
      }, () => setUnread((n) => n + 1))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [matchId, open])

  async function sendMessage() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    await fetch('/api/match-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, message: trimmed }),
    })
    setSending(false)
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border bg-space-800 hover:border-accent-cyan/50 text-muted hover:text-accent-cyan transition-all"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Chat
        {unread > 0 && !open && (
          <span className="ml-1 w-4 h-4 rounded-full bg-accent-cyan text-space-900 text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="absolute right-0 bottom-9 z-40 w-72 bg-space-900 border border-border rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-white">vs {opponentName}</span>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto max-h-52 p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No messages yet. Say hi!</p>
            ) : (
              messages.map((msg) => {
                const mine = msg.player_id === playerId
                const name = (msg.players as any)?.username ?? '?'
                return (
                  <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    <span className={`text-[10px] text-muted mb-0.5 ${mine ? 'text-right' : ''}`}>{name}</span>
                    <span className={`text-xs px-2.5 py-1.5 rounded-lg max-w-[85%] break-words ${
                      mine
                        ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                        : 'bg-space-700 text-white border border-border'
                    }`}>
                      {msg.message}
                    </span>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-2 border-t border-border">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Message…"
              maxLength={200}
              className="flex-1 bg-space-800 border border-border rounded px-2.5 py-1.5 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan"
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              className="p-1.5 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
