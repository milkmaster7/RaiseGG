'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import LinkedAccounts from '@/components/profile/LinkedAccounts'

interface LinkedData {
  faceit_username: string | null
  faceit_level: number | null
  faceit_elo: number | null
  leetify_url: string | null
  leetify_rating: number | null
}

export default function LinkedAccountsPage() {
  const [data, setData] = useState<LinkedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [faceitInput, setFaceitInput] = useState('')
  const [leetifyInput, setLeetifyInput] = useState('')
  const [linking, setLinking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchLinked = async () => {
    try {
      const res = await fetch('/api/linked-accounts')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLinked() }, [])

  const linkAccount = async (action: string, payload: Record<string, string>) => {
    setLinking(action)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/linked-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to link account')
        return
      }
      setSuccess(action === 'unlink_faceit' || action === 'unlink_leetify' ? 'Account unlinked' : 'Account linked successfully')
      setFaceitInput('')
      setLeetifyInput('')
      await fetchLinked()
    } finally {
      setLinking(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-64" />
          <div className="h-32 bg-gray-800 rounded" />
          <div className="h-32 bg-gray-800 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Linked Accounts</h1>
      <p className="text-muted mb-8">Connect your external gaming profiles for verification and stats.</p>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded border border-green-500/50 bg-green-500/10 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Current linked status */}
      {data && (data.faceit_username || data.leetify_url) && (
        <div className="mb-8">
          <LinkedAccounts
            faceitUsername={data.faceit_username}
            faceitLevel={data.faceit_level}
            faceitElo={data.faceit_elo}
            leetifyUrl={data.leetify_url}
            leetifyRating={data.leetify_rating}
          />
        </div>
      )}

      <div className="space-y-6">
        {/* FACEIT */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold text-sm">
              FI
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">FACEIT</h2>
              <p className="text-xs text-muted">Link your FACEIT account to display level and ELO</p>
            </div>
            {data?.faceit_username && (
              <span className="ml-auto flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded px-2 py-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>

          {data?.faceit_username ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Linked as <span className="text-white font-semibold">{data.faceit_username}</span>
                {data.faceit_level && (
                  <span className="ml-2 text-orange-400">Level {data.faceit_level}</span>
                )}
                {data.faceit_elo && (
                  <span className="ml-2 text-gray-400">({data.faceit_elo} ELO)</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => linkAccount('unlink_faceit', {})}
                loading={linking === 'unlink_faceit'}
              >
                Unlink
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={faceitInput}
                onChange={e => setFaceitInput(e.target.value)}
                placeholder="Enter FACEIT username"
                className="flex-1 px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <Button
                variant="cyan"
                size="sm"
                onClick={() => linkAccount('link_faceit', { username: faceitInput })}
                loading={linking === 'link_faceit'}
                disabled={!faceitInput.trim()}
              >
                Link FACEIT
              </Button>
            </div>
          )}
        </div>

        {/* Leetify */}
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-sm">
              LF
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Leetify</h2>
              <p className="text-xs text-muted">Link your Leetify profile for CS2 performance stats</p>
            </div>
            {data?.leetify_url && (
              <span className="ml-auto flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded px-2 py-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Linked
              </span>
            )}
          </div>

          {data?.leetify_url ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Linked: <a href={data.leetify_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                  {data.leetify_url.replace('https://leetify.com/', '')}
                </a>
                {data.leetify_rating && (
                  <span className="ml-2 text-gray-400">(Rating: {data.leetify_rating})</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => linkAccount('unlink_leetify', {})}
                loading={linking === 'unlink_leetify'}
              >
                Unlink
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={leetifyInput}
                onChange={e => setLeetifyInput(e.target.value)}
                placeholder="https://leetify.com/app/profile/..."
                className="flex-1 px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <Button
                variant="cyan"
                size="sm"
                onClick={() => linkAccount('link_leetify', { url: leetifyInput })}
                loading={linking === 'link_leetify'}
                disabled={!leetifyInput.trim()}
              >
                Link Leetify
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
