'use client'

interface Props {
  faceitUsername: string | null
  faceitLevel: number | null
  faceitElo: number | null
  leetifyUrl: string | null
  leetifyRating: number | null
}

const FACEIT_LEVEL_COLORS: Record<number, string> = {
  1: 'bg-gray-500',
  2: 'bg-gray-500',
  3: 'bg-green-600',
  4: 'bg-green-600',
  5: 'bg-green-500',
  6: 'bg-yellow-500',
  7: 'bg-yellow-500',
  8: 'bg-orange-500',
  9: 'bg-orange-500',
  10: 'bg-red-500',
}

export default function LinkedAccounts({
  faceitUsername,
  faceitLevel,
  faceitElo,
  leetifyUrl,
  leetifyRating,
}: Props) {
  if (!faceitUsername && !leetifyUrl) return null

  return (
    <div className="flex flex-wrap gap-3">
      {/* FACEIT badge */}
      {faceitUsername && (
        <a
          href={`https://www.faceit.com/en/players/${faceitUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition"
        >
          <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${FACEIT_LEVEL_COLORS[faceitLevel ?? 1] ?? 'bg-gray-500'}`}>
            {faceitLevel ?? '?'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-orange-400">FACEIT</span>
            <span className="text-xs text-gray-400">{faceitUsername}</span>
            {faceitElo && (
              <span className="text-xs text-gray-500">({faceitElo} ELO)</span>
            )}
            <svg className="w-3 h-3 text-green-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </a>
      )}

      {/* Leetify badge */}
      {leetifyUrl && (
        <a
          href={leetifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition"
        >
          <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-cyan-400 bg-cyan-500/20">
            LF
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-cyan-400">Leetify</span>
            {leetifyRating && (
              <span className="text-xs text-gray-400">Rating: {leetifyRating}</span>
            )}
            <svg className="w-3 h-3 text-green-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </a>
      )}
    </div>
  )
}
