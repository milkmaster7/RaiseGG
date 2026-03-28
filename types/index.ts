export type Game = 'cs2' | 'dota2' | 'deadlock'
export type MatchStatus = 'open' | 'locked' | 'live' | 'completed' | 'cancelled' | 'disputed'
export type MatchFormat = '1v1' | '5v5'
export type DisputeStatus = 'open' | 'resolved' | 'cancelled'
export type StakeCurrency = 'usdc' | 'usdt'

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
  usdt_balance: number
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
  currency: StakeCurrency
  vault_pda: string | null
  status: MatchStatus
  winner_id: string | null
  match_id_external: string | null
  server_ip:    string | null
  server_port:  number | null
  connect_token: string | null
  region: string | null
  has_password: boolean | null
  challenged_player_id: string | null
  created_at: string
  resolved_at: string | null
  player_a?: Player
  player_b?: Player
  winner?: Player
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
