import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'cyan' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'btn-primary':   variant === 'primary',
          'btn-secondary': variant === 'secondary',
          'btn-cyan':      variant === 'cyan',
          'text-muted hover:text-white hover:bg-space-800 px-3': variant === 'ghost',
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-6 py-3 text-sm':   size === 'md',
          'px-8 py-4 text-base': size === 'lg',
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
