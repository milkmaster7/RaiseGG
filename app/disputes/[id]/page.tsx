import type { Metadata } from 'next'
import { DisputeDetailClient } from '@/components/disputes/DisputeDetailClient'

export const metadata: Metadata = {
  title: 'Dispute Details — Match Resolution',
  robots: { index: false, follow: false },
}

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <DisputeDetailClient disputeId={id} />
    </div>
  )
}
