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
  return (
    <span
      className={clsx('badge', className)}
      style={{ color: tier.color, background: tier.bg, border: `1px solid ${tier.color}40` }}
    >
      {tier.name}
    </span>
  )
}
