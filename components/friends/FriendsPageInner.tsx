'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, Check, X, MessageCircle, Search, Swords } from 'lucide-react'
import Link from 'next/link'

type Friend = {
  friendshipId: string
  id: string
  username: string
  avatar_url: string | null
  country: string | null
}

export function FriendsPageInner() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<Friend[]>([])
  const [outgoing, setOutgoing] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [tab, setTab] = useState<'friends' | 'requests' | 'find'>('friends')

  useEffect(() => {
    fetchFriends()
  }, [])

  async function fetchFriends() {
    try {
      const res = await fetch('/api/friends')
      if (!res.ok) return
      const data = await res.json()
      setFriends(data.friends ?? [])
      setIncoming(data.incoming ?? [])
      setOutgoing(data.outgoing ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=player`)
      const data = await res.json()
      setSearchResults(data.players ?? [])
    } finally {
      setSearching(false)
    }
  }

  async function sendRequest(targetId: string) {
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPlayerId: targetId }),
    })
    fetchFriends()
  }

  async function respond(friendshipId: string, action: 'accept' | 'reject') {
    await fetch('/api/friends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId, action }),
    })
    fetchFriends()
  }

  async function removeFriend(friendshipId: string) {
    await fetch('/api/friends', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId }),
    })
    fetchFriends()
  }

  if (loading) return <div className="card animate-pulse h-48" />

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-space-800 rounded p-1">
        {[
          { key: 'friends' as const, label: 'Friends', count: friends.length },
          { key: 'requests' as const, label: 'Requests', count: incoming.length },
          { key: 'find' as const, label: 'Find Players', count: 0 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-muted hover:text-white'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 bg-accent-cyan/20 text-accent-cyan text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Friends List */}
      {tab === 'friends' && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted mb-2">No friends yet.</p>
              <button onClick={() => setTab('find')} className="text-accent-cyan text-sm hover:text-accent-cyan-glow transition-colors">
                Find players to add →
              </button>
            </div>
          ) : friends.map(f => (
            <div key={f.friendshipId} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-space-700 border border-border overflow-hidden flex-shrink-0">
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-sm font-bold">
                    {f.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/player/${f.id}`} className="font-semibold text-white text-sm hover:text-accent-cyan transition-colors">
                  {f.username}
                </Link>
                {f.country && <span className="text-xs text-muted ml-2">{f.country}</span>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href={`/play?challenge=${f.id}`} className="p-2 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20 transition-colors" title="Challenge">
                  <Swords className="w-4 h-4" />
                </Link>
                <button onClick={() => removeFriend(f.friendshipId)} className="p-2 rounded bg-space-700 border border-border text-muted hover:text-red-400 transition-colors" title="Remove">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Incoming</h3>
              <div className="space-y-2">
                {incoming.map(f => (
                  <div key={f.friendshipId} className="card flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-space-700 border border-border overflow-hidden flex-shrink-0">
                      {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted text-sm font-bold">{f.username?.[0]?.toUpperCase()}</div>}
                    </div>
                    <span className="flex-1 font-semibold text-white text-sm">{f.username}</span>
                    <button onClick={() => respond(f.friendshipId, 'accept')} className="p-2 rounded bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => respond(f.friendshipId, 'reject')} className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Sent</h3>
              <div className="space-y-2">
                {outgoing.map(f => (
                  <div key={f.friendshipId} className="card flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-space-700 border border-border overflow-hidden flex-shrink-0">
                      {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted text-sm font-bold">{f.username?.[0]?.toUpperCase()}</div>}
                    </div>
                    <span className="flex-1 font-semibold text-white text-sm">{f.username}</span>
                    <span className="text-xs text-muted">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="card text-center py-12">
              <UserPlus className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted">No pending requests.</p>
            </div>
          )}
        </div>
      )}

      {/* Find Players */}
      {tab === 'find' && (
        <div>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-space-800 border border-border rounded pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
              />
            </div>
            <button type="submit" disabled={searching} className="btn-primary px-4 py-2.5 text-sm">
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
          <div className="space-y-2">
            {searchResults.map((p: any) => (
              <div key={p.id} className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-space-700 border border-border overflow-hidden flex-shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted text-sm font-bold">{p.username?.[0]?.toUpperCase()}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-white text-sm">{p.username}</span>
                  {p.country && <span className="text-xs text-muted ml-2">{p.country}</span>}
                </div>
                <button onClick={() => sendRequest(p.id)} className="btn-secondary px-3 py-1.5 text-xs">
                  <UserPlus className="w-3.5 h-3.5 mr-1 inline" />
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
