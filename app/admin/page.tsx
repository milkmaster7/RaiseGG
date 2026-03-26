import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-orbitron text-4xl font-black mb-8 text-gradient">Admin</h1>
      {/* Revenue dashboard, match management, player management, disputes — built in Week 4 */}
      <div className="grid md:grid-cols-4 gap-4">
        {['Revenue', 'Active Matches', 'Players', 'Disputes'].map((section) => (
          <div key={section} className="card text-center">
            <div className="font-orbitron text-3xl font-bold text-gradient mb-2">—</div>
            <div className="text-xs text-muted uppercase tracking-wider">{section}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
