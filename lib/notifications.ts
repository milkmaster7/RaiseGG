// ─── Browser Push Notification Helpers ──────────────────────────────────────

/** Check if browser supports the Notification API */
export function supportsNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Check if permission is already granted */
export function notificationsGranted(): boolean {
  return supportsNotifications() && Notification.permission === 'granted'
}

/** Request notification permission from the user */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications()) return 'denied'
  return Notification.requestPermission()
}

/** Send a browser notification (only if permission granted) */
export function sendBrowserNotification(
  title: string,
  body: string,
  icon?: string,
  url?: string
) {
  if (!notificationsGranted()) return

  const notification = new Notification(title, {
    body,
    icon: icon ?? '/favicon.svg',
  })

  if (url) {
    notification.onclick = () => {
      window.focus()
      window.location.href = url
    }
  }
}
