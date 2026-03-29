'use client'

import { useState } from 'react'
import { Ban, Check, Map } from 'lucide-react'

const CS2_MAPS = [
  { id: 'mirage',   name: 'Mirage' },
  { id: 'dust2',    name: 'Dust II' },
  { id: 'inferno',  name: 'Inferno' },
  { id: 'nuke',     name: 'Nuke' },
  { id: 'anubis',   name: 'Anubis' },
  { id: 'vertigo',  name: 'Vertigo' },
  { id: 'ancient',  name: 'Ancient' },
]

type VetoState = Record<string, 'available' | 'banned' | 'picked'>

interface MapVetoProps {
  matchId: string
  isPlayerA: boolean
  onComplete?: (selectedMap: string) => void
}

export function MapVeto({ matchId, isPlayerA, onComplete }: MapVetoProps) {
  const [maps, setMaps] = useState<VetoState>(() =>
    Object.fromEntries(CS2_MAPS.map(m => [m.id, 'available']))
  )
  const [turn, setTurn] = useState<'a' | 'b'>('a')
  const [phase, setPhase] = useState<'banning' | 'done'>('banning')

  const isMyTurn = (isPlayerA && turn === 'a') || (!isPlayerA && turn === 'b')
  const available = CS2_MAPS.filter(m => maps[m.id] === 'available')

  function banMap(mapId: string) {
    if (!isMyTurn || phase === 'done') return

    const newMaps = { ...maps, [mapId]: 'banned' as const }
    setMaps(newMaps)

    const remaining = CS2_MAPS.filter(m => newMaps[m.id] === 'available')
    if (remaining.length === 1) {
      // Last map is the pick
      newMaps[remaining[0].id] = 'picked'
      setMaps({ ...newMaps })
      setPhase('done')
      onComplete?.(remaining[0].id)
      return
    }

    setTurn(turn === 'a' ? 'b' : 'a')
  }

  const pickedMap = CS2_MAPS.find(m => maps[m.id] === 'picked')

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Map className="w-5 h-5 text-accent-cyan" />
        <h3 className="font-orbitron text-sm font-bold text-white">Map Veto</h3>
        {phase === 'banning' && (
          <span className={`ml-auto text-xs font-semibold ${isMyTurn ? 'text-accent-cyan' : 'text-muted'}`}>
            {isMyTurn ? 'Your turn to ban' : 'Opponent banning...'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {CS2_MAPS.map(map => {
          const state = maps[map.id]
          return (
            <button
              key={map.id}
              disabled={state !== 'available' || !isMyTurn || phase === 'done'}
              onClick={() => banMap(map.id)}
              className={`
                relative rounded p-3 text-center transition-all
                ${state === 'available' && isMyTurn ? 'bg-space-800 border border-border hover:border-red-500/50 hover:bg-red-500/5 cursor-pointer' : ''}
                ${state === 'available' && !isMyTurn ? 'bg-space-800 border border-border opacity-60' : ''}
                ${state === 'banned' ? 'bg-red-500/10 border border-red-500/30 opacity-40' : ''}
                ${state === 'picked' ? 'bg-green-500/10 border-2 border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.2)]' : ''}
              `}
            >
              <div className={`text-xs font-semibold ${state === 'picked' ? 'text-green-400' : state === 'banned' ? 'text-red-400 line-through' : 'text-white'}`}>
                {map.name}
              </div>
              {state === 'banned' && <Ban className="w-4 h-4 text-red-400 mx-auto mt-1" />}
              {state === 'picked' && <Check className="w-4 h-4 text-green-400 mx-auto mt-1" />}
            </button>
          )
        })}
      </div>

      {pickedMap && (
        <div className="mt-4 text-center">
          <span className="text-xs text-muted">Playing on: </span>
          <span className="font-orbitron text-sm font-bold text-green-400">{pickedMap.name}</span>
        </div>
      )}
    </div>
  )
}
