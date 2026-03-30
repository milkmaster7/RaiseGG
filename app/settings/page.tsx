import type { Metadata } from 'next'
import { SettingsClient } from '@/components/settings/SettingsClient'

export const metadata: Metadata = {
  title: 'Settings — Account Preferences',
  robots: { index: false, follow: false },
}

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Settings</h1>
      <p className="text-muted mb-8">Manage your account, notifications, and privacy preferences.</p>
      <SettingsClient />
    </div>
  )
}
