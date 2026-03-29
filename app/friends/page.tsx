import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/schemas'
import { FriendsPageInner } from '@/components/friends/FriendsPageInner'

export const metadata: Metadata = {
  title: 'Friends — Your Squad',
  description: 'Manage your friends list, send invites, and chat with other RaiseGG players.',
  alternates: { canonical: 'https://raisegg.com/friends' },
}

export default function FriendsPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://raisegg.com' },
    { name: 'Friends', url: 'https://raisegg.com/friends' },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-orbitron text-3xl font-black mb-2 text-gradient">Friends</h1>
        <p className="text-muted mb-8">Add friends, chat, and invite them to matches.</p>
        <FriendsPageInner />
      </div>
    </>
  )
}
