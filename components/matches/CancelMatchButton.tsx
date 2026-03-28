'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Props {
  matchId: string
}

export function CancelMatchButton({ matchId }: Props) {
  const router = useRouter()
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function handleCancel() {
    if (!confirmed) { setConfirmed(true); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/matches/${matchId}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Cancel failed')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
      setConfirmed(false)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <span className="text-xs text-red-400">{error}</span>
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className={`text-xs font-semibold transition-colors disabled:opacity-50 ${
        confirmed ? 'text-red-400 hover:text-red-300' : 'text-muted hover:text-red-400'
      }`}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin inline" />
      ) : confirmed ? (
        'Confirm cancel'
      ) : (
        'Cancel'
      )}
    </button>
  )
}
