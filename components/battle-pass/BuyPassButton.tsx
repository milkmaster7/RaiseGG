'use client'
import { useState } from 'react'

interface BuyPassButtonProps {
  isPremium: boolean
  onPurchased: () => void
}

export function BuyPassButton({ isPremium, onPurchased }: BuyPassButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (isPremium || success) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-yellow-500/10 border border-yellow-500/30">
        <span className="text-yellow-400 text-sm font-semibold">Premium Pass Active</span>
        <span className="text-yellow-400">✓</span>
      </div>
    )
  }

  async function handlePurchase() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/battle-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Purchase failed')
        return
      }
      setSuccess(true)
      onPurchased()
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="px-6 py-3 rounded font-semibold text-sm bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-400 hover:to-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : 'Buy Premium Pass — $5 USDC'}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
