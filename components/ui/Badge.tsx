import { clsx } from 'clsx'
import { getTier } from '@/lib/elo'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'purple' | 'cyan' | 'green' | 'red' | 'gray'
  className?: string
}

export function Badge({ children, variant = 'purple', className }: BadgeProps) {
  return (
    <span className={clsx('badge', {
      'badge-purple': variant === 'purple',
      'badge-cyan':   variant === 'cyan',
      'badge-green':  variant === 'green',
      'badge-red':    variant === 'red',
      'bg-space-600 text-muted border border-border': variant === 'gray',
    }, className)}>
      {children}
    </span>
  )
}

interface TierBadgeProps {
  elo: number
  className?: string
}

export function TierBadge({ elo, className }: TierBadgeProps) {
  const tier = getTier(elo)
  const isApex = tier.name === 'Apex'
  return (
    <span
      className={clsx('badge', isApex && 'font-black', className)}
      style={{
        color: isApex ? '#fbbf24' : tier.color,
        background: isApex
          ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(255,255,255,0.1))'
          : tier.bg,
        border: `1px solid ${tier.color}40`,
        textShadow: isApex ? '0 0 8px rgba(251,191,36,0.6)' : undefined,
      }}
    >
      {tier.name}
    </span>
  )
}
