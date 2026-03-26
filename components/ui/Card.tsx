import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  hover?: boolean
  className?: string
}

export function Card({ children, hover = false, className }: CardProps) {
  return (
    <div className={clsx(hover ? 'card-hover' : 'card', className)}>
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="card text-center">
      <div className={clsx('font-orbitron text-2xl font-bold mb-1', accent ? 'text-gradient' : 'text-white')}>
        {value}
      </div>
      <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  )
}
