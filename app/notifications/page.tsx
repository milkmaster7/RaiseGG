import type { Metadata } from 'next'
import { NotificationsClient } from '@/components/notifications/NotificationsClient'

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'View all your notifications — match invites, friend requests, achievements, and more.',
  robots: { index: false, follow: false },
}

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-orbitron text-xl font-bold text-white mb-6">Notifications</h1>
      <NotificationsClient />
    </div>
  )
}
