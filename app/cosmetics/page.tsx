'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Cosmetic {
  id: string
  category: string
  name: string
  price: number
  preview_css: string
  owned: boolean
  equipped: boolean
  seasonal: boolean
  expires_at: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  border: 'Profile Borders',
  badge: 'Badges',
  card_border: 'PnL Card Borders',
  avatar_effect: 'Animated Avatars',
}

const CATEGORY_ORDER = ['border', 'badge', 'card_border', 'avatar_effect']

export default function CosmeticsPage() {
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'shop' | 'seasonal' | 'collection'>('shop')
  const [buying, setBuying] = useState<string | null>(null)
  const [equipping, setEquipping] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCosmetics = useCallback(async () => {
    try {
      const res = await fetch('/api/cosmetics')
      if (res.ok) {
        const data = await res.json()
        setCosmetics(data.cosmetics ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCosmetics()
  }, [fetchCosmetics])

  const buyCosmetic = async (cosmeticId: string) => {
    setBuying(cosmeticId)
    setError(null)
    try {
      const res = await fetch('/api/cosmetics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', cosmeticId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Purchase failed')
        return
      }
      // Mark as owned
      setCosmetics(prev => prev.map(c => c.id === cosmeticId ? { ...c, owned: true } : c))
    } finally {
      setBuying(null)
    }
  }

  const equipCosmetic = async (cosmeticId: string) => {
    setEquipping(cosmeticId)
    setError(null)
    try {
      const res = await fetch('/api/cosmetics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'equip', cosmeticId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Equip failed')
        return
      }
      // Update equipped state
      const item = cosmetics.find(c => c.id === cosmeticId)
      if (item) {
        setCosmetics(prev => prev.map(c => {
          if (c.category === item.category) {
            return { ...c, equipped: c.id === cosmeticId }
          }
          return c
        }))
      }
    } finally {
      setEquipping(null)
    }
  }

  const nonSeasonalCosmetics = cosmetics.filter(c => !c.seasonal)
  const seasonalCosmetics = cosmetics.filter(c => c.seasonal)

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: nonSeasonalCosmetics.filter(c => c.category === cat),
  }))

  const ownedItems = cosmetics.filter(c => c.owned)

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-gray-800 rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Cosmetics Shop</h1>
      <p className="text-muted mb-6">Customize your profile with borders, badges, and effects.</p>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          className={`px-4 py-2 rounded text-sm font-semibold transition ${
            tab === 'shop'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-gray-800 text-muted border border-gray-700 hover:text-white'
          }`}
          onClick={() => setTab('shop')}
        >
          Shop
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-semibold transition ${
            tab === 'seasonal'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
              : 'bg-gray-800 text-muted border border-gray-700 hover:text-white'
          }`}
          onClick={() => setTab('seasonal')}
        >
          Seasonal ({seasonalCosmetics.length})
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-semibold transition ${
            tab === 'collection'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-gray-800 text-muted border border-gray-700 hover:text-white'
          }`}
          onClick={() => setTab('collection')}
        >
          My Collection ({ownedItems.length})
        </button>
      </div>

      {tab === 'seasonal' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-yellow-400 text-lg">&#9733;</span>
            <h2 className="font-orbitron text-lg font-bold text-yellow-400">Season 1 — Limited Time</h2>
          </div>
          {seasonalCosmetics.length === 0 ? (
            <p className="text-muted">No seasonal items available right now.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {seasonalCosmetics.map(item => (
                <SeasonalCosmeticCard
                  key={item.id}
                  item={item}
                  onBuy={() => buyCosmetic(item.id)}
                  onEquip={() => equipCosmetic(item.id)}
                  buying={buying === item.id}
                  equipping={equipping === item.id}
                />
              ))}
            </div>
          )}
        </div>
      ) : tab === 'shop' ? (
        <div className="space-y-10">
          {grouped.map(group => (
            <div key={group.category}>
              <h2 className="font-orbitron text-lg font-bold text-white mb-4">{group.label}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {group.items.map(item => (
                  <CosmeticCard
                    key={item.id}
                    item={item}
                    onBuy={() => buyCosmetic(item.id)}
                    onEquip={() => equipCosmetic(item.id)}
                    buying={buying === item.id}
                    equipping={equipping === item.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {ownedItems.length === 0 ? (
            <p className="text-muted">You don't own any cosmetics yet. Visit the shop to get started!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {ownedItems.map(item => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  onBuy={() => {}}
                  onEquip={() => equipCosmetic(item.id)}
                  buying={false}
                  equipping={equipping === item.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CosmeticCard({
  item,
  onBuy,
  onEquip,
  buying,
  equipping,
}: {
  item: Cosmetic
  onBuy: () => void
  onEquip: () => void
  buying: boolean
  equipping: boolean
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 flex flex-col items-center text-center">
      {/* Preview */}
      <div className={`w-16 h-16 rounded-full bg-gray-700 mb-3 ${item.preview_css}`} />
      <h3 className="text-sm font-semibold text-white mb-1">{item.name}</h3>
      <p className="text-xs text-muted mb-1 capitalize">{item.category.replace('_', ' ')}</p>

      {item.equipped ? (
        <span className="text-xs text-cyan-400 font-semibold border border-cyan-500/50 rounded px-2 py-1 mt-auto">
          Equipped
        </span>
      ) : item.owned ? (
        <Button variant="secondary" size="sm" onClick={onEquip} loading={equipping} className="mt-auto">
          Equip
        </Button>
      ) : (
        <Button variant="cyan" size="sm" onClick={onBuy} loading={buying} className="mt-auto">
          {item.price === 0 ? 'Claim Free' : `$${item.price.toFixed(2)}`}
        </Button>
      )}
    </div>
  )
}

function SeasonalCosmeticCard({
  item,
  onBuy,
  onEquip,
  buying,
  equipping,
}: {
  item: Cosmetic
  onBuy: () => void
  onEquip: () => void
  buying: boolean
  equipping: boolean
}) {
  const expired = item.expires_at ? new Date(item.expires_at) < new Date() : false
  const countdown = useMemo(() => {
    if (!item.expires_at) return null
    const diff = new Date(item.expires_at).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h left`
    return `${hours}h left`
  }, [item.expires_at])

  return (
    <div className={`rounded-lg border p-4 flex flex-col items-center text-center ${
      expired
        ? 'border-gray-700 bg-gray-800/30 opacity-60'
        : 'border-yellow-500/40 bg-yellow-500/5'
    }`}>
      {/* Season badge */}
      <span className="text-[10px] uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-1.5 py-0.5 mb-2 font-semibold">
        Season 1
      </span>
      {/* Preview */}
      <div className={`w-16 h-16 rounded-full bg-gray-700 mb-3 ${item.preview_css}`} />
      <h3 className="text-sm font-semibold text-white mb-1">{item.name}</h3>
      <p className="text-xs text-muted mb-1 capitalize">{item.category.replace('_', ' ')}</p>

      {/* Countdown */}
      {countdown && (
        <p className={`text-[10px] mb-2 font-semibold ${expired ? 'text-red-400' : 'text-yellow-400'}`}>
          {countdown}
        </p>
      )}

      {item.equipped ? (
        <span className="text-xs text-cyan-400 font-semibold border border-cyan-500/50 rounded px-2 py-1 mt-auto">
          Equipped
        </span>
      ) : item.owned ? (
        <Button variant="secondary" size="sm" onClick={onEquip} loading={equipping} className="mt-auto">
          Equip
        </Button>
      ) : expired ? (
        <span className="text-xs text-gray-500 mt-auto">No longer available</span>
      ) : (
        <Button variant="cyan" size="sm" onClick={onBuy} loading={buying} className="mt-auto">
          {item.price === 0 ? 'Claim Free' : `$${item.price.toFixed(2)}`}
        </Button>
      )}
    </div>
  )
}
