import Link from 'next/link'
import Image from 'next/image'
import { TierBadge } from './Badge'
import type { Player, Game } from '@/types'

interface LeaderboardTableProps {
  players: Player[]
  game: Game
  limit?: number
}

export function LeaderboardTable({ players, game, limit }: LeaderboardTableProps) {
  const eloKey = `${game}_elo` as keyof Player
  const winsKey = `${game}_wins` as keyof Player
  const lossesKey = `${game}_losses` as keyof Player

  const sorted = [...players]
    .sort((a, b) => (b[eloKey] as number) - (a[eloKey] as number))
    .slice(0, limit)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted font-medium text-xs uppercase tracking-wider w-12">#</th>
            <th className="text-left py-3 px-4 text-muted font-medium text-xs uppercase tracking-wider">Player</th>
            <th className="text-left py-3 px-4 text-muted font-medium text-xs uppercase tracking-wider">Rank</th>
            <th className="text-right py-3 px-4 text-muted font-medium text-xs uppercase tracking-wider">ELO</th>
            <th className="text-right py-3 px-4 text-muted font-medium text-xs uppercase tracking-wider">W/L</th>
            <th className="text-right py-3 px-4 text-muted font-medium text-xs uppercase tracking-wider">Win %</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((player, i) => {
            const elo = player[eloKey] as number
            const wins = player[winsKey] as number
            const losses = player[lossesKey] as number
            const total = wins + losses
            const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

            return (
              <tr key={player.id} className="border-b border-border/50 hover:bg-space-800 transition-colors">
                <td className="py-3 px-4">
                  <span className={`font-orbitron font-bold ${i < 3 ? 'text-gradient' : 'text-muted'}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Link href={`/profile/${player.username}`} className="flex items-center gap-3 hover:text-accent-purple transition-colors">
                    {player.avatar_url && (
                      <Image src={player.avatar_url} alt={player.username} width={28} height={28} className="rounded-full" />
                    )}
                    <span className="font-medium text-white">{player.username}</span>
                    {player.country && <span className="text-muted text-xs">{player.country}</span>}
                  </Link>
                </td>
                <td className="py-3 px-4"><TierBadge elo={elo} /></td>
                <td className="py-3 px-4 text-right font-orbitron font-bold text-accent-purple">{elo}</td>
                <td className="py-3 px-4 text-right text-muted">{wins}/{losses}</td>
                <td className="py-3 px-4 text-right">
                  <span className={winRate >= 50 ? 'text-green-400' : 'text-red-400'}>{winRate}%</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
