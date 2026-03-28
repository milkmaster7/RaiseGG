'use client'

import Link from 'next/link'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="font-orbitron text-8xl font-black text-accent-cyan/30 mb-4">ERR</div>
      <h1 className="font-orbitron text-2xl font-bold text-white mb-4">Something went wrong</h1>
      <p className="text-muted mb-8 max-w-md">An unexpected error occurred. Try again or return home.</p>
      <div className="flex gap-4">
        <button onClick={reset} className="btn-primary px-8 py-3">Try Again</button>
        <Link href="/" className="btn-secondary px-8 py-3">Back to Home</Link>
      </div>
    </div>
  )
}
