'use client'

export default function PlayError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="card border border-red-400/30 bg-red-400/5">
        <h2 className="font-orbitron text-lg font-bold text-red-400 mb-2">Play page error</h2>
        <pre className="text-xs text-red-300 bg-black/30 rounded p-3 overflow-auto mb-4 whitespace-pre-wrap">
          {error?.message ?? 'Unknown error'}
          {'\n'}
          {error?.stack ?? ''}
        </pre>
        <button onClick={reset} className="btn-primary text-sm px-4 py-2">Try Again</button>
      </div>
    </div>
  )
}
