import type { Metadata } from 'next'
import ReviewDashboard from '@/components/reviews/ReviewDashboard'

export const metadata: Metadata = {
  title: 'Match Reviews',
  description: 'Read honest player reviews of CS2, Dota 2, and Deadlock stake matches on RaiseGG. See ratings, feedback, and community opinions.',
  robots: { index: false, follow: false },
}

export default function ReviewsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-orbitron text-2xl font-bold text-white mb-6">Match Reviews</h1>
      <ReviewDashboard />
    </main>
  )
}
