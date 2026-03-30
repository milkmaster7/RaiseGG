'use client'

import { NotificationBell } from '@/components/layout/NotificationBell'

export function TopBar() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-end px-4 py-2 bg-space-900/80 backdrop-blur-md border-b border-border/50 md:border-0 md:bg-transparent md:backdrop-blur-none">
      <NotificationBell />
    </div>
  )
}
