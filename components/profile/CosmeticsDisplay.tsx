'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

interface EquippedCosmetic {
  id: string
  name: string
  category: string
  rarity: string
}

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-500 text-gray-400',
  uncommon: 'border-green-500 text-green-400',
  rare: 'border-blue-500 text-blue-400',
  epic: 'border-purple-500 text-purple-400',
  legendary: 'border-yellow-500 text-yellow-400',
}

const CATEGORY_LABELS: Record<string, string> = {
  border: 'Profile Border',
  badge: 'Badge',
  card_border: 'Card Border',
  avatar_effect: 'Avatar Effect',
}

interface Props {
  playerId: string
}

export function CosmeticsDisplay({ playerId }: Props) {
  const [cosmetics, setCosmetics] = useState<EquippedCosmetic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/player/equipped?playerId=${encodeURIComponent(playerId)}`)
        if (res.ok) {
          const data = await res.json()
          setCosmetics(data.equipped ?? [])
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [playerId])

  if (loading) return null
  if (cosmetics.length === 0) return null

  return (
    <div className="card mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-accent-purple" />
        <h2 className="font-orbitron font-bold text-white text-sm">Equipped Items</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cosmetics.map(item => {
          const rarity = item.rarity ?? 'common'
          const colors = RARITY_COLORS[rarity] ?? RARITY_COLORS.common
          return (
            <div
              key={item.id}
              className={`rounded bg-space-800 border ${colors.split(' ')[0]} p-3 text-center`}
            >
              <div className="font-orbitron text-[10px] uppercase tracking-widest text-muted mb-1">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </div>
              <div className="text-sm text-white font-semibold truncate mb-1">
                {item.name}
              </div>
              <div className={`text-[10px] uppercase font-bold ${colors.split(' ')[1]}`}>
                {rarity}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
