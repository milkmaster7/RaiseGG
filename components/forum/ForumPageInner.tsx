'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Pin, Lock, ChevronRight } from 'lucide-react'

type Thread = {
  id: string
  title: string
  category: string
  pinned: boolean
  locked: boolean
  created_at: string
  updated_at: string
  author: { id: string; username: string; avatar_url: string | null } | null
  replies: { count: number }[]
}

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'general', label: 'General' },
  { key: 'cs2', label: 'CS2' },
  { key: 'dota2', label: 'Dota 2' },
  { key: 'deadlock', label: 'Deadlock' },
  { key: 'teams', label: 'Team Recruitment' },
  { key: 'bugs', label: 'Bug Reports' },
  { key: 'suggestions', label: 'Suggestions' },
]

const CATEGORY_COLORS: Record<string, string> = {
  general: 'text-white',
  cs2: 'text-[#06BFFF]',
  dota2: 'text-[#E23D28]',
  deadlock: 'text-[#F5A623]',
  teams: 'text-accent-purple',
  bugs: 'text-red-400',
  suggestions: 'text-green-400',
}

export function ForumPageInner() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newThread, setNewThread] = useState({ title: '', body: '', category: 'general' })
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    const params = category ? `?category=${category}` : ''
    fetch(`/api/forum${params}`)
      .then(r => r.json())
      .then(d => { setThreads(d.threads ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [category])

  async function createThread() {
    if (!newThread.title.trim() || !newThread.body.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThread),
      })
      if (res.ok) {
        const data = await res.json()
        setThreads(prev => [data.thread, ...prev])
        setShowCreate(false)
        setNewThread({ title: '', body: '', category: 'general' })
      }
    } finally {
      setPosting(false)
    }
  }

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              category === c.key ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30' : 'bg-space-800 text-muted border border-border hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="ml-auto px-3 py-1.5 rounded text-xs font-medium bg-accent-purple/10 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/20 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> New Thread
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-6">
          <h2 className="font-orbitron text-sm font-bold text-white mb-4">New Thread</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Thread title"
              value={newThread.title}
              onChange={e => setNewThread(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
            />
            <select
              value={newThread.category}
              onChange={e => setNewThread(prev => ({ ...prev, category: e.target.value }))}
              className="w-full bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
            >
              {CATEGORIES.filter(c => c.key).map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <textarea
              placeholder="What's on your mind?"
              rows={4}
              value={newThread.body}
              onChange={e => setNewThread(prev => ({ ...prev, body: e.target.value }))}
              className="w-full bg-space-800 border border-border rounded px-3 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors resize-none"
            />
            <div className="flex gap-2">
              <button onClick={createThread} disabled={posting} className="btn-primary px-4 py-2 text-sm">
                {posting ? 'Posting...' : 'Post Thread'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Thread list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-16" />)}
        </div>
      ) : threads.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted mb-2">No threads yet.</p>
          <button onClick={() => setShowCreate(true)} className="text-accent-cyan text-sm hover:text-accent-cyan-glow transition-colors">
            Start the first discussion →
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {threads.map(thread => (
            <div key={thread.id} className="card flex items-center gap-4 hover:border-accent-cyan/20 transition-colors cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {thread.pinned && <Pin className="w-3 h-3 text-accent-cyan flex-shrink-0" />}
                  {thread.locked && <Lock className="w-3 h-3 text-muted flex-shrink-0" />}
                  <span className="font-semibold text-white text-sm truncate">{thread.title}</span>
                </div>
                <div className="text-xs text-muted">
                  <span className={CATEGORY_COLORS[thread.category] ?? 'text-muted'}>{thread.category}</span>
                  <span className="mx-1.5">·</span>
                  {thread.author?.username ?? 'Unknown'}
                  <span className="mx-1.5">·</span>
                  {new Date(thread.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-xs text-muted">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  {thread.replies?.[0]?.count ?? 0}
                </div>
                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
