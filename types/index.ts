export type Game = 'cs2' | 'dota2' | 'deadlock'
export type MatchStatus = 'open' | 'locked' | 'live' | 'completed' | 'cancelled' | 'disputed'
export type MatchFormat = '1v1' | '5v5'
export type DisputeStatus = 'open' | 'resolved' | 'cancelled'

export interface Player {
  id: string
  steam_id: string
  username: string
  avatar_url: string | null
  country: string | null
  cs2_elo: number
  dota2_elo: number
  deadlock_elo: number
  cs2_wins: number
  cs2_losses: number
  dota2_wins: number
  dota2_losses: number
  deadlock_wins: number
  deadlock_losses: number
  usdc_balance: number
  wallet_address: string | null
  vac_banned: boolean
  eligible: boolean
  banned: boolean
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  game: Game
  format: MatchFormat
  player_a_id: string
  player_b_id: string | null
  stake_amount: number
  vault_pda: string | null
  status: MatchStatus
  winner_id: string | null
  match_id_external: string | null
  created_at: string
  resolved_at: string | null
  player_a?: Player
  player_b?: Player
  winner?: Player
}

export interface EloTier {
  name: string
  min: number
  max: number
  color: string
}

export const ELO_TIERS: EloTier[] = [
  { name: 'Bronze',   min: 0,    max: 899,  color: '#cd7f32' },
  { name: 'Silver',   min: 900,  max: 1099, color: '#c0c0c0' },
  { name: 'Gold',     min: 1100, max: 1299, color: '#ffd700' },
  { name: 'Platinum', min: 1300, max: 1499, color: '#00d4ff' },
  { name: 'Diamond',  min: 1500, max: 1699, color: '#7b61ff' },
  { name: 'Apex',     min: 1700, max: 9999, color: '#ff4444' },
]

export function getTier(elo: number): EloTier {
  return ELO_TIERS.find((t) => elo >= t.min && elo <= t.max) ?? ELO_TIERS[0]
}

export interface Tournament {
  id: string
  name: string
  game: Game
  format: MatchFormat
  prize_pool: number
  entry_fee: number
  max_players: number
  registered_players: number
  status: 'upcoming' | 'live' | 'completed'
  starts_at: string
}

export interface Transaction {
  id: string
  player_id: string
  type: 'deposit' | 'withdraw' | 'win' | 'loss' | 'rake' | 'refund'
  amount: number
  tx_signature: string | null
  created_at: string
}
