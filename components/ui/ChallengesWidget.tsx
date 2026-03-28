'use client'
import { useState, useEffect } from 'react'

type Challenge = {
  id: string
  title: string
  description: string
  xp_reward: string
  target: number
  progress: number
  completed: boolean
}

export function ChallengesWidget() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/challenges')
      .then(r => r.json())
      .then(d => { setChallenges(d.challenges ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="card animate-pulse h-32" />

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-orbitron font-bold text-white text-sm">Daily Challenges</h2>
        <span className="text-xs text-muted">Resets midnight UTC</span>
      </div>
      <div className="space-y-3">
        {challenges.length === 0 ? (
          <p className="text-muted text-sm">Log in to see today&apos;s challenges.</p>
        ) : challenges.map(c => (
          <div key={c.id} className={`flex items-center gap-4 p-3 rounded border ${c.completed ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-space-800'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-sm font-semibold ${c.completed ? 'text-green-400' : 'text-white'}`}>{c.title}</span>
                {c.completed && <span className="text-green-400 text-xs">&#10003; Done</span>}
              </div>
              <p className="text-xs text-muted">{c.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-accent-purple font-semibold">{c.xp_reward}</div>
              <div className="text-xs text-muted mt-0.5">{c.progress}/{c.target}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
