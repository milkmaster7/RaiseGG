import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '404 — Page Not Found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="font-orbitron text-8xl font-black text-gradient mb-4">404</div>
      <h1 className="font-orbitron text-2xl font-bold text-white mb-4">Page Not Found</h1>
      <p className="text-muted mb-8 max-w-md">This page doesn't exist or was removed.</p>
      <Link href="/" className="btn-primary px-8 py-3">Back to Home</Link>
    </div>
  )
}
