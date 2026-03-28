'use client'

import { useState, useEffect } from 'react'
import { Sword } from 'lucide-react'
import { CreateMatchModal } from './CreateMatchModal'

interface Props {
  profileUsername: string
  profilePlayerId: string
}

export function ChallengeButton({ profileUsername, profilePlayerId }: Props) {
  const [playerId, setPlayerId]     = useState<string | null>(null)
  const [myUsername, setMyUsername] = useState<string | null>(null)
  const [showModal, setShowModal]   = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.player?.id) {
          setPlayerId(d.player.id)
          setMyUsername(d.player.username)
        }
      })
  }, [])

  if (!playerId || myUsername === profileUsername) return null

  return (
    <>
      {showModal && (
        <CreateMatchModal
          playerId={playerId}
          onClose={() => setShowModal(false)}
          challengedPlayerId={profilePlayerId}
          challengedUsername={profileUsername}
        />
      )}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 btn-primary text-sm px-4 py-2"
      >
        <Sword className="w-4 h-4" />
        Challenge
      </button>
    </>
  )
}
