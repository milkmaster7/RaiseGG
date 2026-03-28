// CS2 skin rarity tiers based on stake amount
export type RarityTier = 'consumer' | 'industrial' | 'milspec' | 'restricted' | 'classified' | 'covert' | 'contraband'

export function getStakeRarity(stakeUsd: number): RarityTier {
  if (stakeUsd < 5)   return 'consumer'     // grey
  if (stakeUsd < 10)  return 'industrial'   // light blue
  if (stakeUsd < 25)  return 'milspec'      // blue
  if (stakeUsd < 50)  return 'restricted'   // purple
  if (stakeUsd < 100) return 'classified'   // pink/magenta
  if (stakeUsd < 250) return 'covert'       // red
  return 'contraband'                        // gold
}

export const RARITY_STYLES: Record<RarityTier, { border: string; glow: string; label: string; color: string }> = {
  consumer:    { border: 'border-gray-500',     glow: 'shadow-gray-500/20',    label: 'Consumer',    color: '#b0b0b0' },
  industrial:  { border: 'border-sky-400',      glow: 'shadow-sky-400/20',     label: 'Industrial',  color: '#5e98d9' },
  milspec:     { border: 'border-blue-500',     glow: 'shadow-blue-500/30',    label: 'Mil-Spec',    color: '#4b69ff' },
  restricted:  { border: 'border-purple-500',   glow: 'shadow-purple-500/30',  label: 'Restricted',  color: '#8847ff' },
  classified:  { border: 'border-pink-500',     glow: 'shadow-pink-500/40',    label: 'Classified',  color: '#d32ce6' },
  covert:      { border: 'border-red-500',      glow: 'shadow-red-500/40',     label: 'Covert',      color: '#eb4b4b' },
  contraband:  { border: 'border-yellow-400',   glow: 'shadow-yellow-400/50',  label: 'Contraband',  color: '#e4ae39' },
}
