'use client'

type ArrowDirection = 'top' | 'bottom' | 'left' | 'right'

interface GuideTooltipProps {
  title: string
  description: string
  actionLabel?: string
  onAction: () => void
  onSkip: () => void
  currentStep: number
  totalSteps: number
  arrow?: ArrowDirection
  className?: string
}

export function GuideTooltip({
  title,
  description,
  actionLabel = 'Got it',
  onAction,
  onSkip,
  currentStep,
  totalSteps,
  arrow = 'top',
  className = '',
}: GuideTooltipProps) {
  const arrowClasses: Record<ArrowDirection, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  }

  const arrowSvg: Record<ArrowDirection, React.ReactNode> = {
    top: (
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
        <div className="w-3 h-3 bg-space-800 border-b border-r border-accent-cyan/30 rotate-45 -translate-y-1.5" />
      </div>
    ),
    bottom: (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px">
        <div className="w-3 h-3 bg-space-800 border-t border-l border-accent-cyan/30 rotate-45 translate-y-1.5" />
      </div>
    ),
    left: (
      <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-px">
        <div className="w-3 h-3 bg-space-800 border-t border-r border-accent-cyan/30 rotate-45 -translate-x-1.5" />
      </div>
    ),
    right: (
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-px">
        <div className="w-3 h-3 bg-space-800 border-b border-l border-accent-cyan/30 rotate-45 translate-x-1.5" />
      </div>
    ),
  }

  return (
    <div className={`relative ${className}`}>
      <div className="bg-space-800 border border-accent-cyan/30 rounded-lg p-4 shadow-lg shadow-accent-cyan/5 max-w-sm w-full">
        {/* Arrow */}
        {arrowSvg[arrow]}

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-accent-cyan text-[10px] font-bold uppercase tracking-wider">
            Step {currentStep} of {totalSteps}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i + 1 === currentStep
                    ? 'bg-accent-cyan shadow-glow-sm scale-125'
                    : i + 1 < currentStep
                    ? 'bg-accent-cyan/50'
                    : 'bg-space-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <h4 className="font-orbitron text-sm font-bold text-white mb-1.5">{title}</h4>
        <p className="text-gray-400 text-xs leading-relaxed mb-4">{description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onSkip}
            className="text-muted hover:text-white text-xs font-medium transition-colors"
          >
            Skip Tutorial
          </button>
          <button
            onClick={onAction}
            className="bg-accent-cyan text-space-900 text-xs font-bold px-4 py-1.5 rounded hover:bg-accent-cyan-glow transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
