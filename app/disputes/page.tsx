import type { Metadata } from 'next'
import { DisputesClient } from '@/components/disputes/DisputesClient'

export const metadata: Metadata = {
  title: 'My Disputes — Match Resolution',
  robots: { index: false, follow: false },
}

export default function DisputesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">My Disputes</h1>
      <p className="text-muted mb-8">
        Track the status of your match disputes. Our team reviews every case within 24 hours.
      </p>
      <DisputesClient />
    </div>
  )
}
