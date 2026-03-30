'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, ArrowLeft } from 'lucide-react'

type Conversation = {
  partnerId: string
  username: string
  avatar_url: string | null
  lastMessage: string
  lastMessageAt: string
  unread: number
}

type Message = {
  id: string
  sender_id: string
  receiver_id: string
  text: string
  read_at: string | null
  created_at: string
}

type Partner = {
  id: string
  username: string
  avatar_url: string | null
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [partner, setPartner] = useState<Partner | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (partnerId: string) => {
    try {
      const res = await fetch(`/api/messages/${partnerId}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
      setPartner(data.partner ?? null)
    } catch {
      // ignore
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(() => {
      fetchConversations()
      if (selectedId) fetchMessages(selectedId)
    }, 5000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedId, fetchConversations, fetchMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function selectConversation(partnerId: string) {
    setSelectedId(partnerId)
    fetchMessages(partnerId)
    // Clear unread locally
    setConversations(prev =>
      prev.map(c => (c.partnerId === partnerId ? { ...c, unread: 0 } : c))
    )
  }

  async function sendMessage() {
    if (!selectedId || !input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedId, text: input.trim() }),
      })
      if (res.ok) {
        setInput('')
        await fetchMessages(selectedId)
        await fetchConversations()
      }
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-96 rounded-lg bg-space-800 border border-border animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-orbitron font-bold text-white mb-6">Messages</h1>

      <div className="flex rounded-xl bg-space-800 border border-border overflow-hidden" style={{ height: '70vh' }}>
        {/* Left sidebar — conversation list */}
        <div
          className={`w-full md:w-80 shrink-0 border-r border-border flex flex-col ${
            selectedId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3 border-b border-border">
            <p className="text-xs text-muted uppercase tracking-wider font-medium">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">No conversations yet.</p>
                <p className="text-xs text-muted/60 mt-1">
                  Send a message from a player&apos;s profile!
                </p>
              </div>
            ) : (
              conversations.map(c => (
                <button
                  key={c.partnerId}
                  onClick={() => selectConversation(c.partnerId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-space-700/40 transition-colors ${
                    selectedId === c.partnerId ? 'bg-space-700/60' : ''
                  }`}
                >
                  {/* Avatar */}
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt={c.username}
                      className="w-10 h-10 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-space-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {c.username[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate">{c.username}</span>
                      <span className="text-[10px] text-muted shrink-0 ml-2">{formatTime(c.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-accent-purple text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — message thread */}
        <div
          className={`flex-1 flex flex-col ${
            selectedId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedId && partner ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <button
                  onClick={() => setSelectedId(null)}
                  className="md:hidden p-1.5 rounded hover:bg-space-700 text-muted hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {partner.avatar_url ? (
                  <img src={partner.avatar_url} alt={partner.username} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-space-700 flex items-center justify-center text-sm font-bold text-white">
                    {partner.username[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-white">{partner.username}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map(m => {
                  const isMe = m.sender_id !== partner.id
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                          isMe
                            ? 'bg-accent-purple/20 text-white border border-accent-purple/30'
                            : 'bg-space-700 text-white border border-border'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-accent-purple/60' : 'text-muted/60'}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    maxLength={500}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-space-900 border border-border text-white placeholder:text-muted text-sm focus:outline-none focus:border-accent-cyan"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="p-2.5 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-muted/50 mt-1 text-right">{input.length}/500</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-muted text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
